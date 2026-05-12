import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { processImageOCR } from '../../services/ocrService';
import { Loader2, ArrowRight, Camera, FileUp } from 'lucide-react';
import { convertPdfToImages } from '../../utils/pdfRenderer';

export const UploadView: React.FC = () => {
  const { session, updateImage, addItems } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Bezpečnostní limity pro plátno (Canvas) na mobilních zařízeních (iOS má limit kolem 4096px).
          // Příliš vysoké obrázky z aplikací (Lidl) musíme zmenšit na max výšku, jinak spadnou.
          // Běžné fotky musíme omezit i plošně, aby base64 nezahlstil localStorage.
          const MAX_HEIGHT = 4000;
          const MAX_WIDTH = 2000;

          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
          
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      let base64Url: string;
      
      if (file.type === 'application/pdf') {
        const objectUrl = URL.createObjectURL(file);
        try {
          const pdfImages = await convertPdfToImages(objectUrl);
          if (pdfImages.length === 0) {
            throw new Error("PDF contained no renderable pages.");
          }
          // Use the first page for OCR mapping
          base64Url = pdfImages[0];
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } else {
        // Běžná fotka z foťáku mobilu má 5-10 MB, což by shodilo localStorage (limit 5MB) a zaseklo OCR.
        // Digitální účtenky (Lidl) mají často kolem 1MB, jsou extrémně vysoké a nepotřebují (ani nesmí)
        // jít přes zmenšování (Canvas), jinak na starších mobilech narazí na limity výšky plátna.
        if (file.size > 3 * 1024 * 1024) { // Nad 3 MB zmenšíme
          base64Url = await compressImage(file);
        } else { // Pod 3 MB rovnou načteme původní (to je to, co fungovalo v původní verzi!)
          base64Url = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        }
      }
      
      try {
        await updateImage(base64Url);
      } catch (storeErr) {
        console.warn("Failed to store image in session, maybe too large", storeErr);
      }

      const parsedItems = await processImageOCR(base64Url, (p) => setProgress(p));
      await addItems(parsedItems.map(item => ({ ...item, assignments: {} })));
      
      // Automaticky přesunout uživatele na krok 2 po úspěšném nahrání a zpracování
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'edit' }));
    } catch (err) {
      setError('Nepodařilo se přečíst text. Zkuste to prosím znovu nebo vložte položky ručně.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    // Just trigger a dummy update to move forward without image
    updateImage('skipped');
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Čtení účtenky...</h2>
        <p className="text-gray-500 mb-6">Používáme AI k rozpoznání položek.</p>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold mb-6 mt-4">Krok 1: Nahrání účtenky</h2>

      {error && (
        <div className="w-full max-w-md bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {session?.imageUrl && session.imageUrl !== 'skipped' ? (
        <div className="w-full max-w-md flex flex-col items-center">
          <img src={session.imageUrl} alt="Účtenka" className="w-full max-h-[40vh] object-contain bg-gray-100 rounded-xl mb-6 shadow-sm" />
          <div className="flex flex-col gap-3 w-full mb-8">
            <div className="flex gap-2 w-full">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 text-blue-600 font-medium bg-blue-50 py-3 rounded-xl transition-colors hover:bg-blue-100 text-sm"
              >
                <Camera size={18} /> Vyfotit další
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 text-blue-600 font-medium bg-blue-50 py-3 rounded-xl transition-colors hover:bg-blue-100 text-sm"
              >
                <FileUp size={18} /> Nahrát další
              </button>
            </div>
            <button
               onClick={() => {
                 window.location.href = window.location.pathname;
               }}
               className="text-gray-500 font-medium py-2 text-sm hover:text-gray-700"
            >
              Zahodit a začít úplně novou
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col gap-4 mb-8">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full aspect-[4/1] bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-row items-center justify-center gap-4 cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Camera size={28} />
            </div>
            <div className="text-left">
              <p className="text-blue-900 font-medium text-lg">Vyfotit účtenku</p>
              <p className="text-sm text-blue-600">Použít fotoaparát</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/1] bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-row items-center justify-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="bg-gray-200 p-3 rounded-full text-gray-500">
              <FileUp size={28} />
            </div>
            <div className="text-left">
              <p className="text-gray-700 font-medium text-lg">Nahrát ze souboru</p>
              <p className="text-sm text-gray-500">Podporováno: JPG, PNG, PDF</p>
            </div>
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
        onChange={handleFileChange}
      />

      <div className="w-full max-w-md flex gap-4">
        <button
          onClick={() => {
            handleSkip();
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'edit' }));
          }}
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium"
        >
          Přeskočit
        </button>
        <button
          onClick={() => {
            if(!session?.imageUrl) updateImage('skipped');
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'edit' }));
          }}
          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          Pokračovat <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
