'use client';
// components/Cart.tsx — v3 with cumulative ordering (add to same order)
import{useState,useCallback}from'react';
import{ShoppingCart,X,Plus,Minus,ChevronRight,Receipt,Star,CheckCircle,AlertCircle,Loader2,Trash2,MessageSquare,PackagePlus}from'lucide-react';
import{addItemsToOrder,submitReview,calculateTotal,formatCurrency,getOrCreateSession}from'@/utils/supabase';
import{useCart}from'@/context/CartContext';

type CartView='cart'|'checkout'|'success'|'review'|'error';
const GOOGLE_MAPS_URL=process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL||'https://maps.app.goo.gl/QEpLPKrouyum6tTm6';

function StarRating({rating,onRate}:{rating:number;onRate:(r:number)=>void}){
  const[hovered,setHovered]=useState(0);
  return(
    <div className="flex gap-2 justify-center">
      {[1,2,3,4,5].map(s=>(
        <button key={s} onClick={()=>onRate(s)} onMouseEnter={()=>setHovered(s)} onMouseLeave={()=>setHovered(0)} className="transition-transform hover:scale-125">
          <Star className={`w-9 h-9 transition-colors ${s<=(hovered||rating)?'text-amber-400 fill-amber-400':'text-slate-600'}`}/>
        </button>
      ))}
    </div>
  );
}

