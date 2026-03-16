'use client';
export const dynamic='force-dynamic';
import{useState,useEffect,useCallback}from'react';
import Link from'next/link';
import{ArrowLeft,Star,TrendingUp,ShoppingBag,Users,RefreshCw}from'lucide-react';
import{getAllOrdersToday,getBadReviewsToday,formatCurrency,type Order,type Review}from'@/utils/supabase';
import{useAdmin}from'@/context/AdminContext';
import{useRouter}from'next/navigation';

export default function ReportsPage(){
  const{isAuthenticated}=useAdmin();const router=useRouter();
  const[orders,setOrders]=useState<Order[]>([]);
  const[reviews,setReviews]=useState<Review[]>([]);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{if(!isAuthenticated)router.replace('/admin');},[isAuthenticated,router]);

  const fetch=useCallback(async()=>{
    const[o,r]=await Promise.all([getAllOrdersToday(),getBadReviewsToday()]);
    setOrders(o);setReviews(r);setLoading(false);
  },[]);
  useEffect(()=>{fetch();},[fetch]);

  const revenue=orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total_amount,0);
  const avgOrder=orders.length>0?revenue/orders.filter(o=>o.status==='completed').length:0;

  // Most ordered items
  const itemCounts:Record<string,{name:string;count:number}>={}; 
  orders.forEach(o=>(o.order_items||[]).forEach(oi=>{
    const k=oi.menu_items?.name||oi.menu_item_id;
    if(!itemCounts[k])itemCounts[k]={name:k,count:0};
    itemCounts[k].count+=oi.quantity;
  }));
  const topItems=Object.values(itemCounts).sort((a,b)=>b.count-a.count).slice(0,5);

  return(
    <div className="min-h-screen bg-[#0c0a09]">
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
            <h1 className="text-white font-bold">Reports & Reviews</h1>
          </div>
          <button onClick={fetch} className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        {/* Revenue stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {label:"Today's Revenue",value:`Rs.${revenue.toLocaleString()}`,icon:<TrendingUp className="w-5 h-5"/>,color:'text-green-400',bg:'bg-green-500/15'},
            {label:'Orders Today',value:orders.length,icon:<ShoppingBag className="w-5 h-5"/>,color:'text-blue-400',bg:'bg-blue-500/15'},
            {label:'Avg Order Value',value:`Rs.${Math.round(avgOrder).toLocaleString()}`,icon:<Users className="w-5 h-5"/>,color:'text-orange-400',bg:'bg-orange-500/15'},
            {label:'Bad Reviews',value:reviews.length,icon:<Star className="w-5 h-5"/>,color:reviews.length>0?'text-red-400':'text-green-400',bg:reviews.length>0?'bg-red-500/15':'bg-green-500/15'},
          ].map((s,i)=>(
            <div key={i} className="p-4 rounded-2xl bg-[#1c1917] border border-white/8">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Top items */}
        {topItems.length>0&&(
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Most Ordered Today</p>
            <div className="space-y-2">
              {topItems.map((item,i)=>(
                <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1917] border border-white/8">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold shrink-0">#{i+1}</div>
                  <p className="text-white text-sm flex-1 truncate">{item.name}</p>
                  <span className="text-orange-400 font-bold text-sm shrink-0">{item.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bad reviews */}
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Intercepted Reviews Today</p>
          {reviews.length===0?(
            <div className="py-10 text-center text-slate-600"><Star className="w-8 h-8 mx-auto mb-2 opacity-40"/><p className="text-sm">No bad reviews today 🎉</p></div>
          ):(
            <div className="space-y-2">
              {reviews.map(r=>(
                <div key={r.id} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s=><Star key={s} className={`w-4 h-4 ${s<=r.rating?'text-amber-400 fill-amber-400':'text-slate-700'}`}/>)}</div>
                    <div className="text-right"><p className="text-white text-xs font-semibold">Table #{r.table_number}</p><p className="text-slate-600 text-xs">{new Date(r.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p></div>
                  </div>
                  {r.feedback&&<p className="text-slate-400 text-sm">{r.feedback}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
