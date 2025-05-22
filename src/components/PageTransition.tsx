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
    }
  }, [pathname]);

  return null;
}