function ReviewShield({orderId,tableNumber,onDismiss}:{orderId:string;tableNumber:number;onDismiss:()=>void}){
  const[rating,setRating]=useState(0);
  const[feedback,setFeedback]=useState('');
  const[phase,setPhase]=useState<'rating'|'feedback'|'done'>('rating');
  const[loading,setLoading]=useState(false);

  async function handleRate(r:number){
    setRating(r);
    if(r>=4){await submitReview(orderId,tableNumber,r,null);window.open(GOOGLE_MAPS_URL,'_blank');onDismiss();}
    else setPhase('feedback');
  }
  async function handleSubmit(){
    setLoading(true);
    try{await submitReview(orderId,tableNumber,rating,feedback||null);setPhase('done');}
    finally{setLoading(false);}
  }
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <div className="relative w-full max-w-sm bg-[#1c1917] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {phase==='rating'&&<div className="text-center space-y-4"><div className="text-5xl">🍽️</div><h2 className="text-xl font-bold text-white">How was your experience?</h2><StarRating rating={rating} onRate={handleRate}/><p className="text-slate-500 text-xs">Tap a star to rate</p></div>}
        {phase==='feedback'&&(
          <div className="space-y-4">
            <div className="text-center"><div className="text-4xl mb-2">😔</div><h2 className="text-lg font-bold text-white">We're sorry to hear that</h2><p className="text-slate-400 text-sm mt-1">We'd love to make it right</p></div>
            <StarRating rating={rating} onRate={setRating}/>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">Our manager has been notified and will follow up personally. We sincerely apologise.</div>
            <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What could we improve?" rows={3} className="w-full px-4 py-3 bg-slate-900/70 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"/>
            <button onClick={handleSubmit} disabled={loading} className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<MessageSquare className="w-4 h-4"/>}Submit Feedback
            </button>
          </div>
        )}
        {phase==='done'&&(
          <div className="text-center space-y-4 py-2">
            <CheckCircle className="w-14 h-14 text-orange-400 mx-auto"/>
            <h2 className="text-lg font-bold text-white">Thank You</h2>
            <p className="text-slate-400 text-sm">Our manager will follow up shortly.</p>
            <button onClick={onDismiss} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Cart(){
  const{state,updateQuantity,clearCart,setActiveOrder,itemCount,cartTotal}=useCart();
  const[open,setOpen]=useState(false);
  const[view,setView]=useState<CartView>('cart');
  const[lastOrderId,setLastOrderId]=useState<string|null>(null);
  const[tableInput,setTableInput]=useState('');
  const[tableError,setTableError]=useState('');
  const[processing,setProcessing]=useState(false);
  const[errorMsg,setErrorMsg]=useState<string|null>(null);

  const{subtotal,serviceCharge,total}=calculateTotal(cartTotal);
  const hasItems=itemCount>0;

  const handlePlaceOrder=useCallback(async()=>{
    if(!state.customer||state.items.length===0)return;
    let tableNum=state.table_number;
    if(tableNum===0){
      const p=parseInt(tableInput,10);
      if(isNaN(p)||p<1||p>200){setTableError('Enter your table number (1–200)');return;}
      tableNum=p;
    }
    setProcessing(true);setErrorMsg(null);
    try{
      // Get/create session to enable cumulative ordering
      const session=await getOrCreateSession(state.customer.id,tableNum);
      // Add items to existing order or create new one
      const order=await addItemsToOrder(tableNum,state.customer.id,state.items,session.order_id||state.active_order_id);
      setLastOrderId(order.id);
      setActiveOrder(order.id); // remember for next add-more
      clearCart();
      setView('success');
    }catch(err){
      console.error(err);
      setErrorMsg('Could not place order. Please try again or ask a staff member.');
      setView('error');
    }finally{setProcessing(false);}
  },[state,tableInput,clearCart,setActiveOrder]);

  function reset(){setView('cart');setOpen(false);setErrorMsg(null);}

  const currSymbol='Rs.';

  return(
    <>
      {/* Floating button */}
      {hasItems&&!open&&(
        <button onClick={()=>{setOpen(true);setView('cart');}}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all animate-bounce-subtle"
          style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 40px rgba(249,115,22,0.5)'}}>
          <ShoppingCart className="w-5 h-5 text-white"/>
          <span className="text-white">{itemCount} item{itemCount>1?'s':''}</span>
          <span className="h-5 w-px bg-white/30"/>
          <span className="text-white">{formatCurrency(cartTotal,currSymbol)}</span>
          <ChevronRight className="w-4 h-4 text-white"/>
        </button>
      )}

      {/* Drawer */}
      {open&&(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={reset}/>
          <div className="relative bg-[#1c1917] border-t border-white/10 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-slate-700"/></div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                {view==='cart'&&<><ShoppingCart className="w-5 h-5 text-orange-400"/>Your Order</>}
                {view==='checkout'&&<><Receipt className="w-5 h-5 text-orange-400"/>Checkout</>}
                {view==='success'&&<><CheckCircle className="w-5 h-5 text-green-400"/>Order Sent!</>}
                {view==='error'&&<><AlertCircle className="w-5 h-5 text-red-400"/>Something went wrong</>}
              </h2>
              <button onClick={reset} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* CART VIEW */}
            {view==='cart'&&(
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                  {/* Active order banner */}
                  {state.active_order_id&&(
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">
                      <PackagePlus className="w-4 h-4 shrink-0"/>
                      These items will be <strong>added to your current order</strong> — no new order created.
                    </div>
                  )}
                  {state.items.length===0?(
                    <div className="py-12 text-center text-slate-600"><ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40"/><p className="text-sm">Your cart is empty</p></div>
                  ):state.items.map(ci=>(
                    <div key={ci.menu_item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-white/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{ci.menu_item.name}</p>
                        <p className="text-orange-400 text-xs font-semibold">{formatCurrency(ci.menu_item.price*ci.quantity,currSymbol)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={()=>updateQuantity(ci.menu_item.id,-1)} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white hover:bg-slate-600 transition-colors">
                          {ci.quantity===1?<Trash2 className="w-3 h-3 text-red-400"/>:<Minus className="w-3 h-3"/>}
                        </button>
                        <span className="text-white font-bold text-sm w-4 text-center">{ci.quantity}</span>
                        <button onClick={()=>updateQuantity(ci.menu_item.id,1)} className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 hover:bg-orange-500/30 transition-colors">
                          <Plus className="w-3 h-3"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {state.items.length>0&&(
                  <div className="p-5 border-t border-white/5">
                    <div className="flex justify-between text-slate-400 text-sm mb-1"><span>Subtotal</span><span className="text-white">{formatCurrency(subtotal,currSymbol)}</span></div>
                    <p className="text-slate-600 text-xs mb-3">10% service charge added at checkout</p>
                    <button onClick={()=>setView('checkout')} className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all" style={{background:'linear-gradient(135deg,#f97316,#ea580c)',boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
                      Proceed to Checkout<ChevronRight className="w-4 h-4"/>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CHECKOUT VIEW */}
            {view==='checkout'&&(
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {/* Table input */}
                  {state.table_number===0?(
                    <div>
                      <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1.5">Your Table Number</label>
                      <input type="number" min={1} max={200} placeholder="e.g. 7" value={tableInput} onChange={e=>{setTableInput(e.target.value);setTableError('');}}
                        className={`w-full px-4 py-3 bg-slate-900 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${tableError?'border-red-500/60':'border-white/10'}`}/>
                      {tableError&&<p className="text-red-400 text-xs mt-1">{tableError}</p>}
                    </div>
                  ):(
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 flex justify-between">
                      <span className="text-slate-500 text-sm">Table</span><span className="text-white font-bold">#{state.table_number}</span>
                    </div>
                  )}
                  {/* Items */}
                  <div className="space-y-1.5">
                    {state.items.map(ci=>(
                      <div key={ci.menu_item.id} className="flex justify-between text-sm">
                        <span className="text-slate-400">{ci.quantity}× {ci.menu_item.name}</span>
                        <span className="text-white">{formatCurrency(ci.menu_item.price*ci.quantity,currSymbol)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/5 pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span>{formatCurrency(subtotal,currSymbol)}</span></div>
                    <div className="flex justify-between text-sm text-slate-400"><span>Service Charge (10%)</span><span>{formatCurrency(serviceCharge,currSymbol)}</span></div>
                    <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-2">
                      <span>Total</span><span className="text-orange-400">{formatCurrency(total,currSymbol)}</span>
                    </div>
                  </div>
                  {state.active_order_id&&(
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs flex items-start gap-2">
                      <PackagePlus className="w-4 h-4 mt-0.5 shrink-0"/>Items added to your existing order — your total bill will update.
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">💳 Pay at the counter or ask your server. This sends your order straight to the kitchen.</div>
                </div>
                <div className="p-5 border-t border-white/5 flex gap-3">
                  <button onClick={()=>setView('cart')} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold text-sm transition-colors">Edit</button>
                  <button onClick={handlePlaceOrder} disabled={processing} className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60" style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                    {processing?<Loader2 className="w-4 h-4 animate-spin"/>:'Confirm Order'}
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {view==='success'&&(
              <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-400"/>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Order Confirmed!</h3>
                  <p className="text-slate-400 text-sm mt-1">Your order is being prepared. You can add more items anytime — they'll be added to the same order.</p>
                </div>
                <div className="w-full grid grid-cols-2 gap-3">
                  <button onClick={reset} className="py-3 rounded-xl border border-white/10 text-slate-300 font-semibold text-sm hover:text-white transition-colors">Add More Items</button>
                  <button onClick={()=>setView('review')} className="py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm hover:bg-amber-500/30 transition-colors">Rate Experience</button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {view==='error'&&(
              <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center gap-4">
                <AlertCircle className="w-16 h-16 text-red-400"/>
                <div><h3 className="text-lg font-bold text-white">Order Failed</h3><p className="text-slate-400 text-sm mt-1">{errorMsg}</p></div>
                <button onClick={()=>setView('checkout')} className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors">Try Again</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review modal */}
      {view==='review'&&lastOrderId&&(
        <ReviewShield orderId={lastOrderId} tableNumber={state.table_number} onDismiss={()=>{setLastOrderId(null);setView('cart');setOpen(false);}}/>
      )}
    </>
  );
}
