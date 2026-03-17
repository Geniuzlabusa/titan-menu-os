// utils/supabase.ts — TITAN MENU OS v3 (Fusion88 SaaS Edition)
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
export type { RealtimeChannel };

// ── Types ──────────────────────────────────────────────────────────────────
export interface Customer { id:string; phone:string; name:string; created_at:string; }
export interface NutritionalInfo { calories:number; protein:number; carbs:number; fat:number; allergens:string[]; }
export interface MenuItem {
  id:string; category:string; name:string; description:string|null; price:number;
  image_url:string|null; images:string[]; is_available:boolean; nutritional_info:NutritionalInfo;
  tags:string[]; portion_size:string|null; serves:number|null;
  is_vegetarian:boolean; is_vegan:boolean; is_alcohol:boolean;
  is_beef:boolean; is_seafood:boolean; is_spicy:boolean; created_at:string;
}
export type OrderStatus = 'pending'|'cooking'|'completed'|'cancelled';
export interface Order {
  id:string; table_number:number; customer_id:string; total_amount:number;
  status:OrderStatus; created_at:string;
  customers?:Customer; order_items?:OrderItemWithMenu[];
}
export interface OrderItem { id:string; order_id:string; menu_item_id:string; quantity:number; subtotal:number; created_at:string; }
export interface OrderItemWithMenu extends OrderItem { menu_items:MenuItem; }
export type ReviewStatus = 'intercepted'|'public';
export interface Review { id:string; order_id:string; table_number:number; rating:1|2|3|4|5; feedback:string|null; status:ReviewStatus; created_at:string; }
export interface CartItem { menu_item:MenuItem; quantity:number; }
export interface CartState { items:CartItem[]; table_number:number; customer:Customer|null; active_order_id:string|null; }
export interface OrderSession { id:string; customer_id:string; table_number:number; order_id:string|null; is_active:boolean; created_at:string; }
export interface AdminUser { id:string; email:string; name:string; role:'superadmin'|'admin'|'manager'|'kitchen'; pin:string|null; is_active:boolean; }
export interface Theme {
  primary_color:string; primary_dark:string; accent_color:string;
  bg_color:string; panel_color:string; text_color:string;
  font_display:string; font_body:string; border_radius:string;
  logo_url:string; hero_image_url:string; favicon_url:string;
}
export interface RestaurantInfo {
  name:string; tagline:string; description:string; address:string;
  phone:string; email:string; wifi_ssid:string; wifi_pass:string;
  google_maps:string; total_tables:number; currency:string; currency_symbol:string; opening_hours:string;
}
export interface SocialLinks { instagram?:string; facebook?:string; tiktok?:string; whatsapp?:string; }
export interface RestaurantSettings { restaurant_info:RestaurantInfo; social_links:SocialLinks; theme:Theme; }
export type DietaryFilter = 'all'|'vegetarian'|'vegan'|'seafood'|'beef'|'alcohol'|'non-alcoholic'|'spicy';

// ── Client ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xytndzkoqriqyzinoxgc.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dG5kemtvcXJpcXl6aW5veGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDMxNjMsImV4cCI6MjA4OTIxOTE2M30.JNzCHhKpeHh4Anu-ct3GrB8YrayfQG7adkRzlpFcua4';
let _client:SupabaseClient|null=null;
export function getSupabaseClient():SupabaseClient { return getClient(); }
function getClient():SupabaseClient {
  if(!_client) _client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{realtime:{params:{eventsPerSecond:20}}});
  return _client;
}
export const supabase:SupabaseClient = new Proxy({}as SupabaseClient,{get(_t,p){return(getClient()as unknown as Record<string|symbol,unknown>)[p];}});

// ── Settings ───────────────────────────────────────────────────────────────
export async function getRestaurantSettings():Promise<RestaurantSettings> {
  const {data,error}=await supabase.from('restaurant_settings').select('key,value');
  if(error) throw new Error(`getSettings:${error.message}`);
  const map:Record<string,unknown>={};
  (data??[]).forEach((r:{key:string;value:unknown})=>{map[r.key]=r.value;});
  return map as unknown as RestaurantSettings;
}
export async function updateRestaurantSettings(key:string,value:unknown):Promise<void> {
  const {error}=await supabase.from('restaurant_settings').upsert({key,value,updated_at:new Date().toISOString()},{onConflict:'key'});
  if(error) throw new Error(`updateSettings:${error.message}`);
}

// ── Customer ───────────────────────────────────────────────────────────────
export async function upsertCustomer(phone:string,name:string):Promise<Customer> {
  const {data,error}=await supabase.from('customers').upsert({phone,name},{onConflict:'phone'}).select().single();
  if(error) throw new Error(`upsertCustomer:${error.message}`);
  return data as Customer;
}

