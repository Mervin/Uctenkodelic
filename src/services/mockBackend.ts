import type { BackendService } from './backend';
import type { SessionData } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class MockBackendService implements BackendService {
  private sessions: Record<string, SessionData> = {};
  private listeners: Record<string, ((data: SessionData) => void)[]> = {};

  constructor() {
    // Load from local storage
    const stored = localStorage.getItem('mockSessions');
    if (stored) {
      this.sessions = JSON.parse(stored);
    }
  }

  private save() {
    localStorage.setItem('mockSessions', JSON.stringify(this.sessions));
  }

  private notify(id: string) {
    const session = this.sessions[id];
    if (session && this.listeners[id]) {
      this.listeners[id].forEach(cb => cb(session));
    }
  }

  async createSession(initialData: Omit<SessionData, 'id' | 'createdAt'>): Promise<SessionData> {
    const id = uuidv4();
    const newSession: SessionData = {
      ...initialData,
      id,
      createdAt: Date.now(),
    };
    this.sessions[id] = newSession;
    this.save();
    return newSession;
  }

  async getSession(id: string): Promise<SessionData | null> {
    return this.sessions[id] || null;
  }

  async updateSession(id: string, update: Partial<SessionData>): Promise<void> {
    if (this.sessions[id]) {
      this.sessions[id] = { ...this.sessions[id], ...update };
      this.save();
      this.notify(id);
    }
  }

  subscribeToSession(id: string, callback: (data: SessionData) => void): () => void {
    if (!this.listeners[id]) {
      this.listeners[id] = [];
    }
    this.listeners[id].push(callback);

    // Initial call
    if (this.sessions[id]) {
      callback(this.sessions[id]);
    }

    return () => {
      this.listeners[id] = this.listeners[id].filter(cb => cb !== callback);
    };
  }
}

export const backendService = new MockBackendService();
