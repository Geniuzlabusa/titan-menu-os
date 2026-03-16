'use client';
// context/CartContext.tsx
// TITAN MENU OS — Global cart state with session persistence

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { CartItem, CartState, Customer, MenuItem } from '@/utils/supabase';

// ============================================================
// STATE SHAPE & ACTIONS
// ============================================================

type CartAction =
  | { type: 'SET_CUSTOMER'; payload: Customer }
  | { type: 'SET_TABLE'; payload: number }
  | { type: 'ADD_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; delta: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'HYDRATE'; payload: CartState };

const SESSION_KEY = 'titan_cart_v1';

const initialState: CartState = {
  items: [],
  table_number: 0,
  customer: null,
};

// ============================================================
// REDUCER
// ============================================================

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'SET_CUSTOMER':
      return { ...state, customer: action.payload };

    case 'SET_TABLE':
      return { ...state, table_number: action.payload };

    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.menu_item.id === action.payload.id
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menu_item.id === action.payload.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { menu_item: action.payload, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.menu_item.id !== action.payload),
      };

    case 'UPDATE_QUANTITY': {
      const updated = state.items
        .map((i) => {
          if (i.menu_item.id === action.payload.id) {
            const newQty = i.quantity + action.payload.delta;
            return newQty <= 0 ? null : { ...i, quantity: newQty };
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
      return { ...state, items: updated };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    default:
      return state;
  }
}

// ============================================================
// CONTEXT
// ============================================================

interface CartContextValue {
  state: CartState;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer) => void;
  setTable: (table: number) => void;
  itemCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: CartState = JSON.parse(raw);
        dispatch({ type: 'HYDRATE', payload: parsed });
      }
    } catch {
      // Corrupted session — start fresh
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      // Storage quota exceeded — ignore
    }
  }, [state]);

  const addItem = useCallback((item: MenuItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, delta } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const setCustomer = useCallback((customer: Customer) => {
    dispatch({ type: 'SET_CUSTOMER', payload: customer });
  }, []);

  const setTable = useCallback((table: number) => {
    dispatch({ type: 'SET_TABLE', payload: table });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = state.items.reduce(
    (sum, i) => sum + i.menu_item.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setCustomer,
        setTable,
        itemCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('[TITAN] useCart must be used within CartProvider');
  return ctx;
}
