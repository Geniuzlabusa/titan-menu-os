'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Wifi, Instagram, Facebook, Phone, ChefHat, Star,
  ArrowRight, Users, Flame, Leaf, Wine, Fish, Beef,
  Sparkles, Search, X, AlertTriangle, Loader2,
} from 'lucide-react';
import {
  getMenuItems, getRestaurantSettings, upsertCustomer,
  subscribeToMenuItems, unsubscribe,
  applyDietaryFilter, formatCurrency,
  type MenuItem, type RestaurantSettings, type DietaryFilter, type RealtimeChannel,
} from '@/utils/supabase';
import { useCart } from '@/context/CartContext';
import Cart from '@/components/Cart';

const DIET_FILTERS: { key: DietaryFilter; label: string; emoji: string; activeColor: string }[] = [
  { key:'all',           label:'All',         emoji:'✨', activeColor:'bg-cyan-500 text-slate-900' },
  { key:'vegetarian',    label:'Vegetarian',  emoji:'🌿', activeColor:'bg-green-500 text-white' },
  { key:'vegan',         label:'Vegan',       emoji:'🌱', activeColor:'bg-emerald-500 text-white' },
  { key:'seafood',       label:'Seafood',     emoji:'🐟', activeColor:'bg-blue-500 text-white' },
  { key:'beef',          label:'Beef',        emoji:'🥩', activeColor:'bg-red-600 text-white' },
  { key:'alcohol',       label:'Alcohol',     emoji:'🍷', activeColor:'bg-purple-500 text-white' },
  { key:'non-alcoholic', label:'No Alcohol',  emoji:'🥤', activeColor:'bg-amber-500 text-slate-900' },
  { key:'spicy',         label:'Spicy',       emoji:'🔥', activeColor:'bg-orange-500 text-white' },
];

