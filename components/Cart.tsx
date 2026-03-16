'use client';
// components/Cart.tsx
// TITAN MENU OS — Floating cart drawer, checkout, and post-payment Review Shield

import { useState, useCallback } from 'react';
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  ChevronRight,
  Receipt,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  createOrder,
  submitReview,
  calculateTotal,
  formatCurrency,
} from '@/utils/supabase';
import { useCart } from '@/context/CartContext';

// ============================================================
// TYPES
// ============================================================

type CartView = 'cart' | 'checkout' | 'ordering' | 'review' | 'success' | 'error';

// ============================================================
// STAR RATING COMPONENT
// ============================================================

interface StarRatingProps {
  rating: number;
  onRate: (r: number) => void;
}

function StarRating({ rating, onRate }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-125 active:scale-110"
        >
          <Star
            className={`w-9 h-9 transition-colors duration-150 ${
              star <= (hovered || rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ============================================================
// REVIEW SHIELD MODAL
// ============================================================

const GOOGLE_MAPS_URL = process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL ?? 'https://maps.google.com';

interface ReviewShieldProps {
  orderId: string;
  tableNumber: number;
  onDismiss: () => void;
}

function ReviewShield({ orderId, tableNumber, onDismiss }: ReviewShieldProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [phase, setPhase] = useState<'rating' | 'feedback' | 'submitted'>('rating');
  const [submitting, setSubmitting] = useState(false);

  async function handleRatingSelect(r: number) {
    setRating(r);
    if (r >= 4) {
      // Positive — redirect to Google Maps
      await submitReview(orderId, tableNumber, r, null);
      window.open(GOOGLE_MAPS_URL, '_blank');
      onDismiss();
    } else {
      setPhase('feedback');
    }
  }

  async function handleFeedbackSubmit() {
    setSubmitting(true);
    try {
      await submitReview(orderId, tableNumber, rating, feedback.trim() || null);
      setPhase('submitted');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-800 border border-white/10 rounded-2xl p-6 shadow-2xl">
        {phase === 'rating' && (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-2">🍽️</div>
            <h2 className="text-xl font-bold text-white">How was your experience?</h2>
            <p className="text-slate-400 text-sm">Your feedback helps us serve you better</p>
            <StarRating rating={rating} onRate={handleRatingSelect} />
            <p className="text-slate-600 text-xs">Tap a star to rate</p>
          </div>
        )}

        {phase === 'feedback' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">😔</div>
              <h2 className="text-lg font-bold text-white">We're sorry to hear that</h2>
              <p className="text-slate-400 text-sm mt-1">Tell us what went wrong</p>
            </div>

            <div className="flex justify-center">
              <StarRating rating={rating} onRate={setRating} />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-amber-300 text-xs">
                Our manager has been notified and will reach out shortly. We deeply apologise.
              </p>
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Please describe what happened…"
              rows={3}
              className="w-full px-4 py-3 bg-slate-900/70 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            />

            <button
              onClick={handleFeedbackSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        )}

        {phase === 'submitted' && (
          <div className="text-center space-y-4 py-2">
            <CheckCircle className="w-14 h-14 text-cyan-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Thank You</h2>
            <p className="text-slate-400 text-sm">
              Your feedback has been received. Our manager will personally follow up with you.
            </p>
            <button
              onClick={onDismiss}
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-900 font-bold text-sm transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN CART COMPONENT
// ============================================================

export default function Cart() {
  const { state, updateQuantity, removeItem, clearCart, setTable, itemCount, cartTotal } = useCart();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CartView>('cart');
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [tableInput, setTableInput] = useState('');
  const [tableError, setTableError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { subtotal, serviceCharge, total } = calculateTotal(cartTotal);
  const hasItems = itemCount > 0;

  const handlePlaceOrder = useCallback(async () => {
    if (!state.customer || state.items.length === 0) return;
    // Validate / resolve table number
    let tableNum = state.table_number;
    if (tableNum === 0) {
      const parsed = parseInt(tableInput, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 200) {
        setTableError('Please enter your table number (1–200)');
        return;
      }
      tableNum = parsed;
      setTable(tableNum);
    }
    setProcessing(true);
    setErrorMsg(null);
    try {
      const order = await createOrder(
        tableNum,
        state.customer.id,
        state.items
      );
      setLastOrderId(order.id);
      clearCart();
      setView('success');
    } catch (err) {
      setErrorMsg('Failed to place order. Please try again or ask a staff member.');
      setView('error');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, [state, tableInput, setTable, clearCart]);

  function resetFlow() {
    setView('cart');
    setOpen(false);
    setErrorMsg(null);
  }

  return (
    <>
      {/* Floating Cart Button */}
      {hasItems && !open && (
        <button
          onClick={() => { setOpen(true); setView('cart'); }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.4)] text-slate-900 font-bold text-sm hover:bg-cyan-400 transition-all active:scale-95 animate-bounce-subtle"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
          <span className="h-5 w-px bg-slate-900/30" />
          <span>{formatCurrency(cartTotal)}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Cart Drawer Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={resetFlow}
          />

          {/* Sheet */}
          <div className="relative bg-slate-800 border-t border-white/10 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                {view === 'cart' && <><ShoppingCart className="w-5 h-5 text-cyan-400" /> Your Order</>}
                {view === 'checkout' && <><Receipt className="w-5 h-5 text-cyan-400" /> Checkout</>}
                {view === 'success' && <><CheckCircle className="w-5 h-5 text-green-400" /> Order Placed!</>}
                {view === 'error' && <><AlertCircle className="w-5 h-5 text-red-400" /> Something went wrong</>}
                {view === 'ordering' && <><Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /> Processing…</>}
              </h2>
              <button
                onClick={resetFlow}
                className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ---- VIEW: CART ---- */}
            {view === 'cart' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {state.items.length === 0 ? (
                    <div className="py-12 text-center text-slate-600">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Your cart is empty</p>
                    </div>
                  ) : (
                    state.items.map((ci) => (
                      <div
                        key={ci.menu_item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-white/5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{ci.menu_item.name}</p>
                          <p className="text-cyan-400 text-xs font-semibold">
                            {formatCurrency(ci.menu_item.price * ci.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateQuantity(ci.menu_item.id, -1)}
                            className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white hover:bg-slate-600 transition-colors"
                          >
                            {ci.quantity === 1 ? (
                              <Trash2 className="w-3 h-3 text-red-400" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </button>
                          <span className="text-white font-bold text-sm w-4 text-center">
                            {ci.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(ci.menu_item.id, 1)}
                            className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {state.items.length > 0 && (
                  <div className="p-5 border-t border-white/5">
                    <div className="flex justify-between text-slate-400 text-sm mb-1">
                      <span>Subtotal</span>
                      <span className="text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    <p className="text-slate-600 text-xs mb-3">
                      Service charge added at checkout
                    </p>
                    <button
                      onClick={() => setView('checkout')}
                      className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                    >
                      Proceed to Checkout
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ---- VIEW: CHECKOUT ---- */}
            {view === 'checkout' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {/* Table + Customer */}
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
                    {state.table_number === 0 ? (
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1.5">Your table number</p>
                        <input type="number" min={1} max={200} placeholder="e.g. 7"
                          value={tableInput} onChange={e => { setTableInput(e.target.value); setTableError(''); }}
                          className={`w-full px-3 py-2.5 bg-slate-800 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${tableError ? 'border-red-500/60' : 'border-white/10'}`}/>
                        {tableError && <p className="text-red-400 text-xs mt-1">{tableError}</p>}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">Table</p>
                          <p className="text-white font-bold">#{state.table_number}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">Guest</p>
                          <p className="text-white font-bold truncate">{state.customer?.name ?? '—'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bill breakdown */}
                  <div className="space-y-2">
                    {state.items.map((ci) => (
                      <div key={ci.menu_item.id} className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          {ci.quantity}× {ci.menu_item.name}
                        </span>
                        <span className="text-white">
                          {formatCurrency(ci.menu_item.price * ci.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-1.5">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Service Charge (10%)</span>
                      <span>{formatCurrency(serviceCharge)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/10">
                      <span>Total</span>
                      <span className="text-cyan-400">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                    💳 Pay at the counter or ask your server — this confirms your order with the kitchen.
                  </div>
                </div>

                <div className="p-5 border-t border-white/5 flex gap-3">
                  <button
                    onClick={() => setView('cart')}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold text-sm transition-colors"
                  >
                    Edit Cart
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={processing}
                    className="flex-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirm Order'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ---- VIEW: SUCCESS ---- */}
            {view === 'success' && (
              <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Order Confirmed!</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Your order is being prepared. You can add more items anytime.
                  </p>
                </div>
                <div className="w-full grid grid-cols-2 gap-3">
                  <button
                    onClick={resetFlow}
                    className="py-3 rounded-xl border border-white/10 text-slate-300 font-semibold text-sm hover:text-white transition-colors"
                  >
                    Back to Menu
                  </button>
                  <button
                    onClick={() => setView('review')}
                    className="py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm hover:bg-amber-500/30 transition-colors"
                  >
                    Rate Experience
                  </button>
                </div>
              </div>
            )}

            {/* ---- VIEW: ERROR ---- */}
            {view === 'error' && (
              <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Order Failed</h3>
                  <p className="text-slate-400 text-sm mt-1">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setView('checkout')}
                  className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold text-sm hover:bg-slate-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Shield (fullscreen modal, separate from drawer) */}
      {view === 'review' && lastOrderId && !open && (
        <ReviewShield
          orderId={lastOrderId}
          tableNumber={state.table_number}
          onDismiss={() => {
            setLastOrderId(null);
            setView('cart');
          }}
        />
      )}

      {/* Review Shield inside drawer success flow */}
      {view === 'review' && lastOrderId && open && (
        <ReviewShield
          orderId={lastOrderId}
          tableNumber={state.table_number}
          onDismiss={() => {
            setLastOrderId(null);
            setView('cart');
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
