"use client";

import { AuthProvider } from "@/lib/contexts/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReactNode } from "react";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
