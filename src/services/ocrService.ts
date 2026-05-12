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
  // Allows optional letters/spaces after the price.
  const priceRegex = /(-?\d+[.,]\d{2})(?:\s*[a-zA-ZčČ\s]+)?$/;

  // Regex to find a quantity at the start of a line.
  // Matches e.g., "6 ks x", "0,550 kg x", "2 x", "2x", "0,190 kg *"
  const quantityRegex = /^(\d+(?:[.,]\d+)?)\s*(ks|kg|g|l|ml)?\s*(?:x|\*)/i;

  let pendingName = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const qtyMatch = trimmed.match(quantityRegex);
    let qty: number | null = null;
    let namePart = trimmed;

    let isWeightLine = false;

    if (qtyMatch) {
      const isWeight = qtyMatch[2] && ['kg', 'g', 'l', 'ml'].includes(qtyMatch[2].toLowerCase());

      if (isWeight) {
        isWeightLine = true;
      } else {
        const qtyStr = qtyMatch[1].replace(',', '.');
        qty = parseFloat(qtyStr);
        namePart = namePart.replace(quantityRegex, '').trim();
      }
    }

    const match = namePart.match(priceRegex);
    if (match) {
      const priceStr = match[1].replace(',', '.'); // standardize decimal
      const price = parseFloat(priceStr);

      // Extract the name by removing the price and suffix from the end
      let name = namePart.replace(priceRegex, '').trim()
        // Clean up common OCR noise like trailing dots, dashes, or colons right before price
        .replace(/[.\-_*~:\s]+$/, '')
        .trim();

      // If the line had quantity and total price (e.g., "2x 19.90 Kč 39.80 Kč A")
      // We should strip the unit price as well.
      if (!isWeightLine) {
         name = name.replace(/\d+[.,]\d{2}\s*(?:Kč|Kc|Eur|€|K\?)?(?:\s*\/\s*(?:kg|ks|g|l|ml))?/i, '').trim();
      }

      // Clean up random slash / kg remnants
      name = name.replace(/\/\s*(?:kg|ks|g|l|ml)/i, '').trim();

      // Prepend pending name if it exists
      if (pendingName) {
        if (name) {
           name = pendingName + ' ' + name;
        } else {
           name = pendingName;
        }
        pendingName = '';
      }

      // If the line is a weight line, the raw string is already appended to the pendingName.
      // We treat the item as quantity 1 since it's an indivisible package for splitting purposes.
      const nameLower = name.toLowerCase();

      const isSummaryOrTotal = 
        nameLower.includes('cena po slev') ||
        nameLower.includes('celkem') ||
        nameLower.includes('celková') ||
        nameLower.includes('celkový') ||
        nameLower.includes('platbě') ||
        nameLower.includes('úhradě') ||
        nameLower.includes('uhrazeno') ||
        nameLower.includes('hotovost') ||
        nameLower.includes('karta') ||
        nameLower.includes('kartou') ||
        nameLower.includes('vráceno') ||
        nameLower.includes('prodej') ||
        nameLower.includes('dph') ||
        nameLower.includes('daň') ||
        nameLower.includes('dan') ||
        nameLower.includes('brutto') ||
        nameLower.includes('netto') ||
        nameLower.includes('c=%') ||
        nameLower.includes('f=%') ||
        nameLower.includes('zaplacen') ||
        nameLower.startsWith('z toho') ||
        nameLower.includes('součet') ||
        nameLower.includes('soucet') ||
        nameLower.includes('ušetříte') ||
        nameLower === 'cena czk';

      if (isSummaryOrTotal) {
        continue;
      }

      // Check for discount line to merge into previous item
      const isDiscountKeyword = nameLower.includes('sleva') || nameLower.includes('zdarma') || nameLower.includes('akce') || nameLower.includes('odpočet');
      const isTotalDiscount = nameLower.includes('celková') || nameLower.includes('celkový');

      // If price is negative, OR it has a discount keyword (and isn't a summary discount)
      if ((price < 0 || isDiscountKeyword) && !isTotalDiscount) {
        const discountAmount = Math.abs(price);
        if (items.length > 0 && items[items.length - 1].price >= discountAmount) {
          // Subtract the discount from the previous item
          items[items.length - 1].price = Math.round((items[items.length - 1].price - discountAmount) * 100) / 100;
        } else if (items.length > 0) {
          // Add as a separate item instead of breaking previous item with negative price
          items.push({ name, price: -discountAmount });
        }
        continue;
      }

      const isOnlyNumeric = /^[0-9.,\s%]+$/.test(name);

      if (name.length > 2 && !isNaN(price) && !isOnlyNumeric) {
        // Check for duplicity to aggregate identical items
        const existingItem = items.find(
          item => item.name.toLowerCase() === nameLower && item.price === price
        );

        if (existingItem) {
          // Increment quantity
          const incrementQty = qty !== null ? qty : 1;
          existingItem.quantity = (existingItem.quantity || 1) + incrementQty;
        } else {
          const finalItem: ParsedItem = { name, price };
          if (qty !== null) finalItem.quantity = qty;
          items.push(finalItem);
        }
      } else if (qtyMatch && !isWeightLine && items.length > 0) {
        items[items.length - 1].quantity = qty as number;
      }
    } else {
      const lowerTrimmed = trimmed.toLowerCase();
      const isJunkLine =
         lowerTrimmed.startsWith('< detail') ||
         lowerTrimmed.includes('položka cena') ||
         lowerTrimmed.includes('získané kredity') ||
         lowerTrimmed.includes('získané body') ||
         lowerTrimmed.includes('prodejna') ||
         lowerTrimmed.includes('klient') ||
         lowerTrimmed.includes('platební metoda') ||
         lowerTrimmed.includes('kód sazba') ||
         lowerTrimmed.includes('terminál') ||
         lowerTrimmed.includes('mastercard') ||
         lowerTrimmed.includes('visa') ||
         lowerTrimmed.includes('účtenka') ||
         lowerTrimmed.includes('kaufland česká') ||
         lowerTrimmed.includes('bělohorská') ||
         lowerTrimmed.includes('adresa') ||
         lowerTrimmed.includes('******') ||
         lowerTrimmed.includes('cena czk') ||
         lowerTrimmed.includes('ušetříte') ||
         lowerTrimmed.includes('daň') ||
         lowerTrimmed.includes('dan') ||
         /^[\d/\s:]+$/.test(lowerTrimmed); // dates and times

      if (!isJunkLine && trimmed.length > 2) {
         if (qtyMatch && !isWeightLine) {
            if (items.length > 0) {
               items[items.length - 1].quantity = qty as number;
            }
         } else {
            pendingName = pendingName ? pendingName + ' ' + trimmed : trimmed;
         }
      } else {
         pendingName = '';
      }
    }
  }

  return items;
};
