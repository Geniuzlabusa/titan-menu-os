'use client';
// app/menu/page.tsx
// TITAN MENU OS — Main Customer Menu Page

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Wifi, WifiOff, ChefHat } from 'lucide-react';
import { getMenuItems, subscribeToMenuItems, unsubscribe } from '@/utils/supabase';
import type { MenuItem, RealtimeChannel } from '@/utils/supabase';
import { useCart } from '@/context/CartContext';
import MenuGrid from '@/components/MenuGrid';
import Cart from '@/components/Cart';

// ============================================================
// SKELETON LOADER
// ============================================================

function MenuSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Category pills */}
      <div className="flex gap-2 pt-3">
        {[80, 100, 70, 90].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-slate-800" style={{ width: w }} />
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-slate-800 overflow-hidden">
            <div className="h-40 bg-slate-700" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-slate-700 rounded-full w-3/4" />
              <div className="h-3 bg-slate-700/60 rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CUMULATIVE BILL BADGE
// ============================================================

interface CumulativeBillProps {
  tableNumber: number;
}

function CumulativeBillBadge({ tableNumber }: CumulativeBillProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      Table #{tableNumber}
    </div>
  );
}

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function MenuPage() {
  const router = useRouter();
  const { state } = useCart();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Guard: redirect to landing if no customer session
  useEffect(() => {
    if (!state.customer || state.table_number === 0) {
      router.replace('/');
    }
  }, [state.customer, state.table_number, router]);

  const fetchMenu = useCallback(async () => {
    try {
      setError(null);
      const data = await getMenuItems();
      setItems(data);
    } catch (err) {
      setError('Failed to load menu. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Real-time subscription for menu availability changes
  useEffect(() => {
    const channel: RealtimeChannel = subscribeToMenuItems(({ new: updatedItem }) => {
      setItems((prev) =>
        updatedItem.is_available
          ? // Re-add or update item
            prev.some((i) => i.id === updatedItem.id)
            ? prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
            : [...prev, updatedItem]
          : // Remove unavailable item
            prev.filter((i) => i.id !== updatedItem.id)
      );
    });

    channel.on('system', { event: 'SUBSCRIBED' }, () => setRealtimeStatus('connected'));
    channel.on('system', { event: 'CHANNEL_ERROR' }, () => setRealtimeStatus('disconnected'));

    return () => unsubscribe(channel);
  }, []);

  if (!state.customer) return null; // Redirecting

  return (
    <main className="min-h-screen bg-slate-900 pb-32">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/4 blur-[100px]" />
      </div>

      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            <span className="text-white font-bold text-sm tracking-tight">
              TITAN<span className="text-cyan-400"> MENU</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Realtime indicator */}
            <div
              className="flex items-center gap-1.5 text-xs"
              title={realtimeStatus === 'connected' ? 'Live updates on' : 'Reconnecting…'}
            >
              {realtimeStatus === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
            {state.table_number > 0 && (
              <CumulativeBillBadge tableNumber={state.table_number} />
            )}
          </div>
        </div>

        {/* Welcome strip */}
        <div className="px-4 pb-2 max-w-lg mx-auto">
          <p className="text-slate-400 text-xs">
            Welcome, <span className="text-cyan-400 font-semibold">{state.customer?.name}</span>
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-2">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchMenu}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs font-medium"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <MenuSkeleton />
        ) : (
          <MenuGrid items={items} />
        )}
      </div>

      {/* Floating Cart */}
      <Cart />
    </main>
  );
}