// ── Menu ───────────────────────────────────────────────────────────────────
export async function getMenuItems():Promise<MenuItem[]> {
  const {data,error}=await supabase.from('menu_items').select('*').eq('is_available',true).order('category').order('name');
  if(error) throw new Error(`getMenuItems:${error.message}`);
  return(data??[])as MenuItem[];
}
export async function getAllMenuItems():Promise<MenuItem[]> {
  const {data,error}=await supabase.from('menu_items').select('*').order('category').order('name');
  if(error) throw new Error(`getAllMenuItems:${error.message}`);
  return(data??[])as MenuItem[];
}
export async function upsertMenuItem(item:Partial<MenuItem>&{name:string;category:string;price:number}):Promise<MenuItem> {
  const {data,error}=await supabase.from('menu_items').upsert(item).select().single();
  if(error) throw new Error(`upsertMenuItem:${error.message}`);
  return data as MenuItem;
}
export async function deleteMenuItem(id:string):Promise<void> {
  const {error}=await supabase.from('menu_items').delete().eq('id',id);
  if(error) throw new Error(`deleteMenuItem:${error.message}`);
}
export async function toggleMenuItemAvailability(id:string,is_available:boolean):Promise<void> {
  const {error}=await supabase.from('menu_items').update({is_available}).eq('id',id);
  if(error) throw new Error(`toggleAvailability:${error.message}`);
}

// ── Order Sessions (cumulative ordering) ──────────────────────────────────
export async function getOrCreateSession(customer_id:string,table_number:number):Promise<OrderSession> {
  // Look for an active session for this table today
  const today = new Date(); today.setHours(0,0,0,0);
  const {data:existing}=await supabase.from('order_sessions').select('*')
    .eq('table_number',table_number).eq('is_active',true)
    .gte('created_at',today.toISOString()).maybeSingle();
  if(existing) return existing as OrderSession;
  const {data,error}=await supabase.from('order_sessions').insert({customer_id,table_number,is_active:true}).select().single();
  if(error) throw new Error(`createSession:${error.message}`);
  return data as OrderSession;
}
export async function closeSession(sessionId:string):Promise<void> {
  await supabase.from('order_sessions').update({is_active:false}).eq('id',sessionId);
}

// ── Orders ─────────────────────────────────────────────────────────────────
// KEY FIX: addItemsToOrder either appends to existing active order or creates new one
export async function addItemsToOrder(
  table_number:number, customer_id:string, items:CartItem[], existing_order_id?:string|null
):Promise<Order> {
  const itemTotal = items.reduce((s,i)=>s+i.menu_item.price*i.quantity,0);

  if(existing_order_id) {
    // Append to existing pending order
    const {data:order,error:oe}=await supabase.from('orders').select('*').eq('id',existing_order_id).eq('status','pending').maybeSingle();
    if(!oe && order) {
      // Add items to existing order
      const {error:ie}=await supabase.from('order_items').insert(
        items.map(i=>({order_id:existing_order_id,menu_item_id:i.menu_item.id,quantity:i.quantity,subtotal:i.menu_item.price*i.quantity}))
      );
      if(!ie) {
        // Update total
        const newTotal = (order as Order).total_amount + itemTotal;
        await supabase.from('orders').update({total_amount:newTotal}).eq('id',existing_order_id);
        return {...order as Order, total_amount:newTotal};
      }
    }
  }

  // Create new order
  const {data:newOrder,error:oe2}=await supabase.from('orders').insert({table_number,customer_id,total_amount:itemTotal,status:'pending'}).select().single();
  if(oe2) throw new Error(`createOrder:${oe2.message}`);
  const {error:ie2}=await supabase.from('order_items').insert(
    items.map(i=>({order_id:(newOrder as Order).id,menu_item_id:i.menu_item.id,quantity:i.quantity,subtotal:i.menu_item.price*i.quantity}))
  );
  if(ie2) throw new Error(`createOrderItems:${ie2.message}`);
  // Link to session
  await supabase.from('order_sessions').update({order_id:(newOrder as Order).id}).eq('table_number',table_number).eq('is_active',true);
  return newOrder as Order;
}

