import React, { useState } from 'react';
import { Item, CharacterClass } from '../types/game';
import { SHOPS, ShopId, ShopItem } from '../game/shopData';
import { X, Coins, ShoppingBag, DollarSign, Anvil, Sparkles, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { soundManager } from '../game/audio';

interface ShopModalProps {
  isOpen: boolean;
  initialShopId?: ShopId;
  playerGold: number;
  playerLevel: number;
  playerClass: CharacterClass;
  inventory: Item[];
  onClose: () => void;
  onBuyItem: (item: Item, totalCost: number, quantity: number) => void;
  onSellItem: (item: Item, sellPrice: number) => void;
  onEnhanceItem: (item: Item, cost: number, upgradedItem: Item) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  initialShopId = 'blacksmith',
  playerGold,
  playerLevel,
  playerClass,
  inventory,
  onClose,
  onBuyItem,
  onSellItem,
  onEnhanceItem,
}) => {
  const [activeShopId, setActiveShopId] = useState<ShopId>(initialShopId);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'enhance'>('buy');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'weapon' | 'armor' | 'accessory' | 'consumable'>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedEnhanceItemId, setSelectedEnhanceItemId] = useState<string | null>(null);
  const [enhanceSuccessMsg, setEnhanceSuccessMsg] = useState<string | null>(null);

  // Sync shop ID when opened with a specific one
  React.useEffect(() => {
    if (initialShopId) {
      setActiveShopId(initialShopId);
    }
  }, [initialShopId]);

  if (!isOpen) return null;

  const currentShop = SHOPS[activeShopId] || SHOPS.blacksmith;

  // Filter items in Buy tab
  const filteredShopItems = currentShop.items.filter((entry) => {
    if (categoryFilter === 'all') return true;
    return entry.item.type === categoryFilter;
  });

  const getQuantity = (id: string) => quantities[id] || 1;

  const setQuantity = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(20, qty)) }));
  };

  const getRarityBadge = (rarity: Item['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return { label: 'Legendaris', color: 'bg-amber-950 text-amber-300 border-amber-500' };
      case 'epic':
        return { label: 'Epik', color: 'bg-purple-950 text-purple-300 border-purple-500' };
      case 'rare':
        return { label: 'Langka', color: 'bg-cyan-950 text-cyan-300 border-cyan-500' };
      default:
        return { label: 'Biasa', color: 'bg-stone-800 text-stone-300 border-stone-600' };
    }
  };

  // Enhance calculation
  const equippedEnhanceableItems = inventory.filter(
    (it) => it.equipped && (it.type === 'weapon' || it.type === 'armor')
  );

  const selectedEnhanceItem =
    equippedEnhanceableItems.find((it) => it.id === selectedEnhanceItemId) ||
    equippedEnhanceableItems[0] ||
    null;

  const currentEnhanceLvl = selectedEnhanceItem?.enhancementLevel || 0;
  const enhanceCost = 45 * (currentEnhanceLvl + 1);

  const calculateUpgradedItem = (item: Item): Item => {
    const nextLvl = (item.enhancementLevel || 0) + 1;
    const stats = { ...(item.stats || {}) };

    if (item.type === 'weapon') {
      const baseAtk = stats.attack || 8;
      stats.attack = baseAtk + Math.round(4 + nextLvl * 1.5);
    } else if (item.type === 'armor') {
      const baseDef = stats.defense || 5;
      stats.defense = baseDef + Math.round(3 + nextLvl * 1.2);
      if (stats.hp) stats.hp += 20;
    }

    return {
      ...item,
      nameId: `${item.nameId.replace(/\s\(\+\d+\)/, '')} (+${nextLvl})`,
      enhancementLevel: nextLvl,
      stats,
      value: Math.round(item.value * 1.35),
    };
  };

  const handleTriggerEnhance = () => {
    if (!selectedEnhanceItem) return;
    if (playerGold < enhanceCost) {
      soundManager.playDash();
      return;
    }
    const upgraded = calculateUpgradedItem(selectedEnhanceItem);
    soundManager.playChestOpen();
    onEnhanceItem(selectedEnhanceItem, enhanceCost, upgraded);
    setEnhanceSuccessMsg(`Berhasil Menempa! ${upgraded.nameId} (+${upgraded.enhancementLevel})`);
    setTimeout(() => setEnhanceSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-sm font-sans pointer-events-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-stone-950 border-2 border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100 animate-fade-in">
        
        {/* Top Header: Shop & NPC identity + Gold */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5 bg-stone-900/90 border-b border-stone-800">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-600/30 to-amber-950/80 border border-amber-500/60 flex items-center justify-center text-3xl shadow-inner shrink-0">
              {currentShop.avatarIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-amber-300 tracking-wide">
                  {currentShop.title}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-medium">
                  {currentShop.npcName}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium line-clamp-1">
                {currentShop.location} &bull; {currentShop.npcRole}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Player Gold Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-stone-950 border border-amber-500/50 text-amber-300 shadow-inner">
              <Coins className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="font-mono font-bold text-sm md:text-base">
                {playerGold.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-amber-400 font-medium">Gold</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700 transition cursor-pointer"
              title="Tutup Toko (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Shop Switcher Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-900/60 border-b border-stone-800/80 overflow-x-auto scrollbar-none text-xs">
          <span className="text-stone-400 font-semibold uppercase tracking-wider text-[10px] shrink-0 mr-1">
            Pilih Toko:
          </span>
          {(Object.keys(SHOPS) as ShopId[]).map((sId) => {
            const shop = SHOPS[sId];
            const isSelected = sId === activeShopId;
            return (
              <button
                key={sId}
                onClick={() => {
                  soundManager.playChestOpen();
                  setActiveShopId(sId);
                  if (activeTab === 'enhance' && !shop.canEnhance) {
                    setActiveTab('buy');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium border transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow'
                    : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 border-stone-700/80'
                }`}
              >
                <span>{shop.avatarIcon}</span>
                <span>{shop.npcName}</span>
              </button>
            );
          })}
        </div>

        {/* NPC Greeting Speech Bubble */}
        <div className="px-4 py-2.5 bg-amber-950/20 border-b border-amber-900/30 flex items-center gap-2.5 text-xs text-amber-200/90 italic">
          <span className="text-sm shrink-0">💬</span>
          <span className="line-clamp-2">&ldquo;{currentShop.greeting}&rdquo;</span>
        </div>

        {/* Mode Navigation Tabs (Beli / Jual / Tempa) */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs md:text-sm border transition cursor-pointer ${
                activeTab === 'buy'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-stone-950 border-amber-300 shadow'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Beli Barang ({currentShop.items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sell')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs md:text-sm border transition cursor-pointer ${
                activeTab === 'sell'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Jual Milikmu ({inventory.length})</span>
            </button>

            {currentShop.canEnhance && (
              <button
                onClick={() => setActiveTab('enhance')}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs md:text-sm border transition cursor-pointer ${
                  activeTab === 'enhance'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-400 shadow'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
                }`}
              >
                <Anvil className="w-4 h-4" />
                <span>Tempa & Upgrade</span>
              </button>
            )}
          </div>

          {/* Category Filter on Buy Tab */}
          {activeTab === 'buy' && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'weapon', label: 'Senjata' },
                  { id: 'armor', label: 'Zirah' },
                  { id: 'accessory', label: 'Aksesori' },
                  { id: 'consumable', label: 'Ramuan' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 scrollbar-thin scrollbar-thumb-stone-800">
          
          {/* ==================================================== */}
          {/* TAB 1: BELI (BUY ITEMS) */}
          {/* ==================================================== */}
          {activeTab === 'buy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredShopItems.length === 0 ? (
                <div className="col-span-full py-12 text-center text-stone-500 text-sm">
                  Tidak ada barang untuk kategori ini di toko ini.
                </div>
              ) : (
                filteredShopItems.map((entry) => {
                  const it = entry.item;
                  const qty = it.type === 'consumable' ? getQuantity(it.id) : 1;
                  const totalCost = entry.price * qty;
                  const canAfford = playerGold >= totalCost;
                  const levelSatisfied = !entry.requiredLevel || playerLevel >= entry.requiredLevel;
                  const rarityStyle = getRarityBadge(it.rarity);
                  const isWrongClass = entry.forClass && entry.forClass !== 'all' && entry.forClass !== playerClass;

                  return (
                    <div
                      key={it.id}
                      className="flex flex-col justify-between p-3.5 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 transition shadow-sm group"
                    >
                      <div>
                        {/* Top line: Icon, Name, Rarity badge */}
                        <div className="flex items-start justify-between gap-2.5 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-stone-950 border border-stone-700 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition">
                              {it.icon}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-stone-100 group-hover:text-amber-300 transition">
                                {it.nameId}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-[10px] px-2 py-0.2 rounded-md font-semibold border ${rarityStyle.color}`}
                                >
                                  {rarityStyle.label}
                                </span>
                                {entry.tag && (
                                  <span className="text-[10px] text-stone-400 font-medium">
                                    &bull; {entry.tag}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price Tag */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-950 border border-amber-500/30 text-amber-300 shrink-0">
                            <Coins className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="font-mono font-bold text-xs">
                              {totalCost.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-stone-400 line-clamp-2 my-1.5">
                          {it.descriptionId}
                        </p>

                        {/* Stat Pills */}
                        <div className="flex flex-wrap gap-1.5 my-2 text-[11px]">
                          {it.stats?.attack && (
                            <span className="px-2 py-0.5 rounded-md bg-red-950/60 text-red-300 border border-red-900/60 font-medium">
                              ⚔️ Serangan +{it.stats.attack}
                            </span>
                          )}
                          {it.stats?.defense && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-900/60 font-medium">
                              🛡️ Pertahanan +{it.stats.defense}
                            </span>
                          )}
                          {it.stats?.hp && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-900/60 font-medium">
                              ❤️ HP +{it.stats.hp}
                            </span>
                          )}
                          {it.stats?.mp && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-900/60 font-medium">
                              💧 MP +{it.stats.mp}
                            </span>
                          )}
                          {it.stats?.speed && (
                            <span className="px-2 py-0.5 rounded-md bg-teal-950/60 text-teal-300 border border-teal-900/60 font-medium">
                              ⚡ Lari +{it.stats.speed}
                            </span>
                          )}
                          {it.consumableEffect?.hpRestore && (
                            <span className="px-2 py-0.5 rounded-md bg-green-950/60 text-green-300 border border-green-900/60 font-medium">
                              ❤️ Pulihkan {it.consumableEffect.hpRestore} HP
                            </span>
                          )}
                          {it.consumableEffect?.mpRestore && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-300 border border-sky-900/60 font-medium">
                              💧 Pulihkan {it.consumableEffect.mpRestore} MP
                            </span>
                          )}
                        </div>

                        {/* Warnings (Level or Class) */}
                        {entry.requiredLevel && playerLevel < entry.requiredLevel && (
                          <div className="text-[11px] text-amber-400 flex items-center gap-1 my-1 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Membutuhkan Karakter Level {entry.requiredLevel}</span>
                          </div>
                        )}
                        {isWrongClass && (
                          <div className="text-[11px] text-stone-400 flex items-center gap-1 my-1">
                            <span>Dirancang khusus untuk role {entry.tag}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom action row */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-800/80 mt-2">
                        {/* Quantity picker for consumables */}
                        {it.type === 'consumable' ? (
                          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                            {[1, 5, 10].map((count) => (
                              <button
                                key={count}
                                onClick={() => setQuantity(it.id, count)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                                  qty === count
                                    ? 'bg-amber-500 text-stone-950'
                                    : 'text-stone-400 hover:text-white'
                                }`}
                              >
                                {count}x
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-stone-500 font-mono">1 Buah</div>
                        )}

                        {/* Buy Button */}
                        <button
                          disabled={!canAfford || !levelSatisfied}
                          onClick={() => {
                            soundManager.playChestOpen();
                            onBuyItem(it, totalCost, qty);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition cursor-pointer ${
                            !canAfford
                              ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                              : !levelSatisfied
                              ? 'bg-stone-800 text-amber-500 border border-amber-900 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-stone-950 border border-amber-300 shadow hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>
                            {!canAfford ? 'Gold Kurang' : !levelSatisfied ? 'Level Rendah' : 'Beli Sekarang'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: JUAL (SELL INVENTORY) */}
          {/* ==================================================== */}
          {activeTab === 'sell' && (
            <div>
              <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-300 flex items-center justify-between">
                <span>Jual perlengkapan atau rampasan monster yang tidak digunakan untuk mendapatkan Gold tambahan.</span>
                <span className="font-medium text-stone-400">Harga Jual: ~60% Nilai Asli</span>
              </div>

              {inventory.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-sm">
                  Tas ranselmu kosong. Jelajahi dunia dan kalahkan monster untuk mendapatkan item!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {inventory.map((it, idx) => {
                    const sellPrice = Math.max(5, Math.round(it.value * 0.6));
                    const rarityStyle = getRarityBadge(it.rarity);

                    return (
                      <div
                        key={`${it.id}-${idx}`}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-emerald-500/40 transition shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-stone-950 border border-stone-700 flex items-center justify-center text-2xl shrink-0">
                            {it.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-stone-100">{it.nameId}</h4>
                              {it.equipped && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                                  Dipakai
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-md font-semibold border ${rarityStyle.color}`}
                              >
                                {rarityStyle.label}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {it.type === 'weapon'
                                  ? `⚔️ +${it.stats?.attack || 0}`
                                  : it.type === 'armor'
                                  ? `🛡️ +${it.stats?.defense || 0}`
                                  : it.type === 'consumable'
                                  ? '🧪 Ramuan'
                                  : '💍 Aksesori'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-stone-400 block">Dapat:</span>
                            <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-xs">
                              <Coins className="w-3.5 h-3.5 text-yellow-400" />
                              <span>+{sellPrice}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              soundManager.playChestOpen();
                              onSellItem(it, sellPrice);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition cursor-pointer shadow active:scale-95"
                          >
                            Jual
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: TEMPA & UPGRADE (BLACKSMITH ONLY) */}
          {/* ==================================================== */}
          {activeTab === 'enhance' && currentShop.canEnhance && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-950/40 to-amber-950/30 border border-orange-800/40 text-xs text-orange-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                    <Anvil className="w-4 h-4 text-orange-400" />
                    Bengkel Tempa & Penajaman Senjata Master Torvald
                  </h4>
                  <p className="text-stone-300 mt-0.5">
                    Tingkatkan kekuatan serangan senjata atau pertahanan zirah yang sedang kamu pakai (+1, +2, +3...)!
                  </p>
                </div>
              </div>

              {enhanceSuccessMsg && (
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold flex items-center gap-2 animate-bounce">
                  <Sparkles className="w-4 h-4" />
                  <span>{enhanceSuccessMsg}</span>
                </div>
              )}

              {equippedEnhanceableItems.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-sm">
                  Tidak ada senjata atau zirah yang sedang dipakai. Pakai perlengkapanmu terlebih dahulu di menu Tas!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Selector of equipped items */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      Pilih Senjata / Zirah yang Dipakai:
                    </span>
                    {equippedEnhanceableItems.map((it) => {
                      const isSelected = selectedEnhanceItem?.id === it.id;
                      const lvl = it.enhancementLevel || 0;
                      return (
                        <button
                          key={it.id}
                          onClick={() => {
                            soundManager.playChestOpen();
                            setSelectedEnhanceItemId(it.id);
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{it.icon}</span>
                            <div>
                              <div className="font-bold text-sm text-stone-100">{it.nameId}</div>
                              <div className="text-xs text-amber-400 font-mono">
                                Tingkat Tempa: +{lvl}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-stone-400 font-mono">
                            {it.type === 'weapon'
                              ? `⚔️ ${it.stats?.attack || 0}`
                              : `🛡️ ${it.stats?.defense || 0}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Upgrade Preview Card */}
                  {selectedEnhanceItem && (
                    <div className="p-4 rounded-3xl bg-stone-900/90 border-2 border-orange-500/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                          <div>
                            <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">
                              Hasil Penempaan
                            </span>
                            <h3 className="text-base font-black text-amber-300 mt-0.5">
                              {selectedEnhanceItem.nameId}
                            </h3>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-orange-950/60 border border-orange-500 flex items-center justify-center text-3xl">
                            {selectedEnhanceItem.icon}
                          </div>
                        </div>

                        {/* Stat Comparison Before -> After */}
                        <div className="py-4 space-y-2.5">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                            <span className="text-stone-400">Tingkat Penempaan:</span>
                            <div className="flex items-center gap-2 font-mono font-bold">
                              <span className="text-stone-400">+{currentEnhanceLvl}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300 text-sm">+{currentEnhanceLvl + 1}</span>
                            </div>
                          </div>

                          {selectedEnhanceItem.type === 'weapon' && (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                              <span className="text-red-300 flex items-center gap-1">
                                ⚔️ Daya Serang:
                              </span>
                              <div className="flex items-center gap-2 font-mono font-bold">
                                <span className="text-stone-400">
                                  {selectedEnhanceItem.stats?.attack || 8}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-red-400" />
                                <span className="text-red-400 text-sm">
                                  {(selectedEnhanceItem.stats?.attack || 8) +
                                    Math.round(4 + (currentEnhanceLvl + 1) * 1.5)}
                                </span>
                              </div>
                            </div>
                          )}

                          {selectedEnhanceItem.type === 'armor' && (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                              <span className="text-blue-300 flex items-center gap-1">
                                🛡️ Pertahanan:
                              </span>
                              <div className="flex items-center gap-2 font-mono font-bold">
                                <span className="text-stone-400">
                                  {selectedEnhanceItem.stats?.defense || 5}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-blue-400 text-sm">
                                  {(selectedEnhanceItem.stats?.defense || 5) +
                                    Math.round(3 + (currentEnhanceLvl + 1) * 1.2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Forge Action Button */}
                      <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold text-sm">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <span>Biaya: {enhanceCost} Gold</span>
                        </div>

                        <button
                          disabled={playerGold < enhanceCost}
                          onClick={handleTriggerEnhance}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
                            playerGold < enhanceCost
                              ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                              : 'bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-stone-950 border border-yellow-300 shadow hover:scale-105 active:scale-95'
                          }`}
                        >
                          <Anvil className="w-4 h-4" />
                          <span>{playerGold < enhanceCost ? 'Gold Kurang' : 'Tempa Sekarang!'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Info */}
        <div className="px-5 py-3 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Kunjungi NPC penjual di sekitar desa atau pantai untuk berbelanja kapan saja!</span>
          </div>
          <span className="font-mono text-stone-500 hidden sm:inline">Tekan ESC untuk Menutup</span>
        </div>

      </div>
    </div>
  );
};
