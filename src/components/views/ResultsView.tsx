import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Receipt, AlertCircle } from 'lucide-react';

export const ResultsView: React.FC = () => {
  const { session } = useAppStore();

  if (!session) return null;

  // Calculate totals
  const totals: Record<string, number> = {};
  session.people.forEach(p => totals[p.id] = 0);

  let unassignedTotal = 0;
  const unassignedItems: any[] = [];

  session.items.forEach(item => {
    const totalShares = Object.values(item.assignments).reduce((a, b) => a + b, 0);
    const divisor = item.quantity && item.quantity > totalShares ? item.quantity : totalShares;

    if (totalShares === 0) {
      unassignedTotal += item.price;
      unassignedItems.push(item);
    } else {
      Object.entries(item.assignments).forEach(([personId, shares]) => {
        if (totals[personId] !== undefined) {
          totals[personId] += (shares / divisor) * item.price;
        }
      });

      if (item.quantity && totalShares < item.quantity) {
        const unassignedRatio = (item.quantity - totalShares) / item.quantity;
        unassignedTotal += unassignedRatio * item.price;
        if (!unassignedItems.includes(item)) {
          unassignedItems.push(item);
        }
      }
    }
  });

  const grandTotal = session.items.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="flex flex-col p-4 pb-24">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt size={32} />
        </div>
        <h2 className="text-2xl font-bold">Výsledek</h2>
        <p className="text-gray-500 mt-1">Konečné rozdělení účtu</p>
      </div>

      {unassignedTotal > 0 && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6 flex gap-3 text-orange-800">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold mb-1">Některé položky nejsou rozděleny!</p>
            <p className="text-sm opacity-90">V hodnotě {unassignedTotal.toFixed(2)} Kč.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center font-bold text-gray-900">
          <span>Celková útrata</span>
          <span className="text-xl">{grandTotal.toFixed(2)} Kč</span>
        </div>

        <div className="divide-y divide-gray-100">
          {session.people.map(person => (
            <div key={person.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900">{person.name}</span>
              <span className="font-bold text-blue-600 text-lg">
                {totals[person.id].toFixed(2)} Kč
              </span>
            </div>
          ))}
          {session.people.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              Zatím nebyli přidáni žádní lidé.
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-sm text-gray-400 mt-4">
        Každý platí poměrnou část položky podle zadaného počtu dílů/kusů.
      </div>
    </div>
  );
};
