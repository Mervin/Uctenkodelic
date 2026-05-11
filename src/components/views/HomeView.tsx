import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Upload, FileText } from 'lucide-react';

export const HomeView: React.FC = () => {
  const { createSession, joinSession, isLoading } = useAppStore();
  const [joinId, setJoinId] = useState('');

  const handleCreate = async () => {
    await createSession();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      joinSession(joinId.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
        <FileText size={32} />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Rozdělení účtu</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        Nahrajte účtenku, opravte položky a jednoduše se vyrovnejte s přáteli.
      </p>

      <button
        onClick={handleCreate}
        disabled={isLoading}
        className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <Upload size={20} />
        {isLoading ? 'Vytvářím...' : 'Nová účtenka'}
      </button>

      <div className="flex items-center w-full max-w-sm my-8">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="px-4 text-sm text-gray-400 uppercase">Nebo</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <form onSubmit={handleJoin} className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="Vložte ID sdílené účtenky"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!joinId.trim()}
          className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
        >
          Připojit se
        </button>
      </form>
    </div>
  );
};
