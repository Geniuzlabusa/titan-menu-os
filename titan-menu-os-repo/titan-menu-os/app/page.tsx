'use client';
// app/page.tsx
// TITAN MENU OS — QR Scan Landing: Customer Registration Gate

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wifi, ChefHat, ArrowRight, Phone, User } from 'lucide-react';
import { upsertCustomer } from '@/utils/supabase';
import { useCart } from '@/context/CartContext';

interface FormState {
  name: string;
  phone: string;
  tableNumber: string;
}

interface FieldError {
  name?: string;
  phone?: string;
  tableNumber?: string;
}

function validatePhone(phone: string): boolean {
  // Accept international formats: +1234567890, 0412345678, etc.
  return /^\+?[\d\s\-]{8,15}$/.test(phone.trim());
}

export default function LandingPage() {
  const router = useRouter();
  const { setCustomer, setTable } = useCart();

  const [form, setForm] = useState<FormState>({ name: '', phone: '', tableNumber: '' });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: FieldError = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      newErrors.name = 'Please enter your full name';
    }
    if (!validatePhone(form.phone)) {
      newErrors.phone = 'Enter a valid WhatsApp number';
    }
    const table = parseInt(form.tableNumber, 10);
    if (isNaN(table) || table < 1 || table > 200) {
      newErrors.tableNumber = 'Enter your table number (1–200)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const customer = await upsertCustomer(form.phone.trim(), form.name.trim());
      setCustomer(customer);
      setTable(parseInt(form.tableNumber, 10));
      router.push('/menu');
    } catch (err) {
      setServerError('Connection error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-400/4 blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.15)]">
              <ChefHat className="w-10 h-10 text-cyan-400" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
              <Wifi className="w-3 h-3 text-slate-900" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            TITAN<span className="text-cyan-400"> MENU</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            Enter your details to unlock the menu &amp; WiFi
          </p>
        </div>

        {/* Glass panel */}
        <div className="backdrop-blur-xl bg-slate-800/60 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
              <span className="text-red-400 mt-0.5">⚠</span>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-900/70 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                    errors.name
                      ? 'border-red-500/60'
                      : 'border-white/10 focus:border-cyan-500/50'
                  }`}
                />
              </div>
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                WhatsApp Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-900/70 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                    errors.phone
                      ? 'border-red-500/60'
                      : 'border-white/10 focus:border-cyan-500/50'
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Table Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Table Number
              </label>
              <input
                type="number"
                min={1}
                max={200}
                placeholder="e.g. 7"
                value={form.tableNumber}
                onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                className={`w-full px-4 py-3 bg-slate-900/70 border rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                  errors.tableNumber
                    ? 'border-red-500/60'
                    : 'border-white/10 focus:border-cyan-500/50'
                }`}
              />
              {errors.tableNumber && (
                <p className="text-red-400 text-xs mt-1">{errors.tableNumber}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-600 border-t-slate-900 rounded-full animate-spin" />
                  Unlocking…
                </>
              ) : (
                <>
                  Unlock Menu &amp; WiFi
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-600 text-xs mt-4">
            Your info is used only to track your order &amp; send updates.
          </p>
        </div>

        {/* WiFi credential hint (shown post-login in real impl) */}
        <div className="mt-4 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-3">
          <Wifi className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-cyan-400 text-xs font-semibold">TITAN_GUEST_5G</p>
            <p className="text-slate-500 text-xs">Password auto-shared after registration</p>
          </div>
        </div>
      </div>
    </main>
  );
}
