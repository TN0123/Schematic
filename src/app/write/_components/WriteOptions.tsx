"use client";

import React, { useState, useEffect } from "react";
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
  const handleChange = (
    checked: boolean,
    event: MouseEvent | React.SyntheticEvent<MouseEvent | KeyboardEvent, Event>,
    id: string
  ) => {
    onToggle?.(checked);
  };

  if (type === "toggle") {
    return (
      <div className="w-full px-6 py-3 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors duration-200">
        <span className="text-sm font-semibold">{children}</span>
        <Switch
          checked={isToggled}
          onChange={handleChange}
          onColor="#2563eb"
          offColor="#cbd5e1"
          height={24}
          width={48}
          handleDiameter={20}
          uncheckedIcon={false}
          checkedIcon={false}
          className="ml-4"
        />
      </div>
    );
  }

  const buttonStyles = "hover:bg-gray-50 hover:text-gray-600";

  return (
    <button
      onClick={onClick}
      className={`w-full px-6 py-3 flex items-center justify-between text-left transition-all duration-200 text-gray-700 
        ${buttonStyles} outline-none`}
    >
      <span className="text-sm font-semibold">{children}</span>
      {hasSubmenu && <ChevronRight className="w-5 h-5" />}
    </button>
  );
};

export default function SlidingMenu({
  onSelectContext,
  setContinue,
  input,
}: {
  onSelectContext: (context: string) => void;
  setContinue: (enabled: boolean) => void;
  input: string;
}) {
  const [history, setHistory] = useState<string[]>(["main"]);
  const [continueEnabled, setContinueEnabled] = useState(false);
  const [critiqueResult, setCritiqueResult] = useState<string | null>(null);
  const currentMenu = history[history.length - 1];
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    setContinue(continueEnabled);
  }, [continueEnabled, setContinue]);

  const handleNext = async (
    submenu: string | null,
    type?: string,
    label?: string
  ) => {
    if (label === "Critique") {
      const response = await fetch("/api/critique", {
        method: "POST",
        body: JSON.stringify({ text: input }),
      });
      const data = await response.json();
      setCritiqueResult(data.result);
    } else if (submenu && type !== "toggle" && type !== "button") {
      setDirection(1);
      setHistory([...history, submenu]);
    } else if (!submenu && label && label !== "Critique") {
      onSelectContext(label);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white overflow-hidden">
        {history.length > 1 && (
          <div>
            <button
              onClick={() => {
                setDirection(-1);
                setHistory(history.slice(0, -1));
              }}
              className="w-full px-6 py-3 flex items-center text-gray-600 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5 mr-3" />
              <span className="text-sm font-semibold">Back</span>
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
              <div>
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

      <AnimatePresence>
        {critiqueResult && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              scale: { duration: 0.4 },
            }}
            className="mt-6 p-6 max-h-[300px] overflow-y-auto bg-white rounded-2xl shadow-lg"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Critique Result
            </h3>
            <p className="text-gray-700 leading-relaxed">{critiqueResult}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
