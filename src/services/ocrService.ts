import Tesseract from 'tesseract.js';

export interface ParsedItem {
  name: string;
  price: number;
}

export const processImageOCR = async (
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<ParsedItem[]> => {
  try {
    const worker = await Tesseract.createWorker('ces', 1, {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    });

    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();

    return parseReceiptText(text);
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

/**
 * Heuristics to parse OCR text into items and prices.
 * Receipts generally have lines with "Item Name ... Price".
 * This is a best-effort parser.
 */
const parseReceiptText = (text: string): ParsedItem[] => {
  const lines = text.split('\n');
  const items: ParsedItem[] = [];

  // Regex to find a price at the end of a line.
  // Matches e.g., "12.99", "12,99", "-12.99"
  const priceRegex = /(-?\d+[.,]\d{2})\s*$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(priceRegex);
    if (match) {
      const priceStr = match[1].replace(',', '.'); // standardize decimal
      const price = parseFloat(priceStr);

      // Extract the name by removing the price from the end
      const name = trimmed.replace(priceRegex, '').trim()
        // Clean up common OCR noise like trailing dots, dashes, or letters right before price
        .replace(/[\.\-\_ABC]+$/, '')
        .trim();

      if (name.length > 2 && !isNaN(price)) {
        items.push({ name, price });
      }
    }
  }

  return items;
};
