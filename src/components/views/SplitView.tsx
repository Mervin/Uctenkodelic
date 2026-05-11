import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { UserPlus, UserMinus, Share2, Check, Plus, Minus } from 'lucide-react';

export const SplitView: React.FC = () => {
  const { session, sessionId, addPerson, removePerson, setItemAssignment, updateItem } = useAppStore();
  const [newPersonName, setNewPersonName] = useState('');
  const [activePersonId, setActivePersonId] = useState<string | null>(session?.people[0]?.id || null);
  const [copied, setCopied] = useState(false);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      await addPerson(newPersonName.trim());
      setNewPersonName('');
    }
  };

  const handleCopyLink = () => {
    // For pass-the-phone or basic sharing
    const url = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!session) return null;

  // Auto-select first person if active is null but people exist
  if (!activePersonId && session.people.length > 0) {
    setActivePersonId(session.people[0].id);
  }

  return (
    <div className="flex flex-col p-4 pb-24 h-full">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Krok 3: Kdo co platí</h2>
          <p className="text-gray-500 text-sm mt-1">Přidejte lidi a vyberte, kdo platí jakou položku.</p>
        </div>
        <button onClick={handleCopyLink} className="flex flex-col items-center justify-center p-2 text-blue-600 bg-blue-50 rounded-lg text-xs font-medium min-w-[60px]">
          {copied ? <Check size={20} className="mb-1" /> : <Share2 size={20} className="mb-1" />}
          {copied ? 'Kopie' : 'Sdílet'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide shrink-0">
        {session.people.map(person => (
          <div
            key={person.id}
            onClick={() => setActivePersonId(person.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap cursor-pointer transition-colors border ${
              activePersonId === person.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">{person.name}</span>
            {activePersonId === person.id && (
               <button onClick={(e) => { e.stopPropagation(); removePerson(person.id); }} className="p-0.5 hover:bg-blue-700 rounded-full">
                 <UserMinus size={14} />
               </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAddPerson} className="flex gap-2 mb-8 shrink-0">
        <input
          value={newPersonName}
          onChange={e => setNewPersonName(e.target.value)}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Jméno (např. Adam)"
        />
        <button type="submit" disabled={!newPersonName.trim()} className="bg-gray-900 text-white px-4 rounded-xl disabled:opacity-50 flex items-center gap-2 font-medium">
          <UserPlus size={18} /> Přidat
        </button>
      </form>

      {session.people.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          Přidejte první osobu pro začátek rozdělování.
        </div>
      ) : !activePersonId ? (
         <div className="flex-1 flex items-center justify-center text-gray-400">Vyberte osobu</div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
             Položky ({session.people.find(p=>p.id === activePersonId)?.name})
           </h3>
           <div className="flex flex-col gap-2">
             {session.items.map(item => {
               const activeShares = item.assignments[activePersonId] || 0;
               const totalShares = Object.values(item.assignments).reduce((a, b) => a + b, 0);

               return (
                 <div
                   key={item.id}
                   className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                     activeShares > 0
                       ? 'bg-blue-50 border-blue-200 shadow-sm'
                       : 'bg-white border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   <div className="flex flex-col flex-1 min-w-0">
                     <p className={`font-medium truncate ${activeShares > 0 ? 'text-blue-900' : 'text-gray-900'}`}>
                       {item.quantity && <span className="text-sm font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-2">{item.quantity}x</span>}
                       {item.name}
                     </p>
                     <div className="flex justify-between items-center mt-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const q = prompt('Zadejte celkový počet kusů/dílů (nechte prázdné pro automatické dělení):', String(item.quantity || ''));
                            if (q !== null) {
                              const parsed = parseInt(q, 10);
                              if (!isNaN(parsed) && parsed > 0) {
                                updateItem(item.id, { quantity: parsed });
                              } else if (q.trim() === '') {
                                const newItem = { ...item };
                                delete newItem.quantity;
                                updateItem(item.id, newItem);
                              }
                            }
                          }}
                          className="text-[11px] text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 -ml-2"
                          title="Upravit celkový počet dílů"
                        >
                          {totalShares > 0 ? `Rozděleno: ${totalShares}` : 'Nerozděleno'}
                          {item.quantity ? ` / ${item.quantity} ${totalShares <= item.quantity ? 'ks' : 'dílů'}` : (totalShares > 0 ? ' dílů' : '')}
                          <span className="opacity-50 ml-0.5">✎</span>
                        </button>
                       <div className={`font-semibold whitespace-nowrap ${activeShares > 0 ? 'text-blue-700' : 'text-gray-900'}`}>
                         {item.price.toFixed(2)} Kč
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-1 shrink-0 bg-white border border-gray-200 rounded-lg p-0.5">
                     <button
                       onClick={() => setItemAssignment(item.id, activePersonId, Math.max(0, activeShares - 1))}
                       disabled={activeShares === 0}
                       className="w-8 h-8 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                     >
                       <Minus size={18} />
                     </button>
                     <span className="w-6 text-center font-bold text-gray-900">{activeShares}</span>
                     <button
                       onClick={() => setItemAssignment(item.id, activePersonId, activeShares + 1)}
                       className="w-8 h-8 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                     >
                       <Plus size={18} />
                     </button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}
    </div>
  );
};
