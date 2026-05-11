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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for local mock storage
    // Note: For real backend, we'd upload the file and get a URL.
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      await updateImage(base64Url);

      setIsProcessing(true);
      setError(null);
      setProgress(0);

      try {
        const parsedItems = await processImageOCR(base64Url, (p) => setProgress(p));
        await addItems(parsedItems.map(item => ({ ...item, assignments: {} })));
      } catch (err) {
        setError('Nepodařilo se přečíst text. Zkuste to prosím znovu nebo vložte položky ručně.');
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
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
        capture="environment"
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
