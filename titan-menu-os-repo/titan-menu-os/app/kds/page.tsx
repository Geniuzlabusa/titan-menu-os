'use client';
// app/kds/page.tsx
// TITAN MENU OS — Kitchen Display System (KDS)
// Real-time kanban: Pending → Cooking → Completed

import { useEffect, useState, useCallback } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  ChefHat,
  UtensilsCrossed,
  Timer,
} from 'lucide-react';
import {
  getActiveOrdersForKDS,
  updateOrderStatus,
  subscribeToOrders,
  unsubscribe,
} from '@/utils/supabase';
import type { Order, OrderStatus, RealtimeOrderPayload, RealtimeChannel } from '@/utils/supabase';

// ============================================================
// UTILITIES
// ============================================================

function timeSince(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function isUrgent(dateStr: string): boolean {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60;
  return diff > 10; // > 10 min = urgent
}

// ============================================================
// ORDER CARD
// ============================================================

interface OrderCardProps {
  order: Order;
  onAdvance: (id: string, status: OrderStatus) => Promise<void>;
}

function OrderCard({ order, onAdvance }: OrderCardProps) {
  const [advancing, setAdvancing] = useState(false);
  const urgent = isUrgent(order.created_at);

  async function handleAdvance() {
    setAdvancing(true);
    const nextStatus: OrderStatus = order.status === 'pending' ? 'cooking' : 'completed';
    try {
      await onAdvance(order.id, nextStatus);
    } finally {
      setAdvancing(false);
    }
  }

  const customerName = (order as { customers?: { name?: string } }).customers?.name ?? 'Guest';

  return (
    <div
      className={`relative bg-slate-800/80 backdrop-blur-sm border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 ${
        urgent
          ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
          : order.status === 'pending'
          ? 'border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.08)]'
          : 'border-cyan-500/30 shadow-[0_0_16px_rgba(34,211,238,0.08)]'
      }`}
    >
      {/* Urgent pulse */}
      {urgent && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute" />
          <span className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Table
            </span>
            <span className="text-2xl font-black text-white">#{order.table_number}</span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">{customerName}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <Timer className="w-3 h-3" />
            <span className={urgent ? 'text-red-400 font-bold' : ''}>
              {timeSince(order.created_at)}
            </span>
          </div>
          <p className="text-slate-600 text-xs mt-0.5">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5 border-t border-white/5 pt-3">
        {(order.order_items ?? []).map((oi) => (
          <div key={oi.id} className="flex items-center justify-between text-sm">
            <span className="text-white font-medium">
              {oi.menu_items?.name ?? '—'}
            </span>
            <span className="text-slate-400 font-bold ml-2 shrink-0">×{oi.quantity}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleAdvance}
        disabled={advancing}
        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 ${
          order.status === 'pending'
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-[0_0_16px_rgba(34,211,238,0.3)]'
        }`}
      >
        {advancing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : order.status === 'pending' ? (
          <>
            <Flame className="w-4 h-4" />
            Start Cooking
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Mark Done
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// KANBAN COLUMN
// ============================================================

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  orders: Order[];
  accentClass: string;
  onAdvance: (id: string, status: OrderStatus) => Promise<void>;
  emptyLabel: string;
}

function KanbanColumn({
  title,
  icon,
  orders,
  accentClass,
  onAdvance,
  emptyLabel,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <div className={`flex items-center gap-2 ${accentClass}`}>
          {icon}
          <h2 className="font-bold text-sm uppercase tracking-wider">{title}</h2>
        </div>
        <span className="ml-auto w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400">
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-700 border border-dashed border-slate-700 rounded-2xl">
            <UtensilsCrossed className="w-6 h-6 mb-2" />
            <p className="text-xs">{emptyLabel}</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} onAdvance={onAdvance} />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// KDS STATS BAR
// ============================================================

interface StatsBarProps {
  pending: number;
  cooking: number;
  completedToday: number;
  realtimeStatus: 'connected' | 'disconnected';
}

function StatsBar({ pending, cooking, completedToday, realtimeStatus }: StatsBarProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-slate-800/60 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center gap-1.5">
        {realtimeStatus === 'connected' ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        <span className={`text-xs font-semibold ${realtimeStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
          {realtimeStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      <div className="h-4 w-px bg-white/10" />
      <Stat label="Queued" value={pending} color="text-amber-400" />
      <Stat label="Cooking" value={cooking} color="text-cyan-400" />
      <Stat label="Done Today" value={completedToday} color="text-green-400" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-base font-black ${color}`}>{value}</span>
      <span className="text-slate-500 text-xs">{label}</span>
    </div>
  );
}

// ============================================================
// KDS PAGE
// ============================================================

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected'>('disconnected');

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getActiveOrdersForKDS();
      setOrders(data);
    } catch (err) {
      console.error('[KDS] fetchOrders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time subscription
  useEffect(() => {
    const channel: RealtimeChannel = subscribeToOrders((payload: RealtimeOrderPayload) => {
      const { eventType, new: newOrder } = payload;

      setOrders((prev) => {
        if (eventType === 'INSERT') {
          if (newOrder.status === 'completed' || newOrder.status === 'cancelled') return prev;
          // New order — need to re-fetch to get joined items
          fetchOrders();
          return prev;
        }

        if (eventType === 'UPDATE') {
          if (newOrder.status === 'completed' || newOrder.status === 'cancelled') {
            setCompletedCount((c) => c + 1);
            return prev.filter((o) => o.id !== newOrder.id);
          }
          return prev.map((o) =>
            o.id === newOrder.id ? { ...o, status: newOrder.status } : o
          );
        }

        if (eventType === 'DELETE') {
          return prev.filter((o) => o.id !== payload.old?.id);
        }

        return prev;
      });
    });

    // Status tracking
    channel.on('system', { event: 'SUBSCRIBED' }, () => setRealtimeStatus('connected'));
    channel.on('system', { event: 'CHANNEL_ERROR' }, () => setRealtimeStatus('disconnected'));
    channel.on('system', { event: 'CLOSED' }, () => setRealtimeStatus('disconnected'));

    return () => unsubscribe(channel);
  }, [fetchOrders]);

  const handleAdvance = useCallback(
    async (id: string, status: OrderStatus) => {
      // Optimistic update
      if (status === 'completed') {
        setOrders((prev) => prev.filter((o) => o.id !== id));
        setCompletedCount((c) => c + 1);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
      }
      await updateOrderStatus(id, status);
    },
    []
  );

  const pending = orders.filter((o) => o.status === 'pending');
  const cooking = orders.filter((o) => o.status === 'cooking');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* KDS Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-cyan-500/30 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-white font-black text-base leading-none tracking-tight">
              TITAN KDS
            </h1>
            <p className="text-slate-600 text-xs">Kitchen Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          <div className="text-xs text-slate-500 hidden sm:block">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <StatsBar
        pending={pending.length}
        cooking={cooking.length}
        completedToday={completedCount}
        realtimeStatus={realtimeStatus}
      />

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 overflow-auto">
          <KanbanColumn
            title="Pending"
            icon={<Clock className="w-4 h-4" />}
            orders={pending}
            accentClass="text-amber-400"
            onAdvance={handleAdvance}
            emptyLabel="No pending orders"
          />
          <KanbanColumn
            title="Cooking"
            icon={<Flame className="w-4 h-4" />}
            orders={cooking}
            accentClass="text-cyan-400"
            onAdvance={handleAdvance}
            emptyLabel="Nothing on the pass"
          />
        </div>
      )}
    </div>
  );
}
