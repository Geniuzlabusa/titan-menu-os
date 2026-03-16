'use client';
export const dynamic='force-dynamic';
import{useState,useEffect,useCallback}from'react';
import Link from'next/link';
import{ArrowLeft,Save,Loader2,Palette,Globe,Share2,Info}from'lucide-react';
import{getRestaurantSettings,updateRestaurantSettings,type RestaurantSettings}from'@/utils/supabase';
import{useAdmin}from'@/context/AdminContext';
import{useRouter}from'next/navigation';

export default function SettingsPage(){
  const{isAuthenticated,hasRole}=useAdmin();
  const router=useRouter();
  const[settings,setSettings]=useState<RestaurantSettings|null>(null);
  const[tab,setTab]=useState<'info'|'theme'|'social'>('info');
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState(false);

  useEffect(()=>{if(!isAuthenticated)router.replace('/admin');},[isAuthenticated,router]);

  useEffect(()=>{
    getRestaurantSettings().then(setSettings).catch(console.error);
  },[]);

  async function handleSave(){
    if(!settings)return;
    setSaving(true);
    try{
      await Promise.all([
        updateRestaurantSettings('restaurant_info',settings.restaurant_info),
        updateRestaurantSettings('theme',settings.theme),
        updateRestaurantSettings('social_links',settings.social_links),
      ]);
      setSaved(true);setTimeout(()=>setSaved(false),2000);
    }finally{setSaving(false);}
  }

  function setInfo(k:string,v:string){setSettings(s=>s?({...s,restaurant_info:{...s.restaurant_info,[k]:v}}):s);}
  function setTheme(k:string,v:string){setSettings(s=>s?({...s,theme:{...s.theme,[k]:v}}):s);}
  function setSocial(k:string,v:string){setSettings(s=>s?({...s,social_links:{...s.social_links,[k]:v}}):s);}

  const TABS=[{key:'info',label:'Restaurant Info',icon:<Info className="w-4 h-4"/>},{key:'theme',label:'Theme & Branding',icon:<Palette className="w-4 h-4"/>},{key:'social',label:'Social Links',icon:<Share2 className="w-4 h-4"/>}];

  if(!settings)return<div className="min-h-screen bg-[#0c0a09] flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-400 animate-spin"/></div>;

  return(
    <div className="min-h-screen bg-[#0c0a09]">
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
            <h1 className="text-white font-bold">Restaurant Settings</h1>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60" style={{background:saved?'linear-gradient(135deg,#22c55e,#16a34a)':'linear-gradient(135deg,#f97316,#ea580c)'}}>
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}
            {saved?'Saved!':saving?'Saving…':'Save Changes'}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tab nav */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key as typeof tab)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t.key?'bg-orange-500 text-white':'bg-[#1c1917] text-slate-400 border border-white/10 hover:text-white'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* INFO TAB */}
        {tab==='info'&&(
          <div className="space-y-4">
            {[
              {k:'name',label:'Restaurant Name',placeholder:'Fusion88'},
              {k:'tagline',label:'Tagline',placeholder:'Where East Meets West'},
              {k:'address',label:'Address',placeholder:'Galle Fort, Galle 80000'},
              {k:'phone',label:'Phone',placeholder:'+94 91 223 4567'},
              {k:'email',label:'Email',placeholder:'hello@fusion88.lk'},
              {k:'opening_hours',label:'Opening Hours',placeholder:'11:00 AM – 11:00 PM daily'},
              {k:'wifi_ssid',label:'WiFi Network Name',placeholder:'Fusion88_Guest'},
              {k:'wifi_pass',label:'WiFi Password',placeholder:'fusion2024'},
              {k:'currency_symbol',label:'Currency Symbol',placeholder:'Rs.'},
            ].map(f=>(
              <div key={f.k}>
                <label className="label-xs">{f.label}</label>
                <input value={(settings.restaurant_info as unknown as Record<string,string>)[f.k]||''} onChange={e=>setInfo(f.k,e.target.value)}
                  placeholder={f.placeholder} className="input-field w-full"/>
              </div>
            ))}
            <div>
              <label className="label-xs">Description</label>
              <textarea value={settings.restaurant_info.description||''} onChange={e=>setInfo('description',e.target.value)} rows={3} className="input-field w-full resize-none"/>
            </div>
            <div>
              <label className="label-xs">Google Maps Review Link</label>
              <input value={settings.restaurant_info.google_maps||''} onChange={e=>setInfo('google_maps',e.target.value)} placeholder="https://g.page/r/…/review" className="input-field w-full"/>
            </div>
            <div>
              <label className="label-xs">Total Tables</label>
              <input type="number" value={settings.restaurant_info.total_tables||20} onChange={e=>setInfo('total_tables',e.target.value)} className="input-field w-full"/>
            </div>
          </div>
        )}

        {/* THEME TAB */}
        {tab==='theme'&&(
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#1c1917] border border-white/8">
              <p className="text-slate-400 text-xs mb-3">Live preview</p>
              <div className="p-4 rounded-xl border" style={{background:settings.theme.bg_color,borderColor:'rgba(255,255,255,0.1)'}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{background:settings.theme.primary_color}}>
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <p className="font-bold text-sm" style={{color:settings.theme.text_color}}>{settings.restaurant_info.name}</p>
                <p className="text-xs mt-0.5" style={{color:settings.theme.accent_color}}>{settings.restaurant_info.tagline}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {k:'primary_color',label:'Primary Color'},
                {k:'accent_color',label:'Accent Color'},
                {k:'bg_color',label:'Background Color'},
                {k:'panel_color',label:'Panel Color'},
              ].map(f=>(
                <div key={f.k} className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1917] border border-white/8">
                  <input type="color" value={(settings.theme as unknown as Record<string,string>)[f.k]||'#f97316'} onChange={e=>setTheme(f.k,e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"/>
                  <div>
                    <p className="text-white text-xs font-medium">{f.label}</p>
                    <p className="text-slate-500 text-xs font-mono">{(settings.theme as unknown as Record<string,string>)[f.k]||'#f97316'}</p>
                  </div>
                </div>
              ))}
            </div>
            {[
              {k:'logo_url',label:'Logo Image URL',placeholder:'https://…/logo.png'},
              {k:'hero_image_url',label:'Hero Banner Image URL',placeholder:'https://…/hero.jpg'},
              {k:'favicon_url',label:'Favicon URL',placeholder:'https://…/favicon.ico'},
            ].map(f=>(
              <div key={f.k}>
                <label className="label-xs">{f.label}</label>
                <input value={(settings.theme as unknown as Record<string,string>)[f.k]||''} onChange={e=>setTheme(f.k,e.target.value)} placeholder={f.placeholder} className="input-field w-full"/>
              </div>
            ))}
          </div>
        )}

        {/* SOCIAL TAB */}
        {tab==='social'&&(
          <div className="space-y-4">
            {[
              {k:'instagram',label:'Instagram URL',placeholder:'https://instagram.com/yourpage'},
              {k:'facebook',label:'Facebook URL',placeholder:'https://facebook.com/yourpage'},
              {k:'tiktok',label:'TikTok URL',placeholder:'https://tiktok.com/@yourpage'},
              {k:'whatsapp',label:'WhatsApp Link',placeholder:'https://wa.me/94XXXXXXXXX'},
            ].map(f=>(
              <div key={f.k}>
                <label className="label-xs">{f.label}</label>
                <input value={(settings.social_links as unknown as Record<string,string>)[f.k]||''} onChange={e=>setSocial(f.k,e.target.value)}
                  placeholder={f.placeholder} className="input-field w-full"/>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .input-field{padding:10px 14px;background:rgba(15,13,12,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:white;font-size:13px;outline:none;width:100%;}
        .label-xs{display:block;font-size:11px;font-weight:600;color:rgb(100,116,139);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;}
      `}</style>
    </div>
  );
}
