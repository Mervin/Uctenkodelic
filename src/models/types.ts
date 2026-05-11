export interface Person {
  id: string;
  name: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  assignments: Record<string, number>;
}

export interface SessionData {
  id: string;
  createdAt: number;
  people: Person[];
  items: ReceiptItem[];
  imageUrl: string | null; // For sharing, though mock might not handle big blobs well
}
