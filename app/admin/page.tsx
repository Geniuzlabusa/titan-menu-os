'use client';
export const dynamic='force-dynamic';
// app/admin/page.tsx — Admin Dashboard Hub

import{useState,useEffect,useCallback}from'react';
import Link from'next/link';
import{
  LayoutDashboard,UtensilsCrossed,ShoppingBag,BarChart3,Settings,
  LogOut,ChefHat,TrendingUp,AlertTriangle,Users,Star,
  Clock,CheckCircle,Loader2,Eye,EyeOff,Shield
}from'lucide-react';
import{adminLogin,getAllOrdersToday,getBadReviewsToday,formatCurrency,type Order,type Review,type AdminUser}from'@/utils/supabase';
import{useAdmin}from'@/context/AdminContext';

// ── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({onLogin}:{onLogin:(u:AdminUser)=>void}){
  const[email,setEmail]=useState('');
  const[pin,setPin]=useState('');
  const[showPin,setShowPin]=useState(false);
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(false);

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();setError('');setLoading(true);
    try{
      const user=await adminLogin(email.trim(),pin.trim());
      if(user)onLogin(user);
      else setError('Invalid email or PIN. Check your credentials.');
    }finally{setLoading(false);}
  }

  return(
    <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-orange-500/4 blur-[120px]"/>
      </div>
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl border border-orange-500/30 flex items-center justify-center mx-auto mb-4" style={{background:'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(234,88,12,0.1))'}}>
            <Shield className="w-8 h-8 text-orange-400" strokeWidth={1.5}/>
          </div>
          <h1 className="text-2xl font-black text-white">Fusion88 Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Staff Portal — Authorized access only</p>
        </div>
        <div className="backdrop-blur-xl bg-[#1c1917]/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {error&&<div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
              <input type="email" placeholder="you@fusion88.lk" value={email} onChange={e=>setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/70 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">4-Digit PIN</label>
              <div className="relative">
                <input type={showPin?'text':'password'} placeholder="••••" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}
                  className="w-full pl-4 pr-10 py-3 bg-slate-900/70 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 tracking-widest"/>
                <button type="button" onClick={()=>setShowPin(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPin?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60" style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Shield className="w-4 h-4"/>}
              {loading?'Verifying…':'Sign In'}
            </button>
          </form>
          <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-white/5 text-center">
            <p className="text-slate-600 text-xs">Demo: admin@fusion88.lk / 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({label,value,sub,icon,color,alert}:{label:string;value:string|number;sub?:string;icon:React.ReactNode;color:string;alert?:boolean}){
  return(
    <div className={`p-4 rounded-2xl border transition-all ${alert?'bg-red-500/10 border-red-500/30':'bg-[#1c1917] border-white/8'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        {alert&&<span className="w-2 h-2 rounded-full bg-red-500 animate-ping"/>}
      </div>
      <p className={`text-2xl font-black ${alert?'text-red-400':'text-white'}`}>{value}</p>
      <p className="text-slate-400 text-xs font-medium mt-0.5">{label}</p>
      {sub&&<p className="text-slate-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Nav Item ───────────────────────────────────────────────────────────────
function NavItem({href,icon,label,badge}:{href:string;icon:React.ReactNode;label:string;badge?:number}){
  return(
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1917] border border-white/8 hover:border-orange-500/30 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors">{icon}</div>
      <span className="text-white font-medium text-sm flex-1">{label}</span>
      {badge!==undefined&&badge>0&&(
        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">{badge}</span>
      )}
      <ChefHat className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors"/>
    </Link>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({admin}:{admin:AdminUser}){
  const{logout}=useAdmin();
  const[orders,setOrders]=useState<Order[]>([]);
  const[badReviews,setBadReviews]=useState<Review[]>([]);
  const[loading,setLoading]=useState(true);

  const fetchData=useCallback(async()=>{
    const[o,r]=await Promise.all([getAllOrdersToday(),getBadReviewsToday()]);
    setOrders(o);setBadReviews(r);setLoading(false);
  },[]);

  useEffect(()=>{fetchData();},[fetchData]);

  const todayRevenue=orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total_amount,0);
  const pendingCount=orders.filter(o=>o.status==='pending').length;
  const cookingCount=orders.filter(o=>o.status==='cooking').length;
  const completedCount=orders.filter(o=>o.status==='completed').length;

  return(
    <div className="min-h-screen bg-[#0c0a09]">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[45vw] h-[45vw] rounded-full bg-orange-500/4 blur-[100px]"/>
      </div>

      {/* Header */}
      <header className="relative border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-orange-500/30 flex items-center justify-center" style={{background:'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(234,88,12,0.1))'}}>
              <ChefHat className="w-5 h-5 text-orange-400" strokeWidth={1.5}/>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Fusion88 Admin</p>
              <p className="text-slate-500 text-xs capitalize">{admin.name} · {admin.role}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white text-xs transition-colors">
            <LogOut className="w-3.5 h-3.5"/>Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 relative">
        {/* Today stats */}
        {loading?(
          <div className="grid grid-cols-2 gap-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-28 rounded-2xl bg-[#1c1917] animate-pulse"/>)}</div>
        ):(
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Today's Revenue" value={`Rs.${todayRevenue.toLocaleString()}`} sub={`${completedCount} completed`} icon={<TrendingUp className="w-5 h-5"/>} color="bg-green-500/20 text-green-400"/>
            <StatCard label="Active Orders" value={pendingCount+cookingCount} sub={`${pendingCount} pending · ${cookingCount} cooking`} icon={<Clock className="w-5 h-5"/>} color="bg-orange-500/20 text-orange-400"/>
            <StatCard label="Total Orders Today" value={orders.length} sub={`${completedCount} done`} icon={<ShoppingBag className="w-5 h-5"/>} color="bg-blue-500/20 text-blue-400"/>
            <StatCard label="Bad Reviews Today" value={badReviews.length} sub={badReviews.length>0?'Manager action needed':'All good!'} icon={<Star className="w-5 h-5"/>} color="bg-red-500/20 text-red-400" alert={badReviews.length>2}/>
          </div>
        )}

        {/* Navigation */}
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Management</p>
          <div className="space-y-2">
            <NavItem href="/kds" icon={<ChefHat className="w-5 h-5"/>} label="Kitchen Display (Live Orders)" badge={pendingCount+cookingCount}/>
            <NavItem href="/admin/menu" icon={<UtensilsCrossed className="w-5 h-5"/>} label="Menu Editor"/>
            <NavItem href="/admin/orders" icon={<ShoppingBag className="w-5 h-5"/>} label="Orders & Tables"/>
            <NavItem href="/admin/reports" icon={<BarChart3 className="w-5 h-5"/>} label="Reports & Reviews" badge={badReviews.length||undefined}/>
            <NavItem href="/admin/settings" icon={<Settings className="w-5 h-5"/>} label="Restaurant Settings & Branding"/>
          </div>
        </div>

        {/* Bad reviews alert */}
        {badReviews.length>0&&(
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-red-400"/><p className="text-red-400 font-bold text-sm">{badReviews.length} Intercepted Review{badReviews.length>1?'s':''} Today</p></div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {badReviews.map(r=>(
                <div key={r.id} className="p-3 rounded-xl bg-slate-900/50 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s=><Star key={s} className={`w-3.5 h-3.5 ${s<=r.rating?'text-amber-400 fill-amber-400':'text-slate-700'}`}/>)}</div>
                    <span className="text-slate-500 text-xs ml-auto">Table #{r.table_number}</span>
                  </div>
                  {r.feedback&&<p className="text-slate-400 text-xs">{r.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        {orders.length>0&&(
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Recent Orders Today</p>
            <div className="space-y-2">
              {orders.slice(0,5).map(o=>(
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1917] border border-white/8">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${o.status==='pending'?'bg-amber-400':o.status==='cooking'?'bg-orange-400':o.status==='completed'?'bg-green-400':'bg-slate-600'}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">Table #{o.table_number}</p>
                    <p className="text-slate-500 text-xs capitalize">{o.status}</p>
                  </div>
                  <p className="text-orange-400 font-bold text-sm shrink-0">{formatCurrency(o.total_amount,'Rs.')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Entry Point ───────────────────────────────────────────────────────
export default function AdminPage(){
  const{admin,login,isAuthenticated}=useAdmin();
  if(!isAuthenticated)return<LoginScreen onLogin={login}/>;
  return<Dashboard admin={admin!}/>;
}
