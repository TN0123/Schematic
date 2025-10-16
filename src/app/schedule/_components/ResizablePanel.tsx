"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface ResizablePanelProps {
  children: ReactNode;
  side: "left" | "right";
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
  width?: number;
  className?: string;
}

export default function ResizablePanel({
  children,
  side,
  minWidth = 280,
  maxWidth = 600,
  defaultWidth = 320,
  onWidthChange,
  width: controlledWidth,
  className = "",
}: ResizablePanelProps) {
  const [internalWidth, setInternalWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Use controlled width if provided, otherwise use internal state
  const width = controlledWidth ?? internalWidth;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta =
        side === "left"
          ? e.clientX - startXRef.current
          : startXRef.current - e.clientX;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startWidthRef.current + delta)
      );

      if (controlledWidth === undefined) {
        setInternalWidth(newWidth);
      }
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, side, minWidth, maxWidth, onWidthChange, controlledWidth]);

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}

      {/* Resize Handle */}
      <div
        className={`absolute top-0 ${
          side === "left" ? "right-0" : "left-0"
        } bottom-0 w-1 cursor-col-resize group hover:bg-blue-500 transition-colors z-50`}
        onMouseDown={handleMouseDown}
      >
        {/* Wider hover area for easier grabbing */}
        <div className="absolute top-0 bottom-0 -left-1 -right-1" />

        {/* Visual indicator on hover */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            side === "left"
              ? "right-0 translate-x-1/2"
              : "left-0 -translate-x-1/2"
          } w-1 h-12 bg-gray-300 dark:bg-dark-divider rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-white dark:bg-dark-background rounded-full"></div>
              <div className="w-0.5 h-3 bg-white dark:bg-dark-background rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay during resize to prevent interference */}
      {isResizing && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize" />
      )}
    </div>
  );
}
