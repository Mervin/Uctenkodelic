import { create } from 'zustand';
import type { SessionData, Person, ReceiptItem } from '../models/types';
import { backendService } from '../services/firebaseBackend';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  session: SessionData | null;
  sessionId: string | null;
  isLoading: boolean;

  // Actions
  createSession: () => Promise<string>;
  joinSession: (id: string) => void;
  updateImage: (imageUrl: string) => Promise<void>;
  addPerson: (name: string) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  addItems: (items: Omit<ReceiptItem, 'id'>[]) => Promise<void>;
  updateItem: (id: string, update: Partial<ReceiptItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  setItemAssignment: (itemId: string, personId: string, shares: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  sessionId: null,
  isLoading: false,

  createSession: async () => {
    set({ isLoading: true });
    const newSession = await backendService.createSession({
      people: [],
      items: [],
      imageUrl: null,
    });
    set({ sessionId: newSession.id, session: newSession, isLoading: false });

    // Auto subscribe
    get().joinSession(newSession.id);
    return newSession.id;
  },

  joinSession: (id: string) => {
    set({ sessionId: id });
    backendService.subscribeToSession(id, (data) => {
      set({ session: data });
    });
  },

  updateImage: async (imageUrl: string) => {
    const { sessionId, session } = get();
    if (sessionId && session) {
      await backendService.updateSession(sessionId, { imageUrl });
    }
  },

  addPerson: async (name: string) => {
    const { sessionId, session } = get();
    if (sessionId && session) {
      const newPerson: Person = { id: uuidv4(), name };
      await backendService.updateSession(sessionId, {
        people: [...session.people, newPerson]
      });
    }
  },

  removePerson: async (id: string) => {
    const { sessionId, session } = get();
    if (sessionId && session) {
      // Remove person and unassign them from items
      const updatedItems = session.items.map(item => {
        const newAssignments = { ...item.assignments };
        delete newAssignments[id];
        return { ...item, assignments: newAssignments };
      });
      await backendService.updateSession(sessionId, {
        people: session.people.filter(p => p.id !== id),
        items: updatedItems
      });
    }
  },

  addItems: async (items) => {
     const { sessionId, session } = get();
     if (sessionId && session) {
       const newItems = items.map(item => ({ ...item, id: uuidv4() }));
       await backendService.updateSession(sessionId, {
         items: [...session.items, ...newItems]
       });
     }
  },

  updateItem: async (id, update) => {
    const { sessionId, session } = get();
    if (sessionId && session) {
      const updatedItems = session.items.map(item =>
        item.id === id ? { ...item, ...update } : item
      );
      await backendService.updateSession(sessionId, { items: updatedItems });
    }
  },

  removeItem: async (id) => {
    const { sessionId, session } = get();
    if (sessionId && session) {
      await backendService.updateSession(sessionId, {
        items: session.items.filter(item => item.id !== id)
      });
    }
  },

  setItemAssignment: async (itemId, personId, shares) => {
    const { sessionId, session } = get();
    if (sessionId && session) {
      const updatedItems = session.items.map(item => {
        if (item.id === itemId) {
          const newAssignments = { ...item.assignments };
          if (shares <= 0) {
            delete newAssignments[personId];
          } else {
            newAssignments[personId] = shares;
          }
          return { ...item, assignments: newAssignments };
        }
        return item;
      });
      await backendService.updateSession(sessionId, { items: updatedItems });
    }
  }
}));
