'use client';

export const dynamic = 'force-dynamic';
// app/manager/page.tsx
// TITAN MENU OS — Manager Portal: Menu Editor + Review Kill Switch

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  ToggleLeft,
  ToggleRight,
  Star,
  AlertTriangle,
  ChefHat,
  RefreshCw,
  MessageSquare,
  Eye,
  EyeOff,
  TrendingDown,
  Package,
  Clock,
} from 'lucide-react';
import {
  getAllMenuItemsForStaff,
  toggleMenuItemAvailability,
  getBadReviewsToday,
  formatCurrency,
} from '@/utils/supabase';
import type { MenuItem, Review } from '@/utils/supabase';

// ============================================================
// KILL SWITCH METRIC CARD
// ============================================================

interface KillSwitchPanelProps {
  reviews: Review[];
  loading: boolean;
  onRefresh: () => void;
}

function KillSwitchPanel({ reviews, loading, onRefresh }: KillSwitchPanelProps) {
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const alertLevel =
    reviews.length >= 5
      ? 'critical'
      : reviews.length >= 2
      ? 'warning'
      : 'normal';

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${
        alertLevel === 'critical'
          ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
          : alertLevel === 'warning'
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-slate-800/70 border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown
            className={`w-5 h-5 ${alertLevel === 'critical' ? 'text-red-400' : alertLevel === 'warning' ? 'text-amber-400' : 'text-slate-500'}`}
          />
          <h2 className="font-bold text-white text-sm">Bad Reviews Today</h2>
          {alertLevel === 'critical' && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold animate-pulse">
              ALERT
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p
            className={`text-3xl font-black ${alertLevel === 'critical' ? 'text-red-400' : alertLevel === 'warning' ? 'text-amber-400' : 'text-slate-400'}`}
          >
            {reviews.length}
          </p>
          <p className="text-slate-500 text-xs">Intercepted</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-white">
            {avgRating ? avgRating.toFixed(1) : '—'}
          </p>
          <p className="text-slate-500 text-xs">Avg Rating</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-green-400">
            {reviews.filter((r) => r.feedback).length}
          </p>
          <p className="text-slate-500 text-xs">With Notes</p>
        </div>
      </div>

      {/* Latest reviews */}
      {reviews.length > 0 && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {reviews.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-xl bg-slate-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs">Table #{r.table_number}</span>
                  <span className="text-slate-700 text-xs">
                    {new Date(r.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              {r.feedback && (
                <p className="text-slate-400 text-xs flex items-start gap-1.5">
                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-slate-600" />
                  {r.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {reviews.length === 0 && !loading && (
        <p className="text-center text-slate-600 text-sm py-4">
          ✅ No bad reviews intercepted today
        </p>
      )}
    </div>
  );
}

// ============================================================
// MENU ITEM ROW
// ============================================================

interface MenuItemRowProps {
  item: MenuItem;
  onToggle: (id: string, available: boolean) => Promise<void>;
}

function MenuItemRow({ item, onToggle }: MenuItemRowProps) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggle(item.id, !item.is_available);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        item.is_available
          ? 'bg-slate-800/50 border-white/5'
          : 'bg-slate-900/30 border-white/3 opacity-60'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-700">
        {item.image_url && (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-semibold truncate">{item.name}</p>
          {!item.is_available && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-medium shrink-0">
              OFF
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-slate-500 text-xs">{item.category}</span>
          <span className="text-slate-700">·</span>
          <span className="text-cyan-400 text-xs font-semibold">
            {formatCurrency(item.price)}
          </span>
          {item.nutritional_info?.calories && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-slate-600 text-xs">
                {item.nutritional_info.calories} kcal
              </span>
            </>
          )}
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        title={item.is_available ? 'Hide from menu (Kill Switch)' : 'Show on menu'}
        className="shrink-0 p-1 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        {toggling ? (
          <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
        ) : item.is_available ? (
          <ToggleRight className="w-7 h-7 text-cyan-400" />
        ) : (
          <ToggleLeft className="w-7 h-7 text-slate-600" />
        )}
      </button>
    </div>
  );
}

// ============================================================
// MANAGER PAGE
// ============================================================

type Tab = 'menu' | 'reviews';

export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const data = await getAllMenuItemsForStaff();
      setMenuItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const data = await getBadReviewsToday();
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    fetchReviews();
  }, [fetchMenu, fetchReviews]);

  const handleToggle = useCallback(
    async (id: string, available: boolean) => {
      // Optimistic update
      setMenuItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_available: available } : i))
      );
      await toggleMenuItemAvailability(id, available);
    },
    []
  );

  const categories = ['All', ...Array.from(new Set(menuItems.map((i) => i.category)))];
  const filteredItems =
    filterCategory === 'All' ? menuItems : menuItems.filter((i) => i.category === filterCategory);

  const availableCount = menuItems.filter((i) => i.is_available).length;
  const hiddenCount = menuItems.filter((i) => !i.is_available).length;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-2xl mx-auto">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/4 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-cyan-500/30 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-white font-black text-sm tracking-tight">TITAN MANAGER</h1>
            <p className="text-slate-600 text-xs">Restaurant Control Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="w-3 h-3" />
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </header>

      {/* Quick Stats */}
      <div className="relative grid grid-cols-3 gap-3 px-4 py-3">
        <div className="p-3 rounded-xl bg-slate-800/70 border border-white/8 text-center">
          <p className="text-xl font-black text-cyan-400">{availableCount}</p>
          <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" /> Live
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-800/70 border border-white/8 text-center">
          <p className="text-xl font-black text-slate-500">{hiddenCount}</p>
          <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
            <EyeOff className="w-3 h-3" /> Hidden
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-800/70 border border-white/8 text-center">
          <p className={`text-xl font-black ${reviews.length >= 3 ? 'text-red-400' : 'text-green-400'}`}>
            {reviews.length}
          </p>
          <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Flags
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="relative flex gap-1 px-4 pb-2 border-b border-white/5">
        {[
          { key: 'menu' as Tab, label: 'Menu Editor', icon: <Package className="w-3.5 h-3.5" /> },
          {
            key: 'reviews' as Tab,
            label: 'Review Shield',
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            badge: reviews.length > 0 ? reviews.length : undefined,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-cyan-500 text-slate-900 shadow-[0_0_16px_rgba(34,211,238,0.3)]'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge && (
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key ? 'bg-slate-900/30 text-slate-900' : 'bg-red-500 text-white'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="relative flex-1 overflow-y-auto px-4 py-4">
        {/* MENU EDITOR TAB */}
        {tab === 'menu' && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filterCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-500 border border-white/5 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Kill switch info */}
            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/8 flex items-start gap-2">
              <ToggleRight className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <p className="text-slate-400 text-xs">
                Toggle the switch to instantly show or hide an item from the customer menu. Changes apply in real-time.
              </p>
            </div>

            {menuLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <MenuItemRow key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* REVIEW SHIELD TAB */}
        {tab === 'reviews' && (
          <KillSwitchPanel
            reviews={reviews}
            loading={reviewsLoading}
            onRefresh={fetchReviews}
          />
        )}
      </div>
    </div>
  );
}
