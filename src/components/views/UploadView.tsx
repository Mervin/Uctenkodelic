import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { processImageOCR } from '../../services/ocrService';
import { ImagePlus, Loader2, ArrowRight } from 'lucide-react';

export const UploadView: React.FC = () => {
  const { session, updateImage, addItems } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <button
             onClick={() => fileInputRef.current?.click()}
             className="text-blue-600 font-medium mb-8"
          >
            Nahrát jinou fotografii
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-md aspect-[3/4] max-h-[40vh] bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors mb-8"
        >
          <ImagePlus size={48} className="text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">Vyfotit nebo nahrát</p>
          <p className="text-sm text-gray-400 mt-1">Podporováno: JPG, PNG</p>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
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
