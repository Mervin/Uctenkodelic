import Tesseract from 'tesseract.js';

export interface ParsedItem {
  name: string;
  price: number;
  quantity?: number;
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
  // Matches e.g., "12.99", "12,99", "-12.99", "59,40 B", "67,60 C", "97.20 Kč"
  const priceRegex = /(-?\d+[.,]\d{2})(?:\s*[a-zA-ZčČ]+)?\s*$/;

  // Regex to find a quantity at the start of a line.
  // Matches e.g., "6 ks x", "0,550 kg x"
  const quantityRegex = /^(\d+(?:[.,]\d+)?)\s*(?:ks|kg|g|l|ml)\s*x/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for quantity line (applies to previous item)
    const qtyMatch = trimmed.match(quantityRegex);
    if (qtyMatch && items.length > 0) {
      const qtyStr = qtyMatch[1].replace(',', '.');
      items[items.length - 1].quantity = parseFloat(qtyStr);
      continue;
    }

    const match = trimmed.match(priceRegex);
    if (match) {
      const priceStr = match[1].replace(',', '.'); // standardize decimal
      const price = parseFloat(priceStr);

      // Extract the name by removing the price and suffix from the end
      const name = trimmed.replace(priceRegex, '').trim()
        // Clean up common OCR noise like trailing dots, dashes, or colons right before price
        .replace(/[\.\-\_\*\~:\s]+$/, '')
        .trim();

      const nameLower = name.toLowerCase();

      // Check for discount line to merge into previous item
      if (price < 0 && (nameLower.includes('sleva') || nameLower.includes('zdarma') || nameLower.includes('akce') || nameLower.includes('odpočet'))) {
        if (items.length > 0) {
          items[items.length - 1].price += price;
        }
        continue;
      }

      const isSummaryOrTotal = 
        nameLower.includes('cena po slev') ||
        nameLower.includes('celkem') ||
        nameLower.includes('úhradě') ||
        nameLower.includes('uhrazeno') ||
        nameLower.includes('hotovost') ||
        nameLower.includes('karta') ||
        nameLower.includes('vráceno') ||
        nameLower.startsWith('z toho');

      if (name.length > 2 && !isNaN(price) && !isSummaryOrTotal) {
        items.push({ name, price });
      }
    }
  }

  return items;
};
