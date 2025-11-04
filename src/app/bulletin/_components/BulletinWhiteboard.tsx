"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { isPrimaryModifierPressed } from "@/components/utils/platform";
import {
  Save,
  Loader2,
  Trash2,
  PenTool,
  Minus,
  Plus,
  Undo2,
  Redo2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { useTheme } from "next-themes";

interface Stroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  thickness: number;
  color: string;
}

interface WhiteboardData {
  strokes: Stroke[];
  viewport: {
    offsetX: number;
    offsetY: number;
    scale: number;
  };
}

interface BulletinWhiteboardProps {
  id: string;
  initialTitle: string;
  data?: WhiteboardData;
  updatedAt: Date;
  onSave: (
    id: string,
    updates: { title?: string; data?: WhiteboardData }
  ) => Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
}

export default function BulletinWhiteboard({
  id,
  initialTitle,
  data,
  updatedAt,
  onSave,
  onDelete,
  isSaving: externalIsSaving = false,
}: BulletinWhiteboardProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  // Default color based on theme: black for light, white for dark
  const defaultColor = isDark ? "#FFFFFF" : "#000000";

  const [title, setTitle] = useState(initialTitle);
  const [strokes, setStrokes] = useState<Stroke[]>(data?.strokes || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [penThickness, setPenThickness] = useState(3);
  const [penColor, setPenColor] = useState<string>(defaultColor);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewport, setViewport] = useState({
    offsetX: data?.viewport?.offsetX || 0,
    offsetY: data?.viewport?.offsetY || 0,
    scale: data?.viewport?.scale || 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<Stroke[][]>([data?.strokes || []]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lastSavedState = useRef({
    title: initialTitle,
    strokes: data?.strokes || [],
    viewport: data?.viewport || { offsetX: 0, offsetY: 0, scale: 1 },
  });

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showColorPicker]);

  // Initialize pen color on mount and update when theme changes
  useEffect(() => {
    const newDefaultColor = isDark ? "#FFFFFF" : "#000000";
    // Initialize to default if no strokes exist, or if current color matches old default
    if (!data?.strokes || data.strokes.length === 0) {
      setPenColor(newDefaultColor);
    } else if (penColor === "#000000" || penColor === "#FFFFFF") {
      // Update if using the old default color
      setPenColor(newDefaultColor);
    }
  }, [isDark, defaultColor, data?.strokes]);

  // Track ctrl key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", () => setIsCtrlPressed(false));
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", () => setIsCtrlPressed(false));
    };
  }, []);

  // Debounced save for drawing data
  const debouncedSave = useDebouncedCallback(
    async (newStrokes: Stroke[], newViewport: typeof viewport) => {
      const strokesChanged =
        JSON.stringify(newStrokes) !==
        JSON.stringify(lastSavedState.current.strokes);
      const viewportChanged =
        JSON.stringify(newViewport) !==
        JSON.stringify(lastSavedState.current.viewport);

      if (strokesChanged || viewportChanged) {
        setIsAutoSaving(true);
        try {
          await onSave(id, {
            data: {
              strokes: newStrokes,
              viewport: newViewport,
            },
          });
          lastSavedState.current = {
            title,
            strokes: newStrokes,
            viewport: newViewport,
          };
          setHasUnsavedChanges(
            title !== lastSavedState.current.title ||
              strokesChanged ||
              viewportChanged
          );
        } catch (error) {
          console.error("Failed to auto-save:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }
    },
    1000
  );

  // Debounced save for title
  const debouncedSaveTitle = useDebouncedCallback(async (newTitle: string) => {
    if (newTitle !== lastSavedState.current.title) {
      setIsAutoSaving(true);
      try {
        await onSave(id, { title: newTitle });
        lastSavedState.current.title = newTitle;
        setHasUnsavedChanges(
          newTitle !== lastSavedState.current.title ||
            JSON.stringify(strokes) !==
              JSON.stringify(lastSavedState.current.strokes)
        );
      } catch (error) {
        console.error("Failed to auto-save title:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }
  }, 800);

  // Get coordinates relative to canvas
  const getCanvasCoordinates = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - viewport.offsetX) / viewport.scale;
    const y = (clientY - rect.top - viewport.offsetY) / viewport.scale;

    return { x, y };
  };

  // Draw all strokes on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up drawing context
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color || defaultColor;
      ctx.lineWidth = stroke.thickness || penThickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // Draw current stroke if drawing
    if (isDrawing && currentStroke) {
      if (currentStroke.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = currentStroke.color || defaultColor;
        ctx.lineWidth = currentStroke.thickness || penThickness;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
        for (let i = 1; i < currentStroke.points.length; i++) {
          ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [strokes, currentStroke, isDrawing, viewport, penThickness]);

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [drawCanvas]);

  // Redraw when strokes or viewport change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button or ctrl/cmd + left click = pan
    if (e.button === 1 || ((e.ctrlKey || e.metaKey) && e.button === 0)) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - viewport.offsetX,
        y: e.clientY - viewport.offsetY,
      });
      e.preventDefault();
      return;
    }

    // Left click = draw (only if not panning and ctrl not pressed)
    if (
      e.button === 0 &&
      !isPanning &&
      !isCtrlPressed &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      if (!coords) return;

      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        points: [coords],
        thickness: penThickness,
        color: penColor,
      };

      setCurrentStroke(newStroke);
      setIsDrawing(true);
      setHasUnsavedChanges(true);
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning || e.ctrlKey || e.metaKey) {
      if (!isPanning && (e.ctrlKey || e.metaKey)) {
        setIsPanning(true);
        setPanStart({
          x: e.clientX - viewport.offsetX,
          y: e.clientY - viewport.offsetY,
        });
      }
      if (isPanning) {
        const newViewport = {
          ...viewport,
          offsetX: e.clientX - panStart.x,
          offsetY: e.clientY - panStart.y,
        };
        setViewport(newViewport);
        // Debounced save during panning
        debouncedSave(strokes, newViewport);
      }
      return;
    }

    // If ctrl is pressed while drawing, cancel the stroke
    if (isDrawing && (e.ctrlKey || e.metaKey || isCtrlPressed)) {
      setCurrentStroke(null);
      setIsDrawing(false);
      return;
    }

    if (
      isDrawing &&
      currentStroke &&
      !isCtrlPressed &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      if (!coords) return;

      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, coords],
      });
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      // Save viewport after panning
      debouncedSave(strokes, viewport);
      return;
    }

    if (isDrawing && currentStroke) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      setCurrentStroke(null);
      setIsDrawing(false);

      // Add to history for undo/redo
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStrokes);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      debouncedSave(newStrokes, viewport);
    }
  };

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
      if (!coords) return;

      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        points: [coords],
        thickness: penThickness,
        color: penColor,
      };

      setCurrentStroke(newStroke);
      setIsDrawing(true);
      setHasUnsavedChanges(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawing && currentStroke && e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
      if (!coords) return;

      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, coords],
      });
    }
  };

  const handleTouchEnd = () => {
    if (isDrawing && currentStroke) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      setCurrentStroke(null);
      setIsDrawing(false);

      // Add to history for undo/redo
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStrokes);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      debouncedSave(newStrokes, viewport);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    setHistoryIndex((currentIndex) => {
      if (currentIndex <= 0) return currentIndex;

      const newIndex = currentIndex - 1;
      const newStrokes = history[newIndex];
      setStrokes(newStrokes);
      setHasUnsavedChanges(true);
      debouncedSave(newStrokes, viewport);

      return newIndex;
    });
  }, [history, viewport, debouncedSave]);

  const handleRedo = useCallback(() => {
    setHistoryIndex((currentIndex) => {
      if (currentIndex >= history.length - 1) return currentIndex;

      const newIndex = currentIndex + 1;
      const newStrokes = history[newIndex];
      setStrokes(newStrokes);
      setHasUnsavedChanges(true);
      debouncedSave(newStrokes, viewport);

      return newIndex;
    });
  }, [history, viewport, debouncedSave]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(id, {
        title,
        data: {
          strokes,
          viewport,
        },
      });
      lastSavedState.current = {
        title,
        strokes,
        viewport,
      };
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [id, onSave, title, strokes, viewport]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (isPrimaryModifierPressed(event) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      } else if (
        isPrimaryModifierPressed(event) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
      ) {
        // Ctrl/Cmd + Z for undo
        event.preventDefault();
        handleUndo();
      } else if (
        (isPrimaryModifierPressed(event) &&
          event.key.toLowerCase() === "z" &&
          event.shiftKey) ||
        (isPrimaryModifierPressed(event) && event.key.toLowerCase() === "y")
      ) {
        // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
        event.preventDefault();
        handleRedo();
      }
    },
    [handleSave, handleUndo, handleRedo]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  const increaseThickness = () => {
    setPenThickness((prev) => Math.min(prev + 1, 20));
  };

  const decreaseThickness = () => {
    setPenThickness((prev) => Math.max(prev - 1, 1));
  };

  const clearCanvas = () => {
    if (
      confirm(
        "Are you sure you want to clear the canvas? This cannot be undone."
      )
    ) {
      const newStrokes: Stroke[] = [];
      setStrokes(newStrokes);
      setCurrentStroke(null);
      setHasUnsavedChanges(true);

      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStrokes);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      debouncedSave(newStrokes, viewport);
    }
  };

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4 px-4 pt-4 flex-shrink-0">
        <div className="flex items-center w-full gap-3">
          <PenTool className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div className="flex flex-col w-full">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                setHasUnsavedChanges(true);
                debouncedSaveTitle(newTitle);
              }}
              className="font-semibold text-xl text-left w-full focus:outline-none border-none bg-transparent dark:text-dark-textPrimary placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Untitled"
            />
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 flex-shrink-0">
          {isAutoSaving && (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          )}
          {hasUnsavedChanges && !isAutoSaving && (
            <button
              onClick={handleSave}
              disabled={isSaving || externalIsSaving}
              className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-dark-textPrimary dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save changes"
            >
              {isSaving || externalIsSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 dark:text-dark-textPrimary dark:hover:bg-red-900/50 dark:hover:text-red-500 rounded-lg transition-all"
            aria-label="Delete whiteboard"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-y border-gray-200 dark:border-dark-divider flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Undo"
              title="Undo (Ctrl/Cmd + Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Redo"
              title="Redo (Ctrl/Cmd + Shift + Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Pen Size */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-dark-textSecondary">
              Pen Size:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={decreaseThickness}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                aria-label="Decrease pen thickness"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium w-8 text-center dark:text-dark-textPrimary">
                {penThickness}
              </span>
              <button
                onClick={increaseThickness}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                aria-label="Increase pen thickness"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div
              className="w-16 h-1 rounded-full"
              style={{
                height: `${penThickness}px`,
                minHeight: "2px",
                backgroundColor: penColor,
              }}
            />
          </div>

          {/* Color Picker */}
          <div
            className="flex items-center gap-3 relative"
            ref={colorPickerRef}
          >
            <span className="text-sm text-gray-600 dark:text-dark-textSecondary">
              Color:
            </span>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              style={{ backgroundColor: penColor }}
              aria-label="Select pen color"
            />
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-dark-background border border-gray-200 dark:border-dark-divider rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-8 gap-2">
                  {/* Default colors based on theme */}
                  <button
                    onClick={() => {
                      setPenColor(defaultColor);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: defaultColor }}
                    title={isDark ? "White" : "Black"}
                  />
                  {/* Common colors */}
                  {[
                    "#000000",
                    "#FFFFFF",
                    "#FF0000",
                    "#00FF00",
                    "#0000FF",
                    "#FFFF00",
                    "#FF00FF",
                    "#00FFFF",
                    "#FFA500",
                    "#800080",
                    "#FFC0CB",
                    "#A52A2A",
                    "#808080",
                    "#008000",
                    "#000080",
                    "#800000",
                  ]
                    .filter((color) => color !== defaultColor)
                    .slice(0, 15)
                    .map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setPenColor(color);
                          setShowColorPicker(false);
                        }}
                        className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-divider">
                  <input
                    type="color"
                    value={penColor}
                    onChange={(e) => {
                      setPenColor(e.target.value);
                      setShowColorPicker(false);
                    }}
                    className="w-full h-8 rounded cursor-pointer"
                    title="Custom color"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={clearCanvas}
          className="text-sm text-gray-600 hover:text-red-600 dark:text-dark-textSecondary dark:hover:text-red-500 transition-colors"
        >
          Clear Canvas
        </button>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative overflow-hidden bg-gray-50 dark:bg-dark-secondary"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        <div className="absolute bottom-4 left-4 text-xs text-gray-400 dark:text-dark-textSecondary bg-white/80 dark:bg-dark-background/80 px-2 py-1 rounded">
          Tip: Hold Ctrl/Cmd and drag to pan, or use middle mouse button
        </div>
      </div>
    </div>
  );
}
