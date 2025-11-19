"use client";

import { Navbar } from "@/components/layout/Navbar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="print:m-0 print:w-full print:overflow-visible">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto print:p-0 print:overflow-visible">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
