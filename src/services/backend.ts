import type { SessionData } from '../models/types';

export interface BackendService {
  createSession(initialData: Omit<SessionData, 'id' | 'createdAt'>): Promise<SessionData>;
  getSession(id: string): Promise<SessionData | null>;
  updateSession(id: string, update: Partial<SessionData>): Promise<void>;
  subscribeToSession(id: string, callback: (data: SessionData) => void): () => void;
}
