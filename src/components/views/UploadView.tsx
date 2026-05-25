import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { processImageOCR } from '../../services/ocrService';
import { Loader2, ArrowRight, Camera, FileUp } from 'lucide-react';
import { convertPdfToImages } from '../../utils/pdfRenderer';
import imageCompression from 'browser-image-compression';

export const UploadView: React.FC = () => {
  const { session, updateImage, addItems } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
        // Používáme browser-image-compression
        // Automaticky aplikuje EXIF rotaci, omezí velikost na 3 MB, a zajistí, že šířka nebo výška nepřesáhnou limit.
        const options = {
          maxSizeMB: 3,
          maxWidthOrHeight: 4000,
          useWebWorker: true
          // exifOrientation is handled automatically by default in browser-image-compression v2+
        };

        const compressedFile = await imageCompression(file, options);

        base64Url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(compressedFile);
        });
      }
      
      try {
        await updateImage(base64Url);
      } catch (storeErr) {
        console.warn("Failed to store image in session, maybe too large", storeErr);
      }

      const result = await processImageOCR(base64Url, (p) => setProgress(p));
      await addItems(result.items.map(item => ({ ...item, assignments: {} })));

      let hasWarning = false;

      // Compare total if present
      if (result.ocrTotal !== undefined) {
         const computedSum = result.items.reduce((acc, item) => acc + item.price, 0);
         // Compare with a small epsilon for floating point errors
         if (Math.abs(computedSum - result.ocrTotal) > 0.05) {
             setError(`Upozornění: Součet položek (${computedSum.toFixed(2)} Kč) nesouhlasí s celkovou částkou na účtence (${result.ocrTotal.toFixed(2)} Kč). Pokračujte prosím tlačítkem níže a zkontrolujte položky.`);
             hasWarning = true;
         }
      }
      
      if (!hasWarning) {
        // Automaticky přesunout uživatele na krok 2 po úspěšném nahrání a zpracování (a žádné chybě)
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'edit' }));
      }
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
