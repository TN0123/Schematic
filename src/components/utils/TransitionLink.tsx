"use client";
import Link, { LinkProps } from "next/link";
import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface TransitionLinkProps extends LinkProps {
  children: React.ReactNode;
  href: string;
  className?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const TransitionLink = ({
  children,
  href,
  ...props
}: TransitionLinkProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleTransition = async (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    if (pathname === href) {
      return;
    }
    e.preventDefault();
    const mainContent = document.querySelector("main");

    // Start the transition out
    mainContent?.classList.add("page-transition");
    await sleep(150); // Match the CSS transition duration

    // Navigate to the new page
    router.push(href);
  };

  return (
    <Link onClick={handleTransition} href={href} {...props}>
      {children}
    </Link>
  );
};
