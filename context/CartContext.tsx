'use client';
// context/CartContext.tsx — v3 with active_order_id for cumulative ordering
import React,{createContext,useCallback,useContext,useEffect,useReducer} from 'react';
import{CartItem,CartState,Customer,MenuItem}from'@/utils/supabase';

type CartAction=
  |{type:'SET_CUSTOMER';payload:Customer}
  |{type:'SET_TABLE';payload:number}
  |{type:'SET_ACTIVE_ORDER';payload:string|null}
  |{type:'ADD_ITEM';payload:MenuItem}
  |{type:'REMOVE_ITEM';payload:string}
  |{type:'UPDATE_QUANTITY';payload:{id:string;delta:number}}
  |{type:'CLEAR_CART'}
  |{type:'HYDRATE';payload:CartState};

const SESSION_KEY='titan_cart_v3';
const initialState:CartState={items:[],table_number:0,customer:null,active_order_id:null};

function cartReducer(state:CartState,action:CartAction):CartState{
  switch(action.type){
    case'HYDRATE':return action.payload;
    case'SET_CUSTOMER':return{...state,customer:action.payload};
    case'SET_TABLE':return{...state,table_number:action.payload};
    case'SET_ACTIVE_ORDER':return{...state,active_order_id:action.payload};
    case'ADD_ITEM':{
      const ex=state.items.find(i=>i.menu_item.id===action.payload.id);
      if(ex)return{...state,items:state.items.map(i=>i.menu_item.id===action.payload.id?{...i,quantity:i.quantity+1}:i)};
      return{...state,items:[...state.items,{menu_item:action.payload,quantity:1}]};
    }
    case'REMOVE_ITEM':return{...state,items:state.items.filter(i=>i.menu_item.id!==action.payload)};
    case'UPDATE_QUANTITY':{
      const updated=state.items.map(i=>{
        if(i.menu_item.id===action.payload.id){const q=i.quantity+action.payload.delta;return q<=0?null:{...i,quantity:q};}
        return i;
      }).filter(Boolean)as CartItem[];
      return{...state,items:updated};
    }
    case'CLEAR_CART':return{...state,items:[]};
    default:return state;
  }
}

interface CartContextValue{
  state:CartState;
  addItem:(item:MenuItem)=>void;
  removeItem:(id:string)=>void;
  updateQuantity:(id:string,delta:number)=>void;
  clearCart:()=>void;
  setCustomer:(c:Customer)=>void;
  setTable:(t:number)=>void;
  setActiveOrder:(id:string|null)=>void;
  itemCount:number;
  cartTotal:number;
}

const CartContext=createContext<CartContextValue|null>(null);

export function CartProvider({children}:{children:React.ReactNode}){
  const[state,dispatch]=useReducer(cartReducer,initialState);

  useEffect(()=>{
    try{const raw=sessionStorage.getItem(SESSION_KEY);if(raw)dispatch({type:'HYDRATE',payload:JSON.parse(raw)});}
    catch{sessionStorage.removeItem(SESSION_KEY);}
  },[]);

  useEffect(()=>{try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(state));}catch{};},[state]);

  const addItem=useCallback((item:MenuItem)=>dispatch({type:'ADD_ITEM',payload:item}),[]);
  const removeItem=useCallback((id:string)=>dispatch({type:'REMOVE_ITEM',payload:id}),[]);
  const updateQuantity=useCallback((id:string,delta:number)=>dispatch({type:'UPDATE_QUANTITY',payload:{id,delta}}),[]);
  const clearCart=useCallback(()=>dispatch({type:'CLEAR_CART'}),[]);
  const setCustomer=useCallback((c:Customer)=>dispatch({type:'SET_CUSTOMER',payload:c}),[]);
  const setTable=useCallback((t:number)=>dispatch({type:'SET_TABLE',payload:t}),[]);
  const setActiveOrder=useCallback((id:string|null)=>dispatch({type:'SET_ACTIVE_ORDER',payload:id}),[]);

  const itemCount=state.items.reduce((s,i)=>s+i.quantity,0);
  const cartTotal=state.items.reduce((s,i)=>s+i.menu_item.price*i.quantity,0);

  return(
    <CartContext.Provider value={{state,addItem,removeItem,updateQuantity,clearCart,setCustomer,setTable,setActiveOrder,itemCount,cartTotal}}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart():CartContextValue{
  const ctx=useContext(CartContext);
  if(!ctx)throw new Error('useCart must be used within CartProvider');
  return ctx;
}
