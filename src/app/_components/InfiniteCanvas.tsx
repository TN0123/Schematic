"use client";

import React from "react";

type InfiniteCanvasProps = {
  children: React.ReactNode;
};

export default function InfiniteCanvas({ children }: InfiniteCanvasProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const lastOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastOffsetRef.current = { ...offset };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: lastOffsetRef.current.x + dx,
      y: lastOffsetRef.current.y + dy,
    });
  };

  const endDrag = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  React.useEffect(() => {
    const handleMouseUp = () => endDrag();
    const handleLeave = () => endDrag();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, [isDragging]);

  const hasPanned = offset.x !== 0 || offset.y !== 0;

  const resetPosition = () => {
    setOffset({ x: 0, y: 0 });
    lastOffsetRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="w-full">
      {/* Mobile: render normally, untouched */}
      <div className="md:hidden">{children}</div>

      {/* Desktop: infinite canvas */}
      <div
        ref={containerRef}
        className={
          "relative hidden md:block md:min-h-screen overflow-hidden select-none" +
          (isDragging ? " cursor-grabbing" : " cursor-grab")
        }
        onMouseDown={onMouseDown}
      >
        {/* Transform layer */}
        <div
          className="will-change-transform"
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
        >
          {/* Content wrapper keeps normal layout width */}
          <div className="pointer-events-auto select-text">{children}</div>
        </div>

        {/* Reset button, desktop only, show when panned */}
        {hasPanned && (
          <div className="pointer-events-none absolute top-3 left-0 right-0 flex justify-center">
            <button
              type="button"
              onClick={resetPosition}
              className="pointer-events-auto text-sm rounded-md bg-neutral-800/80 text-white px-3 py-1 shadow-md backdrop-blur hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
