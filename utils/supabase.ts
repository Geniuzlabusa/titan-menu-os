// utils/supabase.ts — TITAN MENU OS v2

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
export type { RealtimeChannel };

// ── Types ──────────────────────────────────────────────────────────────────

export interface Customer {
  id: string; phone: string; name: string; created_at: string;
}

export interface NutritionalInfo {
  calories: number; protein: number; carbs: number;
  fat: number; allergens: string[];
}

export interface MenuItem {
  id: string; category: string; name: string;
  description: string | null; price: number;
  image_url: string | null; images: string[];
  is_available: boolean; nutritional_info: NutritionalInfo;
  tags: string[]; portion_size: string | null; serves: number | null;
  is_vegetarian: boolean; is_vegan: boolean; is_alcohol: boolean;
  is_beef: boolean; is_seafood: boolean; is_spicy: boolean;
  created_at: string;
}

export type OrderStatus = 'pending' | 'cooking' | 'completed' | 'cancelled';

export interface Order {
  id: string; table_number: number; customer_id: string;
  total_amount: number; status: OrderStatus; created_at: string;
  customers?: Customer; order_items?: OrderItemWithMenu[];
}

export interface OrderItem {
  id: string; order_id: string; menu_item_id: string;
  quantity: number; subtotal: number; created_at: string;
}

export interface OrderItemWithMenu extends OrderItem { menu_items: MenuItem; }

export type ReviewStatus = 'intercepted' | 'public';
export interface Review {
  id: string; order_id: string; table_number: number;
  rating: 1|2|3|4|5; feedback: string|null;
  status: ReviewStatus; created_at: string;
}

export interface CartItem { menu_item: MenuItem; quantity: number; }
export interface CartState {
  items: CartItem[]; table_number: number; customer: Customer | null;
}

export interface RestaurantSettings {
  social_links: { instagram?:string; facebook?:string; tiktok?:string; whatsapp?:string; };
  restaurant_info: { name:string; tagline:string; wifi_ssid:string; wifi_pass:string; google_maps:string; total_tables:number; };
}

export type DietaryFilter = 'all'|'vegetarian'|'vegan'|'seafood'|'beef'|'alcohol'|'non-alcoholic'|'spicy';

// ── Client ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xytndzkoqriqyzinoxgc.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dG5kemtvcXJpcXl6aW5veGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDMxNjMsImV4cCI6MjA4OTIxOTE2M30.JNzCHhKpeHh4Anu-ct3GrB8YrayfQG7adkRzlpFcua4';

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 20 } } });
  return _client;
}
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getClient() as unknown as Record<string|symbol,unknown>)[prop]; },
});

// ── Customer ───────────────────────────────────────────────────────────────

export async function upsertCustomer(phone: string, name: string): Promise<Customer> {
  const { data, error } = await supabase.from('customers').upsert({ phone, name }, { onConflict: 'phone' }).select().single();
  if (error) throw new Error(`upsertCustomer: ${error.message}`);
  return data as Customer;
}

// ── Menu ───────────────────────────────────────────────────────────────────

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').eq('is_available', true).order('category').order('name');
  if (error) throw new Error(`getMenuItems: ${error.message}`);
  return (data ?? []) as MenuItem[];
}

export async function getAllMenuItemsForStaff(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').order('category').order('name');
  if (error) throw new Error(`getAllMenuItems: ${error.message}`);
  return (data ?? []) as MenuItem[];
}

export async function toggleMenuItemAvailability(id: string, is_available: boolean): Promise<void> {
  const { error } = await supabase.from('menu_items').update({ is_available }).eq('id', id);
  if (error) throw new Error(`toggleAvailability: ${error.message}`);
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  const { data, error } = await supabase.from('restaurant_settings').select('key, value');
  if (error) throw new Error(`getSettings: ${error.message}`);
  const map: Record<string, unknown> = {};
  (data ?? []).forEach((r: { key: string; value: unknown }) => { map[r.key] = r.value; });
  return map as unknown as RestaurantSettings;
}

// ── Orders ─────────────────────────────────────────────────────────────────

