// utils/supabase.ts
// TITAN MENU OS — Supabase client, typed queries, and real-time hooks

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
export type { RealtimeChannel };

// ============================================================
// DATABASE TYPES
// ============================================================

export interface Customer {
  id: string;
  phone: string;
  name: string;
  created_at: string;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  nutritional_info: NutritionalInfo;
  created_at: string;
}

export type OrderStatus = 'pending' | 'cooking' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  table_number: number;
  customer_id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  customers?: Customer;
  order_items?: OrderItemWithMenu[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface OrderItemWithMenu extends OrderItem {
  menu_items: MenuItem;
}

export type ReviewStatus = 'intercepted' | 'public';

export interface Review {
  id: string;
  order_id: string;
  table_number: number;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback: string | null;
  status: ReviewStatus;
  created_at: string;
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  table_number: number;
  customer: Customer | null;
}

// ============================================================
// SUPABASE CLIENT (Lazy singleton — safe during Next.js build)
// Real values embedded as fallbacks so the build never crashes
// even when Netlify env vars are not injected at prerender time.
// ============================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://xytndzkoqriqyzinoxgc.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dG5kemtvcXJpcXl6aW5veGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDMxNjMsImV4cCI6MjA4OTIxOTE2M30.JNzCHhKpeHh4Anu-ct3GrB8YrayfQG7adkRzlpFcua4';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ============================================================
// CUSTOMER QUERIES
// ============================================================

export async function upsertCustomer(
  phone: string,
  name: string
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .upsert({ phone, name }, { onConflict: 'phone' })
    .select()
    .single();
  if (error) throw new Error(`[TITAN] upsertCustomer: ${error.message}`);
  return data as Customer;
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw new Error(`[TITAN] getCustomerByPhone: ${error.message}`);
  return data as Customer | null;
}

// ============================================================
// MENU ITEM QUERIES
// ============================================================

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .order('category')
    .order('name');
  if (error) throw new Error(`[TITAN] getMenuItems: ${error.message}`);
  return (data ?? []) as MenuItem[];
}

export async function getAllMenuItemsForStaff(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category')
    .order('name');
  if (error) throw new Error(`[TITAN] getAllMenuItems: ${error.message}`);
  return (data ?? []) as MenuItem[];
}

export async function toggleMenuItemAvailability(
  id: string,
  is_available: boolean
): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available })
    .eq('id', id);
  if (error) throw new Error(`[TITAN] toggleAvailability: ${error.message}`);
}

export async function upsertMenuItem(
  item: Omit<MenuItem, 'id' | 'created_at'> & { id?: string }
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(item)
    .select()
    .single();
  if (error) throw new Error(`[TITAN] upsertMenuItem: ${error.message}`);
  return data as MenuItem;
}

// ============================================================
// ORDER QUERIES
// ============================================================

export async function createOrder(
  table_number: number,
  customer_id: string,
  items: CartItem[]
): Promise<Order> {
  const total_amount = items.reduce(
    (sum, i) => sum + i.menu_item.price * i.quantity,
    0
  );
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ table_number, customer_id, total_amount, status: 'pending' })
    .select()
    .single();
  if (orderError) throw new Error(`[TITAN] createOrder: ${orderError.message}`);

  const orderItems = items.map((i) => ({
    order_id: (order as Order).id,
    menu_item_id: i.menu_item.id,
    quantity: i.quantity,
    subtotal: i.menu_item.price * i.quantity,
  }));
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw new Error(`[TITAN] createOrderItems: ${itemsError.message}`);
  return order as Order;
}

export async function getOrdersByTable(table_number: number): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(*))')
    .eq('table_number', table_number)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[TITAN] getOrdersByTable: ${error.message}`);
  return (data ?? []) as Order[];
}

export async function getCumulativeBillForTable(table_number: number): Promise<number> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('table_number', table_number)
    .in('status', ['pending', 'cooking', 'completed']);
  if (error) throw new Error(`[TITAN] getCumulativeBill: ${error.message}`);
  return (data ?? []).reduce((sum: number, o: { total_amount: number }) => sum + o.total_amount, 0);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);
  if (error) throw new Error(`[TITAN] updateOrderStatus: ${error.message}`);
}

export async function getActiveOrdersForKDS(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(name, phone), order_items(*, menu_items(name, category))')
    .in('status', ['pending', 'cooking'])
    .order('created_at', { ascending: true });
  if (error) throw new Error(`[TITAN] getActiveOrdersForKDS: ${error.message}`);
  return (data ?? []) as Order[];
}

// ============================================================
// REVIEW QUERIES
// ============================================================

export async function submitReview(
  order_id: string,
  table_number: number,
  rating: number,
  feedback: string | null
): Promise<Review> {
  const status: ReviewStatus = rating <= 3 ? 'intercepted' : 'public';
  const { data, error } = await supabase
    .from('reviews')
    .insert({ order_id, table_number, rating, feedback, status })
    .select()
    .single();
  if (error) throw new Error(`[TITAN] submitReview: ${error.message}`);
  return data as Review;
}

export async function getBadReviewsToday(): Promise<Review[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .lte('rating', 3)
    .eq('status', 'intercepted')
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[TITAN] getBadReviewsToday: ${error.message}`);
  return (data ?? []) as Review[];
}

// ============================================================
// REAL-TIME SUBSCRIPTION HELPERS
// ============================================================

export type RealtimeOrderPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Order;
  old: Partial<Order>;
};

export function subscribeToOrders(
  callback: (payload: RealtimeOrderPayload) => void
): RealtimeChannel {
  return supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => callback(payload as unknown as RealtimeOrderPayload)
    )
    .subscribe();
}

export function subscribeToMenuItems(
  callback: (payload: { eventType: string; new: MenuItem }) => void
): RealtimeChannel {
  return supabase
    .channel('menu-realtime')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'menu_items' },
      (payload) => callback(payload as unknown as { eventType: string; new: MenuItem })
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// ============================================================
// UTILITY
// ============================================================

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function groupMenuByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  return items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export const SERVICE_CHARGE_RATE = 0.1;

export function calculateTotal(subtotal: number): {
  subtotal: number;
  serviceCharge: number;
  total: number;
} {
  const serviceCharge = subtotal * SERVICE_CHARGE_RATE;
  return { subtotal, serviceCharge, total: subtotal + serviceCharge };
}
