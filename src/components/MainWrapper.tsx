"use client";

import { useSelectedLayoutSegment } from "next/navigation";

export default function MainWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const isLoginPage = segment === "auth";

  return (
    <main className={`h-screen ${!isLoginPage ? "pl-0 md:pl-16 pb-16 md:pb-0" : ""}`}>
      {children}
    </main>
  );
}
