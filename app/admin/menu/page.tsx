'use client';
export const dynamic='force-dynamic';
// app/admin/menu/page.tsx — Full Menu Editor with add/edit/delete/toggle

import{useState,useEffect,useCallback}from'react';
import Image from'next/image';
import Link from'next/link';
import{ArrowLeft,Plus,Edit2,Trash2,ToggleLeft,ToggleRight,Save,X,Loader2,Image as ImgIcon,ChefHat}from'lucide-react';
import{getAllMenuItems,upsertMenuItem,deleteMenuItem,toggleMenuItemAvailability,type MenuItem}from'@/utils/supabase';
import{useAdmin}from'@/context/AdminContext';
import{useRouter}from'next/navigation';

const EMPTY_ITEM:Partial<MenuItem>={
  name:'',category:'',description:'',price:0,image_url:'',
  images:[],tags:[],portion_size:'',serves:1,
  is_vegetarian:false,is_vegan:false,is_alcohol:false,
  is_beef:false,is_seafood:false,is_spicy:false,is_available:true,
  nutritional_info:{calories:0,protein:0,carbs:0,fat:0,allergens:[]},
};

const CATEGORIES=['Sri Lankan','Seafood','Fusion Mains','Vegetarian','Desserts','Drinks','Starters','Mains','Sides'];

