import Tesseract from 'tesseract.js';

export interface ParsedItem {
  name: string;
  price: number;
  quantity?: number;
  unitInfo?: string;
}

export interface ParsedReceipt {
  items: ParsedItem[];
  ocrTotal?: number;
}

export const processImageOCR = async (
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<ParsedReceipt> => {
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
export const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text.split('\n');
  const items: ParsedItem[] = [];
  let ocrTotal: number | undefined = undefined;
  let isItemParsingComplete = false;

  // Regex to find a price at the end of a line.
  // Matches e.g., "12.99", "12,99", "-12.99", "59,40 B", "67,60 C", "97.20 Kč"
  // Allows optional letters/spaces after the price.
  const priceRegex = /(-?\d+[.,]\d{2})(?:\s*[a-zA-ZčČ\s]+)?$/;

  // Regex to find a quantity, optionally preceded by a little noise.
  // Matches e.g., "6 ks x", "0,550 kg x", "2 x", "2x", "0,190 kg *"
  // Adding \b or allowing optional start so noise like "n " works
  const quantityRegex = /(?:^[a-zA-Z\s]*?|^\s*)(\d+(?:[.,]\d+)?)\s*(ks|kg|g|l|ml)?\s*(?:x|\*)/i;

  let pendingName = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const qtyMatch = trimmed.match(quantityRegex);
    let qty: number | null = null;
    let namePart = trimmed;
    let unitInfoPart: string | undefined = undefined;

    let isWeightLine = false;

    if (qtyMatch) {
      const isWeight = qtyMatch[2] && ['kg', 'g', 'l', 'ml'].includes(qtyMatch[2].toLowerCase());

      if (isWeight) {
        isWeightLine = true;
        // e.g. "0,58kg x 129,90 Kč"
        // Since there might be noise before it (like "n "), we just find the qtyMatch in the string and look ahead
        const matchIdx = namePart.indexOf(qtyMatch[0]);
        if (matchIdx !== -1) {
             const restOfString = namePart.substring(matchIdx);
             const unitPriceRegex = new RegExp(`^(${qtyMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\d+[.,]\\d{2}\\s*(?:Kč|Kc|Eur|€|K\\?)?)`, 'i');
             const unitPriceMatch = restOfString.match(unitPriceRegex);

             if (unitPriceMatch) {
                 // Remove any leading noise from the unit info so it's clean
                 unitInfoPart = unitPriceMatch[1].replace(/^[a-zA-Z\s]+/, '').trim();
                 namePart = namePart.substring(0, matchIdx) + restOfString.replace(unitPriceRegex, '').trim();
             } else {
                 unitInfoPart = qtyMatch[0].replace(/^[a-zA-Z\s]+/, '').trim();
                 namePart = namePart.substring(0, matchIdx) + restOfString.replace(quantityRegex, '').trim();
             }

             // Clean up any small garbage left before the match (like the "n ")
             namePart = namePart.replace(/^[a-zA-Z]\s+/, '').trim();
        }
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
        nameLower.includes('f0%') ||
        nameLower.includes('online') ||
        nameLower.includes('zaplacen') ||
        nameLower.startsWith('z toho') ||
        nameLower.includes('součet') ||
        nameLower.includes('soucet') ||
        nameLower.includes('ušetříte') ||
        nameLower === 'cena czk';

      if (isSummaryOrTotal) {
        pendingName = ''; // clear any pending name so it doesn't steal the price

        // Extract total amount if it looks like the main total line
        if ((nameLower.includes('součet') || nameLower.includes('soucet') || nameLower.includes('celkem')) && !isNaN(price)) {
           // It's possible there are multiple (e.g., Celkem bez DPH vs Celkem), keep the maximum one
           if (price > 0) {
               ocrTotal = ocrTotal === undefined ? price : Math.max(ocrTotal, price);
               isItemParsingComplete = true; // We've seen a total, stop parsing new items
           }
        }
        continue;
      }

      if (isItemParsingComplete) {
        pendingName = '';
        continue; // Skip processing any further items after the total is found
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
          if (unitInfoPart) finalItem.unitInfo = unitInfoPart;
          items.push(finalItem);
        }
      } else if (qtyMatch && !isWeightLine && items.length > 0) {
        items[items.length - 1].quantity = qty as number;
      }
    } else {
      const lowerTrimmed = trimmed.toLowerCase();
      if (isItemParsingComplete) {
         pendingName = '';
         continue; // Skip processing any further text lines after the total is found
      }

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
         lowerTrimmed.includes('f0%') ||
         lowerTrimmed.includes('online') ||
         /^[\d/\s:]+$/.test(lowerTrimmed); // dates and times

      // If we see structural markers like IČO/DIČ, clear any preceding accumulated text
      // because it is almost certainly store header information (store name, address)
      const isStructuralHeaderMarker = /(?:^|\s)(ičo|dič|pič|ič)(?:\s|:|$)/.test(lowerTrimmed) ||
                                       lowerTrimmed.includes('id provozovny') ||
                                       lowerTrimmed.includes('s.r.o.') ||
                                       lowerTrimmed.includes('a.s.');

      // Also skip lines that are very common address patterns occurring *before* the first item
      // We use á-ž to support Czech characters in street names
      const isPreItemAddress = items.length === 0 && (
          /\d{3}\s*\d{2}\s+[a-zA-Zá-žÁ-Ž]+/.test(trimmed) || // PSČ and City (e.g., 301 00 Plzeň)
          /^[a-zA-Zá-žÁ-Ž\s-]+\s+\d+\/\d+/.test(trimmed) || // Street with numbers (e.g., Novodvorská 1062/12, Stavbařská 2959/2)
          /^[a-zA-Zá-žÁ-Ž\s-]+\s+\d+,/.test(trimmed) || // Street with number and comma
          /^č\.\s*\d+/.test(trimmed) // č. 91926
      );

      // If a line is just a common short OCR error before any items, skip it to prevent pollution
      const isPreItemShortNoise = items.length === 0 && (
          /^čiysk$/i.test(trimmed) ||
          /^jysk$/i.test(trimmed)
      );

      if ((isStructuralHeaderMarker || isPreItemAddress || isPreItemShortNoise) && items.length === 0) {
          pendingName = '';
      }

      if (!isJunkLine && !isStructuralHeaderMarker && !isPreItemAddress && !isPreItemShortNoise && trimmed.length > 2) {
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

  return { items, ocrTotal };
};
