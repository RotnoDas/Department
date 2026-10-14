"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/context/ThemeContext";
import SmoothScrollProvider from "@/components/common/SmoothScroll";

export function Providers({ children }) {
  const router = useRouter();
  return (
    <ThemeProvider>
      <SmoothScrollProvider>
        <HeroUIProvider navigate={router.push}>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          {children}
        </HeroUIProvider>
      </SmoothScrollProvider>
    </ThemeProvider>
  );
}