export async function getOrdersByTable(table_number:number):Promise<Order[]> {
  const today=new Date();today.setHours(0,0,0,0);
  const {data,error}=await supabase.from('orders').select('*,order_items(*,menu_items(*))')
    .eq('table_number',table_number).gte('created_at',today.toISOString()).order('created_at',{ascending:false});
  if(error) throw new Error(`getOrdersByTable:${error.message}`);
  return(data??[])as Order[];
}
export async function getActiveOrdersForKDS():Promise<Order[]> {
  const {data,error}=await supabase.from('orders').select('*,customers(name,phone),order_items(*,menu_items(name,category))').in('status',['pending','cooking']).order('created_at',{ascending:true});
  if(error) throw new Error(`getKDS:${error.message}`);
  return(data??[])as Order[];
}
export async function getAllOrdersToday():Promise<Order[]> {
  const today=new Date();today.setHours(0,0,0,0);
  const {data,error}=await supabase.from('orders').select('*,customers(name,phone),order_items(*,menu_items(name,price))').gte('created_at',today.toISOString()).order('created_at',{ascending:false});
  if(error) throw new Error(`getAllOrders:${error.message}`);
  return(data??[])as Order[];
}
export async function updateOrderStatus(orderId:string,status:OrderStatus):Promise<void> {
  const {error}=await supabase.from('orders').update({status}).eq('id',orderId);
  if(error) throw new Error(`updateOrderStatus:${error.message}`);
}

// ── Reviews ────────────────────────────────────────────────────────────────
export async function submitReview(order_id:string,table_number:number,rating:number,feedback:string|null):Promise<Review> {
  const status:ReviewStatus=rating<=3?'intercepted':'public';
  const {data,error}=await supabase.from('reviews').insert({order_id,table_number,rating,feedback,status}).select().single();
  if(error) throw new Error(`submitReview:${error.message}`);
  return data as Review;
}
export async function getBadReviewsToday():Promise<Review[]> {
  const start=new Date();start.setHours(0,0,0,0);
  const {data,error}=await supabase.from('reviews').select('*').lte('rating',3).gte('created_at',start.toISOString()).order('created_at',{ascending:false});
  if(error) throw new Error(`getBadReviews:${error.message}`);
  return(data??[])as Review[];
}

// ── Admin Auth ─────────────────────────────────────────────────────────────
export async function adminLogin(email:string,pin:string):Promise<AdminUser|null> {
  const {data,error}=await supabase.from('admin_users').select('*').eq('email',email).eq('pin',pin).eq('is_active',true).maybeSingle();
  if(error) return null;
  return data as AdminUser|null;
}
export async function adminLoginByPin(pin:string):Promise<AdminUser|null> {
  const {data,error}=await supabase.from('admin_users').select('*').eq('pin',pin).eq('is_active',true).maybeSingle();
  if(error) return null;
  return data as AdminUser|null;
}

// ── Realtime ───────────────────────────────────────────────────────────────
export type RealtimeOrderPayload={eventType:'INSERT'|'UPDATE'|'DELETE';new:Order;old:Partial<Order>};
export function subscribeToOrders(cb:(p:RealtimeOrderPayload)=>void):RealtimeChannel {
  return supabase.channel('orders-rt').on('postgres_changes',{event:'*',schema:'public',table:'orders'},p=>cb(p as unknown as RealtimeOrderPayload)).subscribe();
}
export function subscribeToMenuItems(cb:(p:{eventType:string;new:MenuItem})=>void):RealtimeChannel {
  return supabase.channel('menu-rt').on('postgres_changes',{event:'UPDATE',schema:'public',table:'menu_items'},p=>cb(p as unknown as{eventType:string;new:MenuItem})).subscribe();
}
export function unsubscribe(channel:RealtimeChannel):void{supabase.removeChannel(channel);}

// ── Utils ──────────────────────────────────────────────────────────────────
export function formatCurrency(amount:number,symbol='Rs.'):string{
  return `${symbol}${amount.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
}
export function groupMenuByCategory(items:MenuItem[]):Record<string,MenuItem[]>{
  return items.reduce<Record<string,MenuItem[]>>((acc,item)=>{
    if(!acc[item.category])acc[item.category]=[];acc[item.category].push(item);return acc;
  },{});
}
export function applyDietaryFilter(items:MenuItem[],filter:DietaryFilter):MenuItem[]{
  if(filter==='all')return items;
  if(filter==='vegetarian')return items.filter(i=>i.is_vegetarian);
  if(filter==='vegan')return items.filter(i=>i.is_vegan);
  if(filter==='seafood')return items.filter(i=>i.is_seafood);
  if(filter==='beef')return items.filter(i=>i.is_beef);
  if(filter==='alcohol')return items.filter(i=>i.is_alcohol);
  if(filter==='non-alcoholic')return items.filter(i=>!i.is_alcohol);
  if(filter==='spicy')return items.filter(i=>i.is_spicy);
  return items;
}
export const SERVICE_CHARGE_RATE=0.1;
export function calculateTotal(subtotal:number){
  const serviceCharge=subtotal*SERVICE_CHARGE_RATE;
  return{subtotal,serviceCharge,total:subtotal+serviceCharge};
}
