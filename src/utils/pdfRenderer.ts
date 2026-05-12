import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker. Using the worker directly imported as url to avoid version mismatch.
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const convertPdfToImages = async (pdfUrl: string): Promise<string[]> => {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const imageUrls: string[] = [];

  const MAX_HEIGHT = 4000;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Initial check for viewport dimensions at scale 1.0
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Calculate dynamic scale. Start with ideal 2.5 for better OCR quality.
    let scale = 2.5;

    // If scaled height exceeds safe bounds, scale it down to exact MAX_HEIGHT
    if (unscaledViewport.height * scale > MAX_HEIGHT) {
      scale = MAX_HEIGHT / unscaledViewport.height;
    }

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error("Could not create canvas context");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext: any = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    };

    await page.render(renderContext).promise;

    // Convert canvas to a data URL (base64 encoded image)
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    imageUrls.push(dataUrl);
  }

  return imageUrls;
};
