import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { UserPlus, UserMinus, Share2, Check } from 'lucide-react';

export const SplitView: React.FC = () => {
  const { session, sessionId, addPerson, removePerson, toggleItemAssignment } = useAppStore();
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
               const isSelectedByActive = item.assignedPeopleIds.includes(activePersonId);
               const sharedCount = item.assignedPeopleIds.length;

               return (
                 <div
                   key={item.id}
                   onClick={() => toggleItemAssignment(item.id, activePersonId)}
                   className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                     isSelectedByActive
                       ? 'bg-blue-50 border-blue-200 shadow-sm'
                       : 'bg-white border-gray-200 hover:border-gray-300'
                   }`}
                 >
                   <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${
                       isSelectedByActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300'
                     }`}>
                       {isSelectedByActive && <Check size={16} />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className={`font-medium truncate ${isSelectedByActive ? 'text-blue-900' : 'text-gray-900'}`}>{item.name}</p>
                       {sharedCount > 1 && (
                         <p className="text-xs text-blue-600 mt-0.5">Sdíleno {sharedCount} lidmi ({(item.price/sharedCount).toFixed(2)} Kč)</p>
                       )}
                     </div>
                   </div>
                   <div className={`font-semibold whitespace-nowrap ${isSelectedByActive ? 'text-blue-700' : 'text-gray-900'}`}>
                     {item.price.toFixed(2)} Kč
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
