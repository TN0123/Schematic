"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MenuItem {
  label: string;
  submenu: string | null;
}

type MenuItems = {
  [key: string]: MenuItem[];
};

const menuItems: MenuItems = {
  main: [
    { label: "Contextualize", submenu: "contextualize" },
    { label: "Continue", submenu: "continue" },
    { label: "Critique", submenu: "critique" },
  ],
  contextualize: [
    { label: "Option 1", submenu: null },
    { label: "Option 2", submenu: null },
  ],
  continue: [
    { label: "Option A", submenu: null },
    { label: "Option B", submenu: null },
  ],
  critique: [
    { label: "Feedback", submenu: null },
    { label: "Review", submenu: null },
  ],
};

const MenuButton = ({
  children,
  onClick,
  hasSubmenu = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  hasSubmenu?: boolean;
}) => (
  <button
    onClick={onClick}
    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-50 transition-colors duration-200 text-gray-700 hover:text-blue-600"
  >
    <span className="font-medium">{children}</span>
    {hasSubmenu && <ChevronRight className="w-4 h-4" />}
  </button>
);

export default function SlidingMenu() {
  const [history, setHistory] = useState<string[]>(["main"]);
  const currentMenu = history[history.length - 1];
  const [direction, setDirection] = useState(0);

  const handleNext = (submenu: string | null) => {
    if (submenu) {
      setDirection(1);
      setHistory([...history, submenu]);
    }
  };

  const handleBack = () => {
    if (history.length > 1) {
      setDirection(-1);
      setHistory(history.slice(0, -1));
    }
  };

  return (
    <div className="w-3/4 mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        {history.length > 1 && (
          <div className="border-b border-gray-200">
            <button
              onClick={handleBack}
              className="w-full px-4 py-3 flex items-center text-gray-600 hover:bg-gray-50 transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        )}

        <div className="relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentMenu}
              custom={direction}
              initial={{
                x: direction * 100 + "%",
                opacity: 0,
                position: "absolute",
                width: "100%",
              }}
              animate={{
                x: 0,
                opacity: 1,
                position: "relative",
              }}
              exit={{
                x: direction * -100 + "%",
                opacity: 0,
                position: "absolute",
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 35,
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              <div className="py-1">
                {menuItems[currentMenu].map((item, index) => (
                  <MenuButton
                    key={index}
                    onClick={() => handleNext(item.submenu)}
                    hasSubmenu={!!item.submenu}
                  >
                    {item.label}
                  </MenuButton>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