// ── WiFi Modal ─────────────────────────────────────────────────────────────
function WifiModal({ settings, onClose, onDone }: {
  settings: RestaurantSettings | null;
  onClose: () => void;
  onDone: (phone: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const info = settings?.restaurant_info;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\+?[\d\s\-]{8,15}$/.test(phone.trim())) { setError('Enter a valid WhatsApp number'); return; }
    setLoading(true);
    try { await onDone(phone.trim()); } catch { setError('Could not connect. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <div className="relative w-full max-w-sm bg-[#1c1917] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-3">
            <Wifi className="w-7 h-7 text-orange-400"/>
          </div>
          <h2 className="text-lg font-bold text-white">Free WiFi Access</h2>
          <p className="text-slate-400 text-sm mt-1">Connect to <strong className="text-white">{info?.wifi_ssid ?? 'Fusion88_Guest'}</strong> — enter your WhatsApp to receive your password.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input type="tel" autoComplete="tel" placeholder="+94 77 000 0000"
            value={phone} onChange={e => { setPhone(e.target.value); setError(''); }}
            className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${error ? 'border-red-500/60' : 'border-white/10'}`}/>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl disabled:opacity-60 font-bold text-sm flex items-center justify-center gap-2 transition-all text-white"
            style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wifi className="w-4 h-4"/>}
            {loading ? 'Connecting…' : 'Get WiFi Access'}
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm">Skip — continue browsing</button>
        </form>
        {info?.wifi_pass && (
          <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-white/5 text-center">
            <p className="text-slate-500 text-xs">Password: <span className="font-mono text-orange-400 font-semibold">{info.wifi_pass}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Item Detail Modal ──────────────────────────────────────────────────────
function ItemModal({ item, onClose, currencySymbol = 'Rs.' }: {
  item: MenuItem; onClose: () => void; currencySymbol?: string;
}) {
  const { addItem } = useCart();
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = (item.images?.length > 0) ? item.images : (item.image_url ? [item.image_url] : []);
  const info = item.nutritional_info;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm"/>
      <div className="relative w-full sm:max-w-md bg-[#1c1917] sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="relative h-56 shrink-0 bg-slate-800">
          {imgs.length > 0 && <Image src={imgs[imgIdx]} alt={item.name} fill className="object-cover" sizes="448px"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-transparent to-transparent"/>
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {imgs.map((_,i) => <button key={i} onClick={() => setImgIdx(i)} className={`h-1.5 rounded-full transition-all ${i===imgIdx ? 'bg-orange-400 w-5' : 'bg-white/40 w-1.5'}`}/>)}
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <X className="w-4 h-4"/>
          </button>
          <div className="absolute bottom-3 left-4">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">{item.category}</span>
            <h2 className="text-xl font-bold text-white">{item.name}</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {item.description && <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>}

          {item.portion_size && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <Users className="w-5 h-5 text-orange-400 shrink-0"/>
              <div>
                <p className="text-white text-sm font-semibold">{item.portion_size}</p>
                {item.serves && <p className="text-slate-500 text-xs">Suitable for {item.serves} {item.serves===1?'person':'people'}</p>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {item.is_vegetarian && <span className="px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium">🌿 Vegetarian</span>}
            {item.is_vegan      && <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">🌱 Vegan</span>}
            {item.is_spicy      && <span className="px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-medium">🌶 Spicy</span>}
            {item.is_seafood    && <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium">🐟 Seafood</span>}
            {item.is_beef       && <span className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium">🥩 Beef</span>}
            {item.is_alcohol    && <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-medium">🍷 Alcohol</span>}
          </div>

          {info?.calories > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Nutrition</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {label:'Cal',    val:info.calories, unit:'kcal', color:'text-orange-400'},
                  {label:'Protein',val:info.protein,  unit:'g',    color:'text-cyan-400'},
                  {label:'Carbs',  val:info.carbs,    unit:'g',    color:'text-amber-400'},
                  {label:'Fat',    val:info.fat,       unit:'g',    color:'text-rose-400'},
                ].map(n => (
                  <div key={n.label} className="p-2 rounded-xl bg-slate-900/50 border border-white/5 text-center">
                    <p className={`text-sm font-bold ${n.color}`}>{n.val}<span className="text-[10px] font-normal text-slate-600">{n.unit}</span></p>
                    <p className="text-slate-600 text-[10px]">{n.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {info?.allergens?.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0"/>
              <div>
                <p className="text-amber-400 text-xs font-semibold mb-1">Contains allergens</p>
                <div className="flex flex-wrap gap-1">{info.allergens.map(a => <span key={a} className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs capitalize">{a}</span>)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <p className="text-2xl font-bold text-white flex-1">{formatCurrency(item.price, currencySymbol)}</p>
          <button onClick={() => { addItem(item); onClose(); }}
            className="px-5 py-3 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all active:scale-95"
            style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 16px rgba(249,115,22,0.3)'}}>
            + Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Menu Card ──────────────────────────────────────────────────────────────
function MenuCard({ item, onTap, currencySymbol = 'Rs.' }: {
  item: MenuItem; onTap: (i: MenuItem) => void; currencySymbol?: string;
}) {
  const { addItem, updateQuantity, state } = useCart();
  const qty = state.items.find(i => i.menu_item.id === item.id)?.quantity ?? 0;
  const img = (item.images?.length > 0) ? item.images[0] : item.image_url;

  const badges = [
    item.is_vegetarian && {label:'Veg',     cls:'bg-green-500/20 text-green-400 border-green-500/30'},
    item.is_vegan      && {label:'Vegan',   cls:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'},
    item.is_alcohol    && {label:'Alcohol', cls:'bg-purple-500/20 text-purple-400 border-purple-500/30'},
    item.is_spicy      && {label:'🌶',      cls:'bg-orange-500/20 text-orange-400 border-orange-500/30'},
    item.is_seafood    && {label:'Seafood', cls:'bg-blue-500/20 text-blue-400 border-blue-500/30'},
    item.is_beef       && {label:'Beef',    cls:'bg-red-500/20 text-red-400 border-red-500/30'},
  ].filter(Boolean) as {label:string;cls:string}[];

  return (
    <div onClick={() => onTap(item)} className="group bg-[#1c1917] border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-500/30 transition-all duration-300 hover:shadow-[0_0_24px_rgba(249,115,22,0.1)] active:scale-[0.98]">
      <div className="relative h-44 overflow-hidden bg-slate-800">
        {img && <Image src={img} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:640px) 50vw, 33vw"/>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917]/80 via-transparent to-transparent"/>
        {item.images?.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white font-medium">+{item.images.length-1}</div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-1">{item.name}</p>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.slice(0,2).map(b => <span key={b.label} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${b.cls}`}>{b.label}</span>)}
          </div>
        )}
        {item.portion_size && (
          <p className="text-slate-600 text-xs flex items-center gap-1 line-clamp-1">
            <Users className="w-3 h-3 shrink-0"/>{item.portion_size}
          </p>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-orange-400 font-bold">{formatCurrency(item.price, currencySymbol)}</span>
          {qty === 0 ? (
            <button onClick={e => { e.stopPropagation(); addItem(item); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-lg font-bold active:scale-90 transition-all"
              style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 12px rgba(249,115,22,0.35)'}}>+</button>
          ) : (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => updateQuantity(item.id,-1)} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-base font-bold hover:bg-slate-600">−</button>
              <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
              <button onClick={() => addItem(item)} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-bold" style={{background:'#f97316'}}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const { setCustomer, state } = useCart();
  const [items, setItems]             = useState<MenuItem[]>([]);
  const [settings, setSettings]       = useState<RestaurantSettings | null>(null);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setCategory] = useState('All');
  const [activeFilter, setFilter]     = useState<DietaryFilter>('all');
  const [search, setSearch]           = useState('');
  const [selectedItem, setSelected]   = useState<MenuItem | null>(null);
  const [showWifi, setShowWifi]       = useState(false);
  const [wifiDone, setWifiDone]       = useState(false);
  const channelRef                    = useRef<RealtimeChannel | null>(null);

  const loadMenu = useCallback(async () => {
    try {
      const data = await getMenuItems();
      setItems(data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    Promise.all([getMenuItems(), getRestaurantSettings()])
      .then(([m, s]) => { setItems(m); setSettings(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── REALTIME: keep availability in sync ──────────────────────────────────
  useEffect(() => {
    channelRef.current = subscribeToMenuItems(({ new: updatedItem }) => {
      if (updatedItem.is_available) {
        // Item made available — add or update
        setItems(prev =>
          prev.some(i => i.id === updatedItem.id)
            ? prev.map(i => i.id === updatedItem.id ? updatedItem : i)
            : [...prev, updatedItem]
        );
      } else {
        // Item disabled — REMOVE from customer view immediately
        setItems(prev => prev.filter(i => i.id !== updatedItem.id));
        // If it's in the item modal, close it
        setSelected(prev => prev?.id === updatedItem.id ? null : prev);
      }
    });

    channelRef.current.on('system', { event: 'SUBSCRIBED' }, () => {});

    return () => {
      if (channelRef.current) unsubscribe(channelRef.current);
    };
  }, []);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];

  const filtered = (() => {
    let r = applyDietaryFilter(items, activeFilter);
    if (activeCategory !== 'All') r = r.filter(i => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(i => i.name.toLowerCase().includes(q) || (i.description??'').toLowerCase().includes(q) || (i.tags??[]).some(t => t.toLowerCase().includes(q)));
    }
    return r;
  })();

  const handleWifiDone = useCallback(async (phone: string) => {
    const customer = await upsertCustomer(phone, 'Guest');
    setCustomer(customer);
    setWifiDone(true);
    setShowWifi(false);
  }, [setCustomer]);

  const info   = settings?.restaurant_info;
  const social = settings?.social_links;
  const currencySymbol = info?.currency_symbol ?? 'Rs.';
  const hasActiveFilters = activeFilter !== 'all' || !!search || activeCategory !== 'All';

  return (
    <main className="min-h-screen bg-[#0c0a09] pb-36">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[60vw] h-[60vw] rounded-full bg-orange-500/4 blur-[120px]"/>
        <div className="absolute -bottom-20 -left-20 w-[45vw] h-[45vw] rounded-full bg-amber-500/3 blur-[100px]"/>
      </div>

      {/* Hero */}
      <div className="relative bg-gradient-to-b from-[#1c1917]/80 to-[#0c0a09] border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 pt-10 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl border border-orange-500/30 flex items-center justify-center mx-auto mb-3" style={{background:'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(234,88,12,0.05))'}}>
            <ChefHat className="w-8 h-8 text-orange-400" strokeWidth={1.5}/>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{info?.name ?? 'Fusion88'}</h1>
          <p className="text-orange-400/80 text-sm mt-0.5">{info?.tagline ?? 'Where East Meets West · Galle Fort'}</p>
          {info?.opening_hours && <p className="text-slate-600 text-xs mt-1">🕐 {info.opening_hours}</p>}

          <div className="flex items-center justify-center gap-0.5 mt-2">
            {[1,2,3,4,5].map(s=><Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/>)}
            <span className="text-slate-500 text-xs ml-1.5">Premium dining · Galle Fort</span>
          </div>

          {/* Social links */}
          <div className="flex items-center justify-center gap-2.5 mt-4">
            {social?.instagram && (
              <a href={social.instagram} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-[#1c1917] border border-white/10 flex items-center justify-center text-slate-400 hover:text-pink-400 hover:border-pink-400/40 transition-all" aria-label="Instagram">
                <Instagram className="w-4 h-4"/>
              </a>
            )}
            {social?.facebook && (
              <a href={social.facebook} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-[#1c1917] border border-white/10 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-400/40 transition-all" aria-label="Facebook">
                <Facebook className="w-4 h-4"/>
              </a>
            )}
            {social?.tiktok && (
              <a href={social.tiktok} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-[#1c1917] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all" aria-label="TikTok">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>
              </a>
            )}
            {social?.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-[#1c1917] border border-white/10 flex items-center justify-center text-slate-400 hover:text-green-400 hover:border-green-400/40 transition-all" aria-label="WhatsApp">
                <Phone className="w-4 h-4"/>
              </a>
            )}
            <button onClick={() => setShowWifi(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all ${wifiDone ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-[#1c1917] border-orange-500/30 text-orange-400 hover:bg-[#2a1f17]'}`}>
              <Wifi className="w-3.5 h-3.5"/>{wifiDone ? 'Connected ✓' : 'Free WiFi'}
            </button>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"/>
          <input type="text" placeholder="Search dishes, ingredients…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-[#1c1917] border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"/>
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-4 h-4"/></button>}
        </div>

        {/* Dietary filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-2">
          {DIET_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${activeFilter === f.key ? f.activeColor + ' border-transparent shadow-lg scale-105' : 'bg-[#1c1917] text-slate-400 border-white/10 hover:text-white'}`}>
              <span>{f.emoji}</span>{f.label}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 mb-3 border-b border-white/5">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-slate-700 text-white border border-white/20' : 'text-slate-500 hover:text-slate-300'}`}>{cat}</button>
          ))}
        </div>

        {/* Results bar */}
        <div className="flex items-center justify-between mb-3 min-h-[20px]">
          <p className="text-slate-600 text-xs">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
          {hasActiveFilters && (
            <button onClick={() => { setFilter('all'); setSearch(''); setCategory('All'); }}
              className="text-orange-400 text-xs hover:text-orange-300 flex items-center gap-1">
              <X className="w-3 h-3"/>Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} className="rounded-2xl bg-[#1c1917] overflow-hidden animate-pulse">
                <div className="h-44 bg-slate-800/60"/>
                <div className="p-3 space-y-2"><div className="h-4 bg-slate-800 rounded w-3/4"/><div className="h-3 bg-slate-800/50 rounded w-1/2"/></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-4xl">🍽️</p>
            <p className="text-slate-500 text-sm">No items match your search</p>
            <button onClick={() => { setFilter('all'); setSearch(''); setCategory('All'); }} className="text-orange-400 text-sm hover:text-orange-300">Show all items</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item => <MenuCard key={item.id} item={item} onTap={setSelected} currencySymbol={currencySymbol}/>)}
          </div>
        )}

        {/* Order CTA */}
        {!state.customer && state.items.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl border" style={{background:'rgba(249,115,22,0.08)',borderColor:'rgba(249,115,22,0.2)'}}>
            <p className="text-white text-sm font-semibold mb-1">Ready to place your order?</p>
            <p className="text-slate-400 text-xs mb-3">Add your WhatsApp number so we can confirm and track it.</p>
            <button onClick={() => setShowWifi(true)}
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
              Add My Number <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        )}
      </div>

      {showWifi    && <WifiModal settings={settings} onClose={() => setShowWifi(false)} onDone={handleWifiDone}/>}
      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelected(null)} currencySymbol={currencySymbol}/>}
      <Cart/>
    </main>
  );
}
