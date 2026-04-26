"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useSunsetBanner } from "./SunsetBanner";

export default function MainWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const isLoginPage = segment === "auth";
  const { visible: bannerVisible } = useSunsetBanner();

  const heightClass = bannerVisible
    ? "h-[calc(100vh-2.5rem)] mt-10 overflow-hidden"
    : "h-screen";
  const sidebarPad = !isLoginPage ? "pl-0 md:pl-16 pb-16 md:pb-0" : "";

  return <main className={`${heightClass} ${sidebarPad}`}>{children}</main>;
}
