"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Switch from "react-switch";

interface MenuItem {
  label: string;
  submenu: string | null;
  type?: "default" | "toggle" | "button";
}

type MenuItems = {
  [key: string]: MenuItem[];
};

const menuItems: MenuItems = {
  main: [
    { label: "Contextualize", submenu: "contextualize", type: "default" },
    { label: "Continue", submenu: null, type: "toggle" },
    { label: "Critique", submenu: null, type: "button" },
  ],
  contextualize: [
    { label: "Email", submenu: null },
    { label: "Academic", submenu: null },
    { label: "Casual", submenu: null },
    { label: "Auto", submenu: null },
  ],
};

interface MenuButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  hasSubmenu?: boolean;
  type?: "default" | "toggle" | "button";
  isToggled?: boolean;
  onToggle?: (checked: boolean) => void;
}

const MenuButton = ({
  children,
  onClick,
  hasSubmenu = false,
  type = "default",
  isToggled = false,
  onToggle,
}: MenuButtonProps) => {
  // Create a handler that matches react-switch's expected signature
  const handleChange = (
    checked: boolean,
    event: MouseEvent | React.SyntheticEvent<MouseEvent | KeyboardEvent, Event>,
    id: string
  ) => {
    onToggle?.(checked);
  };

  if (type === "toggle") {
    return (
      <div className="w-full px-4 py-3 flex items-center justify-between text-gray-700">
        <span className="font-medium">{children}</span>
        <Switch
          checked={isToggled}
          onChange={handleChange}
          onColor="#2563eb"
          offColor="#cbd5e1"
          height={20}
          width={40}
          handleDiameter={16}
        />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors duration-200 text-gray-700 
        ${
          type === "button"
            ? "hover:bg-blue-600 hover:text-white"
            : "hover:bg-blue-50 hover:text-blue-600"
        }`}
    >
      <span className="font-medium">{children}</span>
      {hasSubmenu && <ChevronRight className="w-4 h-4" />}
    </button>
  );
};

export default function SlidingMenu({
  onSelectContext,
}: {
  onSelectContext: (context: string) => void;
}) {
  const [history, setHistory] = useState<string[]>(["main"]);
  const [continueEnabled, setContinueEnabled] = useState(false);
  const currentMenu = history[history.length - 1];
  const [direction, setDirection] = useState(0);

  const handleNext = (
    submenu: string | null,
    type?: string,
    label?: string
  ) => {
    if (submenu && type !== "toggle" && type !== "button") {
      setDirection(1);
      setHistory([...history, submenu]);
    } else if (!submenu && label) {
      // If it's a final option, pass it to ChatWindow
      onSelectContext(label);
    }
  };

  return (
    <div className="w-3/4 mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        {history.length > 1 && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => {
                setDirection(-1);
                setHistory(history.slice(0, -1));
              }}
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
              animate={{ x: 0, opacity: 1, position: "relative" }}
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
                    onClick={() =>
                      handleNext(item.submenu, item.type, item.label)
                    }
                    hasSubmenu={
                      !!item.submenu &&
                      item.type !== "toggle" &&
                      item.type !== "button"
                    }
                    type={item.type}
                    isToggled={
                      item.label === "Continue" ? continueEnabled : false
                    }
                    onToggle={
                      item.label === "Continue" ? setContinueEnabled : undefined
                    }
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
