'use client';
export const dynamic='force-dynamic';
import{useState,useEffect,useCallback}from'react';
import Link from'next/link';
import{ArrowLeft,RefreshCw,ChevronDown,ChevronUp}from'lucide-react';
import{getAllOrdersToday,updateOrderStatus,formatCurrency,type Order,type OrderStatus}from'@/utils/supabase';
import{useAdmin}from'@/context/AdminContext';
import{useRouter}from'next/navigation';

const STATUS_COLORS:Record<OrderStatus,string>={
  pending:'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cooking:'bg-orange-500/20 text-orange-400 border-orange-500/30',
  completed:'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled:'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function OrdersPage(){
  const{isAuthenticated}=useAdmin();const router=useRouter();
  const[orders,setOrders]=useState<Order[]>([]);
  const[loading,setLoading]=useState(true);
  const[expanded,setExpanded]=useState<string|null>(null);
  const[filterStatus,setFilterStatus]=useState<OrderStatus|'all'>('all');

  useEffect(()=>{if(!isAuthenticated)router.replace('/admin');},[isAuthenticated,router]);

  const fetch=useCallback(async()=>{
    setLoading(true);
    const data=await getAllOrdersToday();setOrders(data);setLoading(false);
  },[]);
  useEffect(()=>{fetch();},[fetch]);

  const filtered=filterStatus==='all'?orders:orders.filter(o=>o.status===filterStatus);
  const totalRevenue=orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total_amount,0);

  async function changeStatus(id:string,status:OrderStatus){
    setOrders(prev=>prev.map(o=>o.id===id?{...o,status}:o));
    await updateOrderStatus(id,status);
  }

  return(
    <div className="min-h-screen bg-[#0c0a09]">
      <header className="border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4"/></Link>
            <div><h1 className="text-white font-bold">Orders</h1><p className="text-slate-500 text-xs">Today · Rs.{totalRevenue.toLocaleString()} revenue</p></div>
          </div>
          <button onClick={fetch} className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 mb-4">
          {(['all','pending','cooking','completed','cancelled'] as const).map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filterStatus===s?'bg-orange-500 text-white':'bg-[#1c1917] text-slate-400 border border-white/10 hover:text-white'}`}>
              {s==='all'?`All (${orders.length})`:s+` (${orders.filter(o=>o.status===s).length})`}
            </button>
          ))}
        </div>

        {loading?(
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-20 rounded-2xl bg-[#1c1917] animate-pulse"/>)}</div>
        ):filtered.length===0?(
          <div className="py-16 text-center text-slate-600"><p className="text-4xl mb-2">📋</p><p className="text-sm">No orders yet</p></div>
        ):(
          <div className="space-y-2">
            {filtered.map(order=>(
              <div key={order.id} className="bg-[#1c1917] border border-white/8 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={()=>setExpanded(expanded===order.id?null:order.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">Table #{order.table_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{new Date(order.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                  <p className="text-orange-400 font-bold text-sm shrink-0">{formatCurrency(order.total_amount,'Rs.')}</p>
                  {expanded===order.id?<ChevronUp className="w-4 h-4 text-slate-500"/>:<ChevronDown className="w-4 h-4 text-slate-500"/>}
                </div>
                {expanded===order.id&&(
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                    {/* Items */}
                    <div className="space-y-1">
                      {(order.order_items||[]).map(oi=>(
                        <div key={oi.id} className="flex justify-between text-sm">
                          <span className="text-slate-400">{oi.quantity}× {oi.menu_items?.name}</span>
                          <span className="text-white">{formatCurrency(oi.subtotal,'Rs.')}</span>
                        </div>
                      ))}
                    </div>
                    {/* Status controls */}
                    <div className="flex flex-wrap gap-2">
                      {(['pending','cooking','completed','cancelled'] as OrderStatus[]).map(s=>(
                        <button key={s} onClick={()=>changeStatus(order.id,s)} disabled={order.status===s}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all disabled:opacity-40 ${order.status===s?STATUS_COLORS[s]:'bg-slate-800 text-slate-400 border-white/10 hover:text-white'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
