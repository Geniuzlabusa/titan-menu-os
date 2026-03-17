'use client';
export const dynamic = 'force-dynamic';
// app/admin/menu/page.tsx — Full Menu Editor: CRUD + Image Upload + AI Paper Menu Scanner

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Save, X, Loader2, Upload, FileImage, Sparkles, CheckCircle,
  AlertCircle, Eye, RefreshCw,
} from 'lucide-react';
import {
  getAllMenuItems, upsertMenuItem, deleteMenuItem, toggleMenuItemAvailability,
  getSupabaseClient, type MenuItem,
} from '@/utils/supabase';
import { useAdmin } from '@/context/AdminContext';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Sri Lankan','Seafood','Fusion Mains','Vegetarian','Desserts','Drinks','Starters','Mains','Sides','Snacks'];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xytndzkoqriqyzinoxgc.supabase.co';

// ── Image Uploader ─────────────────────────────────────────────────────────
function ImageUploader({ onUpload }: { onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }

    setUploading(true); setError('');
    try {
      const sb = getSupabaseClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from('menu-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = sb.storage.from('menu-images').getPublicUrl(path);
      onUpload(data.publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}/>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-medium transition-all disabled:opacity-60">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5"/>}
        {uploading ? 'Uploading…' : 'Upload Image'}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── AI Paper Menu Scanner ──────────────────────────────────────────────────
function PaperMenuScanner({ onItemsExtracted }: { onItemsExtracted: (items: Partial<MenuItem>[]) => void }) {
  const [open, setOpen]       = useState(false);
  const [phase, setPhase]     = useState<'upload'|'scanning'|'results'|'error'>('upload');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState<Partial<MenuItem>[]>([]);
  const [error, setError]     = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUploadAndScan(file: File) {
    setPhase('scanning');
    try {
      const sb = getSupabaseClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from('paper-menus')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = sb.storage.from('paper-menus').getPublicUrl(path);
      setFileUrl(data.publicUrl);
      setFileName(file.name);

      // Call Claude API to extract menu items from the image/PDF
      const prompt = `You are a menu digitization expert. Analyze this restaurant menu image and extract ALL menu items.

For each item found, return a JSON array with objects having these exact fields:
- name (string): item name
- category (string): one of "Starters", "Mains", "Seafood", "Vegetarian", "Desserts", "Drinks", "Sri Lankan", "Fusion Mains", "Sides"
- description (string): description if visible, otherwise ""
- price (number): price as a number (remove currency symbols), 0 if not visible
- is_vegetarian (boolean): true if marked vegetarian
- is_vegan (boolean): true if marked vegan  
- is_seafood (boolean): true if it's a seafood dish
- is_beef (boolean): true if it contains beef
- is_alcohol (boolean): true if it's alcoholic
- is_spicy (boolean): true if marked spicy
- portion_size (string): portion description if visible, otherwise ""
- tags (array): relevant tags like ["popular", "signature", "local"]

Return ONLY a valid JSON array. No markdown, no explanation. Just the JSON array.

Image URL: ${data.publicUrl}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'url', url: data.publicUrl },
              },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const apiData = await response.json();
      const text = apiData.content?.find((c: {type: string}) => c.type === 'text')?.text ?? '[]';

      let parsed: Partial<MenuItem>[] = [];
      try {
        // Strip any markdown code fences if present
        const clean = text.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) parsed = [];
      } catch {
        throw new Error('Could not parse menu items from image. Please try a clearer photo.');
      }

      // Add is_available: false — items start unpublished
      parsed = parsed.map(item => ({
        ...item,
        is_available: false,
        images: [],
        nutritional_info: { calories: 0, protein: 0, carbs: 0, fat: 0, allergens: [] },
      }));

      setResults(parsed);
      setSelected(new Set(parsed.map((_, i) => i))); // select all by default
      setPhase('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      setError(msg);
      setPhase('error');
    }
  }

  function handleImport() {
    const chosen = results.filter((_, i) => selected.has(i));
    onItemsExtracted(chosen);
    setOpen(false);
    setPhase('upload');
    setResults([]);
    setSelected(new Set());
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-sm font-semibold transition-all"
      style={{background:'rgba(168,85,247,0.08)'}}>
      <Sparkles className="w-4 h-4"/>AI Menu Scanner
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { setOpen(false); setPhase('upload'); }}/>
      <div className="relative w-full max-w-lg bg-[#1c1917] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400"/>
            <h2 className="text-white font-bold">AI Paper Menu Scanner</h2>
          </div>
          <button onClick={() => { setOpen(false); setPhase('upload'); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {/* UPLOAD PHASE */}
          {phase === 'upload' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm leading-relaxed">
                <p className="font-semibold mb-1">📸 How it works</p>
                <ol className="space-y-1 text-xs text-purple-300/80 list-decimal list-inside">
                  <li>Upload a photo or scan of your paper menu (JPG, PNG, PDF)</li>
                  <li>AI reads and extracts all menu items automatically</li>
                  <li>Review the items — they start as <strong>Draft (unpublished)</strong></li>
                  <li>Edit each item, add photos, then publish when ready</li>
                </ol>
              </div>

              <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadAndScan(f); }}/>

              <button onClick={() => inputRef.current?.click()}
                className="w-full py-12 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 transition-all flex flex-col items-center gap-3 text-center">
                <FileImage className="w-12 h-12 text-purple-400/60"/>
                <div>
                  <p className="text-white font-semibold">Tap to upload your menu</p>
                  <p className="text-slate-500 text-xs mt-1">JPG, PNG, or PDF · max 20MB</p>
                </div>
              </button>
            </div>
          )}

          {/* SCANNING PHASE */}
          {phase === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse"/>
              </div>
              <div>
                <p className="text-white font-bold text-lg">Reading your menu…</p>
                <p className="text-slate-400 text-sm mt-1">AI is extracting items, prices & descriptions</p>
                <p className="text-slate-600 text-xs mt-1">{fileName}</p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
                ))}
              </div>
            </div>
          )}

          {/* ERROR PHASE */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400"/>
              <div>
                <p className="text-white font-bold">Scan Failed</p>
                <p className="text-slate-400 text-sm mt-1">{error}</p>
              </div>
              <button onClick={() => setPhase('upload')}
                className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 flex items-center gap-2">
                <RefreshCw className="w-4 h-4"/>Try Again
              </button>
            </div>
          )}

          {/* RESULTS PHASE */}
          {phase === 'results' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">{results.length} items found</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(results.map((_,i)=>i)))} className="text-orange-400 text-xs hover:text-orange-300">Select all</button>
                  <span className="text-slate-600">·</span>
                  <button onClick={() => setSelected(new Set())} className="text-slate-500 text-xs hover:text-slate-300">None</button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                ⚠ These items will be added as <strong>Drafts</strong> — not visible to customers until you enable them.
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {results.map((item, i) => (
                  <div key={i} onClick={() => toggleSelect(i)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected.has(i) ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-900/30 border-white/5 opacity-50'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all ${selected.has(i) ? 'bg-purple-500' : 'bg-slate-700 border border-white/20'}`}>
                      {selected.has(i) && <CheckCircle className="w-3.5 h-3.5 text-white"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      <p className="text-slate-500 text-xs">{item.category} · Rs.{item.price}</p>
                      {item.description && <p className="text-slate-600 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'results' && (
          <div className="p-5 border-t border-white/5 flex gap-3">
            <button onClick={() => setPhase('upload')} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:text-white transition-colors">
              Rescan
            </button>
            <button onClick={handleImport} disabled={selected.size === 0}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{background:'linear-gradient(135deg,#a855f7,#7c3aed)'}}>
              <Plus className="w-4 h-4"/>Import {selected.size} Item{selected.size !== 1 ? 's' : ''} as Drafts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Item Form ──────────────────────────────────────────────────────────────
const EMPTY: Partial<MenuItem> = {
  name:'', category:'', description:'', price:0, image_url:'', images:[],
  tags:[], portion_size:'', serves:1,
  is_vegetarian:false, is_vegan:false, is_alcohol:false,
  is_beef:false, is_seafood:false, is_spicy:false, is_available:false,
  nutritional_info:{calories:0,protein:0,carbs:0,fat:0,allergens:[]},
};

function ItemForm({ item, onSave, onClose }: {
  item: Partial<MenuItem>;
  onSave: (i: Partial<MenuItem>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm]             = useState<Partial<MenuItem>>(item);
  const [saving, setSaving]         = useState(false);
  const [imagesText, setImagesText] = useState((item.images||[]).join('\n'));
  const [tagsText, setTagsText]     = useState((item.tags||[]).join(', '));
  const [allergensText, setAllergens] = useState((item.nutritional_info?.allergens||[]).join(', '));

  function set(k: string, v: unknown) { setForm(f => ({...f, [k]: v})); }
  function setNutri(k: string, v: number) { setForm(f => ({...f, nutritional_info:{...f.nutritional_info!, [k]:v}})); }

  async function handleSave() {
    if (!form.name || !form.category) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        images: imagesText.split('\n').map(s=>s.trim()).filter(Boolean),
        tags: tagsText.split(',').map(s=>s.trim()).filter(Boolean),
        nutritional_info: {
          ...form.nutritional_info!,
          allergens: allergensText.split(',').map(s=>s.trim()).filter(Boolean),
        },
      });
    } finally { setSaving(false); }
  }

  function handleImageUploaded(url: string) {
    setImagesText(prev => prev ? prev + '\n' + url : url);
    if (!form.image_url) set('image_url', url);
  }

  const dietaryFlags = [
    {key:'is_vegetarian',label:'Vegetarian 🌿'},
    {key:'is_vegan',label:'Vegan 🌱'},
    {key:'is_seafood',label:'Seafood 🐟'},
    {key:'is_beef',label:'Beef 🥩'},
    {key:'is_alcohol',label:'Alcohol 🍷'},
    {key:'is_spicy',label:'Spicy 🌶'},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg bg-[#1c1917] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-bold">{form.id ? 'Edit Item' : 'Add New Item'}</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <div onClick={() => set('is_available', !form.is_available)} className={`w-10 h-5 rounded-full transition-all relative ${form.is_available ? 'bg-orange-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_available ? 'left-5' : 'left-0.5'}`}/>
              </div>
              {form.is_available ? <Eye className="w-3.5 h-3.5 text-orange-400"/> : <span className="text-slate-600">Draft</span>}
            </label>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label-xs">Item Name *</label>
              <input value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. Galle Crab Curry" className="input-field w-full"/>
            </div>
            <div>
              <label className="label-xs">Category *</label>
              <select value={form.category||''} onChange={e=>set('category',e.target.value)} className="input-field w-full">
                <option value="">Select…</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs">Price (LKR) *</label>
              <input type="number" value={form.price||''} onChange={e=>set('price',parseFloat(e.target.value)||0)} className="input-field w-full"/>
            </div>
          </div>

          <div>
            <label className="label-xs">Description</label>
            <textarea value={form.description||''} onChange={e=>set('description',e.target.value)} rows={3} placeholder="Describe the dish…" className="input-field w-full resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Portion Size</label>
              <input value={form.portion_size||''} onChange={e=>set('portion_size',e.target.value)} placeholder="Regular — 1 person" className="input-field w-full"/>
            </div>
            <div>
              <label className="label-xs">Serves (people)</label>
              <input type="number" min={1} value={form.serves||1} onChange={e=>set('serves',parseInt(e.target.value)||1)} className="input-field w-full"/>
            </div>
          </div>

          {/* Image upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-xs" style={{marginBottom:0}}>Images</label>
              <ImageUploader onUpload={handleImageUploaded}/>
            </div>
            <textarea value={imagesText} onChange={e=>setImagesText(e.target.value)} rows={2}
              placeholder="Image URLs appear here after upload, or paste manually" className="input-field w-full resize-none font-mono text-xs"/>
            {/* Preview uploaded images */}
            {imagesText.split('\n').filter(Boolean).length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {imagesText.split('\n').filter(Boolean).map((url,i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <Image src={url} alt="" fill className="object-cover" sizes="64px" onError={()=>{}}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dietary flags */}
          <div>
            <label className="label-xs">Dietary Flags</label>
            <div className="flex flex-wrap gap-2">
              {dietaryFlags.map(f => (
                <button key={f.key} type="button" onClick={() => set(f.key, !(form as Record<string,unknown>)[f.key])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(form as Record<string,unknown>)[f.key] ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-slate-800 border-white/10 text-slate-500'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className="label-xs">Nutrition per serving</label>
            <div className="grid grid-cols-4 gap-2">
              {(['calories','protein','carbs','fat'] as const).map(k => (
                <div key={k}>
                  <p className="text-slate-600 text-xs mb-1 capitalize">{k}</p>
                  <input type="number" value={form.nutritional_info?.[k]||0} onChange={e=>setNutri(k,parseFloat(e.target.value)||0)} className="input-field w-full text-center"/>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Allergens (comma-separated)</label>
              <input value={allergensText} onChange={e=>setAllergens(e.target.value)} placeholder="gluten, dairy, eggs" className="input-field w-full"/>
            </div>
            <div>
              <label className="label-xs">Tags (comma-separated)</label>
              <input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="popular, spicy, local" className="input-field w-full"/>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving||!form.name||!form.category}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            {saving ? 'Saving…' : 'Save Item'}
          </button>
        </div>
      </div>

      <style>{`
        .input-field{padding:10px 14px;background:rgba(15,13,12,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:white;font-size:13px;outline:none;width:100%;}
        .input-field:focus{border-color:rgba(249,115,22,0.4);}
        .label-xs{display:block;font-size:11px;font-weight:600;color:rgb(100,116,139);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;}
        select.input-field option{background:#1c1917;}
      `}</style>
    </div>
  );
}

// ── Main Menu Editor Page ──────────────────────────────────────────────────
export default function MenuEditor() {
  const { isAuthenticated } = useAdmin();
  const router = useRouter();
  const [items, setItems]       = useState<MenuItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editItem, setEditItem] = useState<Partial<MenuItem>|null>(null);
  const [filterCat, setFilterCat] = useState('All');
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/admin'); }, [isAuthenticated, router]);

  const fetchItems = useCallback(async () => {
    const data = await getAllMenuItems(); setItems(data); setLoading(false);
  }, []);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filtered = items.filter(i => {
    if (filterCat !== 'All' && i.category !== filterCat) return false;
    if (!showDrafts && !i.is_available) return false;
    return true;
  });

  async function handleSave(data: Partial<MenuItem>) {
    await upsertMenuItem(data as MenuItem & {name:string;category:string;price:number});
    await fetchItems(); setEditItem(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    await deleteMenuItem(id); setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleToggle(id: string, val: boolean) {
    setItems(prev => prev.map(i => i.id === id ? {...i, is_available: val} : i));
    await toggleMenuItemAvailability(id, val);
  }

  // Handle AI scan results — save all as drafts immediately
  async function handleScanResults(extracted: Partial<MenuItem>[]) {
    let saved = 0;
    for (const item of extracted) {
      try {
        await upsertMenuItem({
          ...item,
          is_available: false,
          name: item.name ?? 'Unnamed Item',
          category: item.category ?? 'Mains',
          price: item.price ?? 0,
        } as MenuItem & {name:string;category:string;price:number});
        saved++;
      } catch (err) { console.error('Failed to save:', item.name, err); }
    }
    await fetchItems();
    alert(`✅ ${saved} items imported as drafts. Review and enable them to show on the menu.`);
  }

  const draftCount = items.filter(i => !i.is_available).length;
  const liveCount = items.filter(i => i.is_available).length;

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
            <div>
              <h1 className="text-white font-bold">Menu Editor</h1>
              <p className="text-slate-600 text-xs">{liveCount} live · {draftCount} drafts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PaperMenuScanner onItemsExtracted={handleScanResults}/>
            <button onClick={() => setEditItem(EMPTY)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all"
              style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
              <Plus className="w-4 h-4"/>Add Item
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 mb-3">
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filterCat===c ? 'bg-orange-500 text-white' : 'bg-[#1c1917] text-slate-400 border border-white/10 hover:text-white'}`}>{c}</button>
          ))}
        </div>

        {/* Draft toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-600 text-xs">{filtered.length} showing</p>
          <button onClick={() => setShowDrafts(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${showDrafts ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-white/10 text-slate-500 hover:text-white'}`}>
            {showDrafts ? 'Showing Drafts' : `Show Drafts (${draftCount})`}
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-20 rounded-2xl bg-[#1c1917] animate-pulse"/>)}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const img = (item.images?.length > 0) ? item.images[0] : item.image_url;
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${item.is_available ? 'bg-[#1c1917] border-white/8' : 'bg-slate-900/20 border-white/3 opacity-70'}`}>
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-700 shrink-0">
                    {img && <Image src={img} alt={item.name} fill className="object-cover" sizes="56px"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                      {!item.is_available && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold shrink-0">DRAFT</span>}
                    </div>
                    <p className="text-slate-500 text-xs">{item.category}</p>
                    <p className="text-orange-400 text-xs font-semibold">Rs.{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggle(item.id, !item.is_available)} title={item.is_available ? 'Hide (Draft)' : 'Publish'} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                      {item.is_available ? <ToggleRight className="w-6 h-6 text-orange-400"/> : <ToggleLeft className="w-6 h-6 text-slate-600"/>}
                    </button>
                    <button onClick={() => setEditItem(item)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-600 hover:text-red-400">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editItem && <ItemForm item={editItem} onSave={handleSave} onClose={() => setEditItem(null)}/>}
    </div>
  );
}
