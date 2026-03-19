import { useState, useEffect } from 'react';
import { addXP, spendXP, refundXP, getBalance, safeLoad, safeSave, KEYS } from '../utils/zen';
import { GARDEN_ITEMS, DEFAULT_GARDEN } from '../components/garden/gardenData';

export default function useGardenState() {
  const [garden, setGarden] = useState(() => safeLoad(KEYS.GARDEN, { ...DEFAULT_GARDEN }));
  const [balance, setBalance] = useState(getBalance);

  useEffect(() => {
    safeSave(KEYS.GARDEN, garden);
  }, [garden]);

  const today = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = garden.checkIns.includes(today);

  const cycleStart = new Date(garden.cycleStartDate);
  const now = new Date(today);
  const cycleDay = Math.min(30, Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24)) + 1);

  const checkIn = () => {
    if (hasCheckedInToday) return;
    addXP(10);
    setBalance(getBalance() + 10);
    setGarden(prev => ({
      ...prev,
      checkIns: [...prev.checkIns, today],
    }));
  };

  const placeItem = (type, x, y) => {
    const itemDef = GARDEN_ITEMS.find(i => i.id === type);
    if (!itemDef || balance < itemDef.cost) return false;
    spendXP(itemDef.cost);
    setBalance(prev => prev - itemDef.cost);
    const newId = `item_${Date.now()}`;
    setGarden(prev => ({
      ...prev,
      items: [...prev.items, { id: newId, type, x, y }],
    }));
    return newId;
  };

  const removeItem = (itemId) => {
    const item = garden.items.find(i => i.id === itemId);
    if (item) {
      const def = GARDEN_ITEMS.find(d => d.id === item.type);
      if (def) {
        refundXP(def.cost);
        setBalance(prev => prev + def.cost);
      }
    }
    setGarden(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }));
  };

  return { garden, balance, cycleDay, hasCheckedInToday, checkIn, placeItem, removeItem };
}
