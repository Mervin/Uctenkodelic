import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';

export const EditorView: React.FC = () => {
  const { session, updateItem, removeItem, addItems } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(String(item.name ?? ''));
    setEditPrice(String(item.price ?? ''));
    setEditQuantity(item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : '');
  };

  const handleSave = async (id: string) => {
    const safePriceStr = String(editPrice || '').replace(/\s/g, '').replace(',', '.');
    const safeQuantityStr = String(editQuantity || '').replace(/\s/g, '').replace(',', '.');
    const safeNameStr = String(editName || '').trim();

    const price = parseFloat(safePriceStr);
    const quantity = safeQuantityStr ? parseFloat(safeQuantityStr) : 1;

    if (!isNaN(price) && safeNameStr) {
      await updateItem(id, { name: safeNameStr, price, quantity });
    }
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const safePriceStr = String(newPrice || '').replace(/\s/g, '').replace(',', '.');
    const safeQuantityStr = String(newQuantity || '').replace(/\s/g, '').replace(',', '.');
    const safeNameStr = String(newName || '').trim();

    const price = parseFloat(safePriceStr);
    const quantity = safeQuantityStr ? parseFloat(safeQuantityStr) : 1;

    if (!isNaN(price) && safeNameStr) {
      await addItems([{ name: safeNameStr, price, quantity, assignments: {} }]);
      setNewName('');
      setNewPrice('');
      setNewQuantity('');
    }
  };

  const total = session?.items.reduce((acc, item) => acc + item.price, 0) || 0;

  return (
    <div className="flex flex-col p-4 pb-24">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Krok 2: Kontrola položek</h2>
        <p className="text-gray-500 text-sm mt-1">Zkontrolujte rozpoznané položky, upravte chyby nebo přidejte chybějící.</p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {session?.items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-3">
            {editingId === item.id ? (
              <div className="flex-1 flex flex-col gap-3">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1 text-lg font-medium"
                  placeholder="Název"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={editQuantity}
                    onChange={e => setEditQuantity(e.target.value)}
                    className="w-16 border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1 text-center"
                    placeholder="ks"
                    type="text"
                    inputMode="decimal"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={editPrice}
                      onChange={e => setEditPrice(e.target.value)}
                      className="w-24 border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1 text-right font-medium"
                      placeholder="Cena"
                      type="text"
                      inputMode="decimal"
                    />
                    <button onClick={() => handleSave(item.id)} className="p-2 text-green-600 bg-green-50 rounded-lg shrink-0"><Check size={18} /></button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.quantity ?? 1}x</span>
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  </div>
                  {item.unitInfo && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.unitInfo}</p>
                  )}
                </div>
                <div className="font-semibold text-gray-900 whitespace-nowrap">
                  {item.price.toFixed(2)} Kč
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                  <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {session?.items.length === 0 && (
           <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
             Zatím žádné položky
           </div>
        )}
      </div>

      <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-2">
        <input
          value={newQuantity}
          onChange={e => setNewQuantity(e.target.value)}
          className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
          placeholder="ks"
          type="text"
          inputMode="decimal"
        />
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          placeholder="Nová položka"
        />
        <input
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          placeholder="Cena"
          type="text"
          inputMode="decimal"
        />
        <button type="submit" disabled={!newName.trim() || !newPrice.trim()} className="bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50 flex items-center justify-center">
          <Plus size={20} />
        </button>
      </form>

      <div className="mt-8 flex justify-between items-center text-lg font-bold p-4 bg-blue-50 text-blue-900 rounded-xl">
        <span>Celkem:</span>
        <span>{total.toFixed(2)} Kč</span>
      </div>
    </div>
  );
};