export async function createOrder(table_number: number, customer_id: string, items: CartItem[]): Promise<Order> {
  const total_amount = items.reduce((s, i) => s + i.menu_item.price * i.quantity, 0);
  const { data: order, error: oe } = await supabase.from('orders').insert({ table_number, customer_id, total_amount, status: 'pending' }).select().single();
  if (oe) throw new Error(`createOrder: ${oe.message}`);
  const { error: ie } = await supabase.from('order_items').insert(
    items.map(i => ({ order_id: (order as Order).id, menu_item_id: i.menu_item.id, quantity: i.quantity, subtotal: i.menu_item.price * i.quantity }))
  );
  if (ie) throw new Error(`createOrderItems: ${ie.message}`);
  return order as Order;
}

export async function getActiveOrdersForKDS(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*, customers(name,phone), order_items(*, menu_items(name,category))').in('status', ['pending','cooking']).order('created_at', { ascending: true });
  if (error) throw new Error(`getActiveOrdersForKDS: ${error.message}`);
  return (data ?? []) as Order[];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw new Error(`updateOrderStatus: ${error.message}`);
}

// ── Reviews ────────────────────────────────────────────────────────────────

export async function submitReview(order_id: string, table_number: number, rating: number, feedback: string|null): Promise<Review> {
  const status: ReviewStatus = rating <= 3 ? 'intercepted' : 'public';
  const { data, error } = await supabase.from('reviews').insert({ order_id, table_number, rating, feedback, status }).select().single();
  if (error) throw new Error(`submitReview: ${error.message}`);
  return data as Review;
}

export async function getBadReviewsToday(): Promise<Review[]> {
  const start = new Date(); start.setHours(0,0,0,0);
  const { data, error } = await supabase.from('reviews').select('*').lte('rating',3).eq('status','intercepted').gte('created_at', start.toISOString()).order('created_at', { ascending: false });
  if (error) throw new Error(`getBadReviewsToday: ${error.message}`);
  return (data ?? []) as Review[];
}

// ── Realtime ───────────────────────────────────────────────────────────────

export type RealtimeOrderPayload = { eventType:'INSERT'|'UPDATE'|'DELETE'; new: Order; old: Partial<Order>; };

export function subscribeToOrders(cb: (p: RealtimeOrderPayload) => void): RealtimeChannel {
  return supabase.channel('orders-rt').on('postgres_changes', { event:'*', schema:'public', table:'orders' }, p => cb(p as unknown as RealtimeOrderPayload)).subscribe();
}
export function subscribeToMenuItems(cb: (p: { eventType: string; new: MenuItem }) => void): RealtimeChannel {
  return supabase.channel('menu-rt').on('postgres_changes', { event:'UPDATE', schema:'public', table:'menu_items' }, p => cb(p as unknown as { eventType:string; new:MenuItem })).subscribe();
}
export function unsubscribe(channel: RealtimeChannel): void { supabase.removeChannel(channel); }

// ── Utils ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style:'currency', currency }).format(amount);
}
export function groupMenuByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  return items.reduce<Record<string,MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item); return acc;
  }, {});
}
export function applyDietaryFilter(items: MenuItem[], filter: DietaryFilter): MenuItem[] {
  if (filter === 'all') return items;
  if (filter === 'vegetarian') return items.filter(i => i.is_vegetarian);
  if (filter === 'vegan') return items.filter(i => i.is_vegan);
  if (filter === 'seafood') return items.filter(i => i.is_seafood);
  if (filter === 'beef') return items.filter(i => i.is_beef);
  if (filter === 'alcohol') return items.filter(i => i.is_alcohol);
  if (filter === 'non-alcoholic') return items.filter(i => !i.is_alcohol);
  if (filter === 'spicy') return items.filter(i => i.is_spicy);
  return items;
}
export const SERVICE_CHARGE_RATE = 0.1;
export function calculateTotal(subtotal: number) {
  const serviceCharge = subtotal * SERVICE_CHARGE_RATE;
  return { subtotal, serviceCharge, total: subtotal + serviceCharge };
}
