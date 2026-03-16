import type{Metadata,Viewport}from'next';
import{Inter}from'next/font/google';
import'./globals.css';
import{CartProvider}from'@/context/CartContext';
import{AdminProvider}from'@/context/AdminContext';

const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});

export const metadata:Metadata={
  title:'Fusion88 — Galle Fort',
  description:'Where East Meets West · Fusion dining in the heart of Galle Fort, Sri Lanka',
  appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Fusion88'},
};
export const viewport:Viewport={themeColor:'#0c0a09',width:'device-width',initialScale:1,maximumScale:1};

export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-[#0c0a09] text-white antialiased font-sans">
        <AdminProvider><CartProvider>{children}</CartProvider></AdminProvider>
      </body>
    </html>
  );
}
