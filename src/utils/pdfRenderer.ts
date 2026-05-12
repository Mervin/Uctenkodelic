import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker. Since we are using Vite, we can point it to the local pdf.worker.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

export const convertPdfToImages = async (pdfUrl: string): Promise<string[]> => {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const imageUrls: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Scale the PDF up for better OCR quality. 2.0 or 3.0 is usually good.
    const viewport = page.getViewport({ scale: 2.5 });

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
