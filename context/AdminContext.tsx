'use client';
import React,{createContext,useCallback,useContext,useEffect,useState}from'react';
import{AdminUser}from'@/utils/supabase';

interface AdminContextValue{
  admin:AdminUser|null;
  login:(user:AdminUser)=>void;
  logout:()=>void;
  isAuthenticated:boolean;
  hasRole:(roles:string[])=>boolean;
}

const AdminContext=createContext<AdminContextValue|null>(null);
const ADMIN_KEY='titan_admin_v1';

export function AdminProvider({children}:{children:React.ReactNode}){
  const[admin,setAdmin]=useState<AdminUser|null>(null);

  useEffect(()=>{
    try{const raw=sessionStorage.getItem(ADMIN_KEY);if(raw)setAdmin(JSON.parse(raw));}
    catch{sessionStorage.removeItem(ADMIN_KEY);}
  },[]);

  const login=useCallback((user:AdminUser)=>{setAdmin(user);try{sessionStorage.setItem(ADMIN_KEY,JSON.stringify(user));}catch{};},[]);
  const logout=useCallback(()=>{setAdmin(null);try{sessionStorage.removeItem(ADMIN_KEY);}catch{};},[]);
  const hasRole=useCallback((roles:string[])=>admin?roles.includes(admin.role):false,[admin]);

  return(
    <AdminContext.Provider value={{admin,login,logout,isAuthenticated:!!admin,hasRole}}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin():AdminContextValue{
  const ctx=useContext(AdminContext);
  if(!ctx)throw new Error('useAdmin must be within AdminProvider');
  return ctx;
}