function ItemForm({item,onSave,onClose}:{item:Partial<MenuItem>;onSave:(i:Partial<MenuItem>)=>Promise<void>;onClose:()=>void}){
  const[form,setForm]=useState<Partial<MenuItem>>(item);
  const[saving,setSaving]=useState(false);
  const[imagesText,setImagesText]=useState((item.images||[]).join('\n'));
  const[tagsText,setTagsText]=useState((item.tags||[]).join(', '));
  const[allergensText,setAllergensText]=useState((item.nutritional_info?.allergens||[]).join(', '));

  function set(k:string,v:unknown){setForm(f=>({...f,[k]:v}));}
  function setNutri(k:string,v:number){setForm(f=>({...f,nutritional_info:{...f.nutritional_info!,[k]:v}}));}

  async function handleSave(){
    if(!form.name||!form.category||!form.price)return;
    setSaving(true);
    try{
      await onSave({
        ...form,
        images:imagesText.split('\n').map(s=>s.trim()).filter(Boolean),
        tags:tagsText.split(',').map(s=>s.trim()).filter(Boolean),
        nutritional_info:{
          ...form.nutritional_info!,
          allergens:allergensText.split(',').map(s=>s.trim()).filter(Boolean),
        },
      });
    }finally{setSaving(false);}
  }

  const dietaryFlags=[
    {key:'is_vegetarian',label:'Vegetarian 🌿'},
    {key:'is_vegan',label:'Vegan 🌱'},
    {key:'is_seafood',label:'Seafood 🐟'},
    {key:'is_beef',label:'Beef 🥩'},
    {key:'is_alcohol',label:'Alcohol 🍷'},
    {key:'is_spicy',label:'Spicy 🌶'},
  ];

  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg bg-[#1c1917] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-bold">{form.id?'Edit Item':'Add New Item'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label-xs">Item Name *</label>
              <input value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. Galle Crab Curry"
                className="input-field w-full"/>
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
              <input type="number" value={form.price||''} onChange={e=>set('price',parseFloat(e.target.value)||0)}
                className="input-field w-full"/>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label-xs">Description</label>
            <textarea value={form.description||''} onChange={e=>set('description',e.target.value)} rows={3} placeholder="Describe the dish…" className="input-field w-full resize-none"/>
          </div>

          {/* Portion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Portion Size</label>
              <input value={form.portion_size||''} onChange={e=>set('portion_size',e.target.value)} placeholder="e.g. Regular — 1 person" className="input-field w-full"/>
            </div>
            <div>
              <label className="label-xs">Serves (people)</label>
              <input type="number" min={1} value={form.serves||1} onChange={e=>set('serves',parseInt(e.target.value)||1)} className="input-field w-full"/>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="label-xs">Image URLs (one per line)</label>
            <textarea value={imagesText} onChange={e=>setImagesText(e.target.value)} rows={2} placeholder="https://example.com/photo.jpg" className="input-field w-full resize-none font-mono text-xs"/>
          </div>

          {/* Dietary flags */}
          <div>
            <label className="label-xs">Dietary Flags</label>
            <div className="flex flex-wrap gap-2">
              {dietaryFlags.map(f=>(
                <button key={f.key} type="button" onClick={()=>set(f.key,!(form as Record<string,unknown>)[f.key])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(form as Record<string,unknown>)[f.key]?'bg-orange-500/20 border-orange-500/40 text-orange-300':'bg-slate-800 border-white/10 text-slate-500'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className="label-xs">Nutrition</label>
            <div className="grid grid-cols-4 gap-2">
              {(['calories','protein','carbs','fat'] as const).map(k=>(
                <div key={k}>
                  <p className="text-slate-600 text-xs mb-1 capitalize">{k}</p>
                  <input type="number" value={form.nutritional_info?.[k]||0} onChange={e=>setNutri(k,parseFloat(e.target.value)||0)} className="input-field w-full text-center"/>
                </div>
              ))}
            </div>
          </div>

          {/* Allergens + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs">Allergens (comma-separated)</label>
              <input value={allergensText} onChange={e=>setAllergensText(e.target.value)} placeholder="gluten, dairy, eggs" className="input-field w-full"/>
            </div>
            <div>
              <label className="label-xs">Tags (comma-separated)</label>
              <input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="popular, spicy, local" className="input-field w-full"/>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving||!form.name||!form.category} className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}
            {saving?'Saving…':'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuEditor(){
  const{isAuthenticated}=useAdmin();
  const router=useRouter();
  const[items,setItems]=useState<MenuItem[]>([]);
  const[loading,setLoading]=useState(true);
  const[editItem,setEditItem]=useState<Partial<MenuItem>|null>(null);
  const[filterCat,setFilterCat]=useState('All');

  useEffect(()=>{if(!isAuthenticated)router.replace('/admin');},[isAuthenticated,router]);

  const fetchItems=useCallback(async()=>{
    const data=await getAllMenuItems();setItems(data);setLoading(false);
  },[]);
  useEffect(()=>{fetchItems();},[fetchItems]);

  const categories=['All',...Array.from(new Set(items.map(i=>i.category)))];
  const filtered=filterCat==='All'?items:items.filter(i=>i.category===filterCat);

  async function handleSave(data:Partial<MenuItem>){
    await upsertMenuItem(data as MenuItem&{name:string;category:string;price:number});
    await fetchItems();setEditItem(null);
  }
  async function handleDelete(id:string){
    if(!confirm('Delete this item? This cannot be undone.'))return;
    await deleteMenuItem(id);setItems(prev=>prev.filter(i=>i.id!==id));
  }
  async function handleToggle(id:string,val:boolean){
    setItems(prev=>prev.map(i=>i.id===id?{...i,is_available:val}:i));
    await toggleMenuItemAvailability(id,val);
  }

  return(
    <div className="min-h-screen bg-[#0c0a09]">
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
            <h1 className="text-white font-bold">Menu Editor</h1>
          </div>
          <button onClick={()=>setEditItem(EMPTY_ITEM)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
            <Plus className="w-4 h-4"/>Add Item
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 mb-4">
          {categories.map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filterCat===c?'bg-orange-500 text-white':'bg-[#1c1917] text-slate-400 border border-white/10 hover:text-white'}`}>{c}</button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
          <span>{filtered.length} items · {filtered.filter(i=>i.is_available).length} available</span>
          <span>{filtered.filter(i=>!i.is_available).length} hidden</span>
        </div>

        {loading?(
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-20 rounded-2xl bg-[#1c1917] animate-pulse"/>)}</div>
        ):(
          <div className="space-y-2">
            {filtered.map(item=>{
              const img=(item.images?.length>0)?item.images[0]:item.image_url;
              return(
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${item.is_available?'bg-[#1c1917] border-white/8':'bg-slate-900/30 border-white/3 opacity-60'}`}>
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-700 shrink-0">
                    {img&&<Image src={img} alt={item.name} fill className="object-cover" sizes="56px"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                      {!item.is_available&&<span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold shrink-0">OFF</span>}
                    </div>
                    <p className="text-slate-500 text-xs">{item.category}</p>
                    <p className="text-orange-400 text-xs font-semibold">Rs.{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>handleToggle(item.id,!item.is_available)} title={item.is_available?'Hide from menu':'Show on menu'} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                      {item.is_available?<ToggleRight className="w-6 h-6 text-orange-400"/>:<ToggleLeft className="w-6 h-6 text-slate-600"/>}
                    </button>
                    <button onClick={()=>setEditItem(item)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={()=>handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-600 hover:text-red-400">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editItem&&<ItemForm item={editItem} onSave={handleSave} onClose={()=>setEditItem(null)}/>}

      <style>{`
        .input-field{padding:10px 14px;background:rgba(15,13,12,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:white;font-size:13px;outline:none;}
        .input-field:focus{ring:2px;ring-color:rgba(249,115,22,0.5);border-color:rgba(249,115,22,0.4);}
        .label-xs{display:block;font-size:11px;font-weight:600;color:rgb(100,116,139);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;}
        select.input-field option{background:#1c1917;}
      `}</style>
    </div>
  );
}
