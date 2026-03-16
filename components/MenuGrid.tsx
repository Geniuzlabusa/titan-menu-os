'use client';
// components/MenuGrid.tsx
// TITAN MENU OS — Dynamic menu grid with category navigation and nutrition modal

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Plus,
  Minus,
  Flame,
  AlertTriangle,
  Info,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react';
import { MenuItem, groupMenuByCategory } from '@/utils/supabase';
import { useCart } from '@/context/CartContext';

// ============================================================
// NUTRITIONAL MODAL
// ============================================================

interface NutritionalModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: () => void;
}

function NutritionalModal({ item, onClose, onAddToCart }: NutritionalModalProps) {
  const { state } = useCart();
  const cartItem = state.items.find((i) => i.menu_item.id === item.id);
  const info = item.nutritional_info;

  const macros = [
    { label: 'Protein', value: info.protein, unit: 'g', color: 'bg-cyan-500' },
    { label: 'Carbs', value: info.carbs, unit: 'g', color: 'bg-amber-500' },
    { label: 'Fat', value: info.fat, unit: 'g', color: 'bg-rose-500' },
  ];

  const total = (info.protein ?? 0) + (info.carbs ?? 0) + (info.fat ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-md bg-slate-800 sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-52 w-full">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 448px"
            />
          ) : (
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-slate-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-slate-800/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              {item.category}
            </span>
            <h2 className="text-xl font-bold text-white leading-tight">{item.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Description */}
          {item.description && (
            <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
          )}

          {/* Calories */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-white font-semibold text-sm">
                {info.calories ?? '—'}{' '}
                <span className="text-slate-400 font-normal">kcal per serving</span>
              </p>
            </div>
          </div>

          {/* Macro bars */}
          {total > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Macronutrients
              </p>
              {macros.map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-12">{m.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.color}`}
                      style={{ width: `${Math.min(100, ((m.value ?? 0) / total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium w-12 text-right">
                    {m.value ?? '—'}
                    {m.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Allergens */}
          {info.allergens && info.allergens.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
                  Allergens
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {info.allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium capitalize"
                  >
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1">
              <p className="text-2xl font-bold text-white">
                ${item.price.toFixed(2)}
              </p>
              {cartItem && (
                <p className="text-cyan-400 text-xs font-medium">
                  {cartItem.quantity}× already in cart
                </p>
              )}
            </div>
            <button
              onClick={() => {
                onAddToCart();
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.35)] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MENU ITEM CARD
// ============================================================

interface MenuItemCardProps {
  item: MenuItem;
  onTap: (item: MenuItem) => void;
}

function MenuItemCard({ item, onTap }: MenuItemCardProps) {
  const { addItem, updateQuantity, state } = useCart();
  const cartItem = state.items.find((i) => i.menu_item.id === item.id);
  const qty = cartItem?.quantity ?? 0;

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation();
    addItem(item);
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    updateQuantity(item.id, -1);
  }

  return (
    <div
      onClick={() => onTap(item)}
      className="group relative bg-slate-800/70 backdrop-blur-sm border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.08)] active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-slate-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-800/90 via-transparent to-transparent" />

        {/* Info button */}
        <button
          onClick={(e) => { e.stopPropagation(); onTap(item); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Info className="w-3.5 h-3.5 text-slate-300" />
        </button>

        {/* Allergen dot */}
        {item.nutritional_info?.allergens?.length > 0 && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-amber-500/80 backdrop-blur-sm flex items-center justify-center">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-white font-semibold text-sm leading-tight truncate">
          {item.name}
        </h3>
        {item.nutritional_info?.calories && (
          <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400/60" />
            {item.nutritional_info.calories} kcal
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-cyan-400 font-bold text-base">
            ${item.price.toFixed(2)}
          </span>

          {/* Quantity control / Add button */}
          {qty === 0 ? (
            <button
              onClick={handleAddClick}
              className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center text-slate-900 transition-all shadow-[0_0_12px_rgba(34,211,238,0.3)] active:scale-90"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDecrement}
                className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors active:scale-90"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-white font-bold text-sm w-5 text-center">{qty}</span>
              <button
                onClick={handleAddClick}
                className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center text-slate-900 transition-colors active:scale-90"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface MenuGridProps {
  items: MenuItem[];
}

export default function MenuGrid({ items }: MenuGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const { addItem } = useCart();

  const grouped = useMemo(() => groupMenuByCategory(items), [items]);
  const categories = useMemo(() => ['All', ...Object.keys(grouped)], [grouped]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return items;
    return grouped[activeCategory] ?? [];
  }, [activeCategory, grouped, items]);

  const handleTap = useCallback((item: MenuItem) => {
    setModalItem(item);
  }, []);

  return (
    <>
      {/* Category Pill Nav */}
      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md py-3 -mx-4 px-4 mb-4 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-slate-900 shadow-[0_0_16px_rgba(34,211,238,0.35)]'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span className={`ml-1.5 text-[10px] ${activeCategory === cat ? 'text-slate-900/70' : 'text-slate-600'}`}>
                  {grouped[cat]?.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <ChevronRight className="w-8 h-8 mb-2" />
          <p className="text-sm">Nothing available in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onTap={handleTap} />
          ))}
        </div>
      )}

      {/* Nutritional Modal */}
      {modalItem && (
        <NutritionalModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onAddToCart={() => addItem(modalItem)}
        />
      )}
    </>
  );
}
