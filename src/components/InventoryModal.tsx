import React from 'react';
import { Item, PlayerStats } from '../types/game';
import { X, Shield, Sword, Sparkles, Heart } from 'lucide-react';
import { soundManager } from '../game/audio';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Item[];
  stats: PlayerStats;
  onEquipItem: (item: Item) => void;
  onUseConsumable: (item: Item) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  stats,
  onEquipItem,
  onUseConsumable,
}) => {
  if (!isOpen) return null;

  const equippedWeapon = inventory.find((i) => i.type === 'weapon' && i.equipped);
  const equippedArmor = inventory.find((i) => i.type === 'armor' && i.equipped);
  const equippedAccessory = inventory.find((i) => i.type === 'accessory' && i.equipped);

  const getRarityBadge = (rarity: Item['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'border-amber-400 text-amber-300 bg-amber-950/40';
      case 'epic':
        return 'border-purple-400 text-purple-300 bg-purple-950/40';
      case 'rare':
        return 'border-blue-400 text-blue-300 bg-blue-950/40';
      default:
        return 'border-stone-600 text-stone-300 bg-stone-900/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-stone-950/95 border border-stone-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎒</span>
            <div>
              <h2 className="text-xl font-black text-stone-100 tracking-wide">
                Tas & Perlengkapan
              </h2>
              <p className="text-xs text-stone-400">
                Kelola senjata, zirah pelindung, dan ramuan ajaib Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Equipped Gear Slots Overview */}
        <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
          {/* Weapon Slot */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="w-11 h-11 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center justify-center text-xl">
              {equippedWeapon?.icon || '🗡️'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Senjata</span>
              <h4 className="text-xs font-bold text-stone-200 truncate">
                {equippedWeapon ? equippedWeapon.nameId : 'Tanpa Senjata'}
              </h4>
              <span className="text-[10px] text-red-400 font-mono">
                {equippedWeapon?.stats?.attack ? `+${equippedWeapon.stats.attack} ATK` : ''}
              </span>
            </div>
          </div>

          {/* Armor Slot */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="w-11 h-11 rounded-lg bg-blue-950/40 border border-blue-800/60 flex items-center justify-center text-xl">
              {equippedArmor?.icon || '🛡️'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Zirah</span>
              <h4 className="text-xs font-bold text-stone-200 truncate">
                {equippedArmor ? equippedArmor.nameId : 'Tanpa Zirah'}
              </h4>
              <span className="text-[10px] text-blue-400 font-mono">
                {equippedArmor?.stats?.defense ? `+${equippedArmor.stats.defense} DEF` : ''}
              </span>
            </div>
          </div>

          {/* Accessory Slot */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="w-11 h-11 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-xl">
              {equippedAccessory?.icon || '💍'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Aksesoris</span>
              <h4 className="text-xs font-bold text-stone-200 truncate">
                {equippedAccessory ? equippedAccessory.nameId : 'Kosong'}
              </h4>
              <span className="text-[10px] text-amber-400 font-mono">
                {equippedAccessory?.stats?.speed ? `+${equippedAccessory.stats.speed} SPD` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Items List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Isi Kantong ({inventory.length} Item)
          </div>

          {inventory.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-sm">
              Kantong Anda masih kosong. Cari peti harta karun atau kalahkan monster!
            </div>
          ) : (
            inventory.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  item.equipped
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-stone-900/50 hover:bg-stone-900 border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner ${getRarityBadge(
                      item.rarity
                    )}`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-100 truncate">
                        {item.nameId}
                      </h4>
                      {item.equipped && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                          Digunakan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">
                      {item.descriptionId}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                      {item.stats?.attack && (
                        <span className="text-red-400 font-bold">+{item.stats.attack} ATK</span>
                      )}
                      {item.stats?.defense && (
                        <span className="text-blue-400 font-bold">+{item.stats.defense} DEF</span>
                      )}
                      {item.stats?.hp && (
                        <span className="text-emerald-400 font-bold">+{item.stats.hp} HP</span>
                      )}
                      {item.stats?.speed && (
                        <span className="text-amber-400 font-bold">+{item.stats.speed} SPD</span>
                      )}
                      {item.consumableEffect?.hpRestore && (
                        <span className="text-emerald-400 font-bold">
                          +{item.consumableEffect.hpRestore} HP
                        </span>
                      )}
                      {item.consumableEffect?.mpRestore && (
                        <span className="text-cyan-400 font-bold">
                          +{item.consumableEffect.mpRestore} MP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pl-3">
                  {item.type === 'consumable' ? (
                    <button
                      onClick={() => {
                        soundManager.playPotion();
                        onUseConsumable(item);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs shadow cursor-pointer transition active:scale-95"
                    >
                      Gunakan
                    </button>
                  ) : item.type === 'material' ? (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-semibold text-[11px] flex items-center gap-1 shadow">
                      <span>Bahan</span>
                      <span className="text-[10px] text-amber-400 font-mono">({item.value}G)</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onEquipItem(item)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow cursor-pointer transition active:scale-95 ${
                        item.equipped
                          ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600'
                          : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                      }`}
                    >
                      {item.equipped ? 'Lepas' : 'Pakai'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
