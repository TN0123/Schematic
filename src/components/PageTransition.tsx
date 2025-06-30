"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageTransition() {
  const pathname = usePathname();

  useEffect(() => {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      // Remove the transition class when the new page is loaded
      mainContent.classList.remove("page-transition");
      // Restore scrollbar after a small delay to ensure transition completes
      setTimeout(() => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }, 200); // Small delay to ensure transition fully completes
    }
  }, [pathname]);

  return null;
}
