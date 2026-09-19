"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/contexts/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ReactNode } from "react";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Register Service Worker for PWA support
    if ("serviceWorker" in navigator && "caches" in window) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          console.log("[PWA] Service Worker registered successfully:", registration);

          // Check for updates periodically
          setInterval(async () => {
            try {
              await registration.update();
            } catch (error) {
              console.error("[PWA] Error checking for Service Worker updates:", error);
            }
          }, 60000); // Check every minute
        } catch (error) {
          console.error("[PWA] Service Worker registration failed:", error);
        }
      });
    }
  }, []);

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <Footer />
        <InstallPrompt />
      </div>
    </AuthProvider>
  );
}
