"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trash2,
  Save,
  Loader2,
  Sparkles,
  Clock,
  Plus,
  X,
  Check,
  Calendar,
  Type,
  List,
  Hash,
  Table,
  Share2,
  GitBranch,
  Workflow,
  Brain,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import dynamic from "next/dynamic";
import InteractiveTree, { TreeNode } from "./InteractiveTree";
import InteractiveFlowchart, { FlowchartData } from "./InteractiveFlowchart";
import InteractiveMindMap, { MindMapData } from "./InteractiveMindMap";

// Dynamically import graph component with SSR disabled due to browser dependencies
const SimpleGraph = dynamic(() => import("./SimpleGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 border dark:border-dark-divider rounded-lg">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Loading graph...
        </p>
      </div>
    </div>
  ),
});

// Define types for dynamic import
export interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
  }>;
}

// Define the schema types for dynamic components
export interface DynamicComponent {
  id: string;
  type:
    | "title"
    | "text"
    | "textarea"
    | "checklist"
    | "number"
    | "date"
    | "table"
    | "graph"
    | "tree"
    | "flowchart"
    | "mindmap";
  label: string;
  placeholder?: string;
  required?: boolean;
  config?: any;
}

export interface DynamicSchema {
  components: DynamicComponent[];
}

interface BulletinDynamicProps {
  id: string;
  initialTitle: string;
  initialSchema: DynamicSchema;
  initialData: Record<string, any>;
  updatedAt: Date;
  onSave: (
    id: string,
    updates: { title?: string; data?: Record<string, any> }
  ) => Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export default function BulletinDynamic({
  id,
  initialTitle,
  initialSchema,
  initialData,
  updatedAt,
  onSave,
  onDelete,
  isSaving: externalIsSaving = false,
}: BulletinDynamicProps) {
  const [title, setTitle] = useState(initialTitle);
  const [data, setData] = useState<Record<string, any>>(initialData || {});
  const [schema] = useState<DynamicSchema>(initialSchema);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const lastSavedState = useRef({
    title: initialTitle,
    data: initialData || {},
  });

  // Debounced save for data
  const debouncedSaveData = useDebouncedCallback(
    async (newData: Record<string, any>) => {
      if (
        JSON.stringify(newData) !== JSON.stringify(lastSavedState.current.data)
      ) {
        setIsAutoSaving(true);
        try {
          await onSave(id, { data: newData });
          lastSavedState.current.data = newData;

          const titleChanged = title !== lastSavedState.current.title;
          const dataChanged =
            JSON.stringify(newData) !==
            JSON.stringify(lastSavedState.current.data);
          setHasUnsavedChanges(titleChanged || dataChanged);
        } catch (error) {
          console.error("Failed to auto-save data:", error);
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

        const titleChanged = newTitle !== lastSavedState.current.title;
        const dataChanged =
          JSON.stringify(data) !== JSON.stringify(lastSavedState.current.data);
        setHasUnsavedChanges(titleChanged || dataChanged);
      } catch (error) {
        console.error("Failed to auto-save title:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }
  }, 800);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    const hasChanges =
      newTitle !== lastSavedState.current.title ||
      JSON.stringify(data) !== JSON.stringify(lastSavedState.current.data);
    setHasUnsavedChanges(hasChanges);
    debouncedSaveTitle(newTitle);
  };

  const handleDataChange = (componentId: string, value: any) => {
    const newData = { ...data, [componentId]: value };
    setData(newData);

    const hasChanges =
      title !== lastSavedState.current.title ||
      JSON.stringify(newData) !== JSON.stringify(lastSavedState.current.data);
    setHasUnsavedChanges(hasChanges);

    debouncedSaveData(newData);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(id, { title, data });
      lastSavedState.current = { title, data };
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Component renderers for different types
  const renderComponent = (component: DynamicComponent) => {
    const value = data[component.id] || "";

    switch (component.type) {
      case "title":
        return (
          <div key={component.id} className="mb-4">
            <input
              type="text"
              value={value}
              onChange={(e) => handleDataChange(component.id, e.target.value)}
              placeholder={component.placeholder || component.label}
              className="w-full text-2xl font-bold bg-transparent border-none outline-none dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        );

      case "text":
        return (
          <div key={component.id} className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
              <Type className="inline w-4 h-4 mr-1" />
              {component.label}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleDataChange(component.id, e.target.value)}
              placeholder={component.placeholder}
              className="w-full p-3 border dark:border-dark-divider rounded-lg dark:bg-dark-secondary dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
            />
          </div>
        );

      case "textarea":
        return (
          <div key={component.id} className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
              <List className="inline w-4 h-4 mr-1" />
              {component.label}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleDataChange(component.id, e.target.value)}
              placeholder={component.placeholder}
              rows={4}
              className="w-full p-3 border dark:border-dark-divider rounded-lg dark:bg-dark-secondary dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 resize-vertical"
            />
          </div>
        );

      case "number":
        return (
          <div key={component.id} className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
              <Hash className="inline w-4 h-4 mr-1" />
              {component.label}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) =>
                handleDataChange(component.id, parseFloat(e.target.value) || 0)
              }
              placeholder={component.placeholder}
              className="w-full p-3 border dark:border-dark-divider rounded-lg dark:bg-dark-secondary dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
            />
          </div>
        );

      case "date":
        return (
          <div key={component.id} className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
              <Calendar className="inline w-4 h-4 mr-1" />
              {component.label}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleDataChange(component.id, e.target.value)}
              className="w-full p-3 border dark:border-dark-divider rounded-lg dark:bg-dark-secondary dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
            />
          </div>
        );

      case "checklist":
        const items: ChecklistItem[] = value || [];

        const addChecklistItem = () => {
          const newItem: ChecklistItem = {
            id: Date.now().toString(),
            text: "",
            checked: false,
          };
          handleDataChange(component.id, [...items, newItem]);
        };

        const updateChecklistItem = (
          itemId: string,
          updates: Partial<ChecklistItem>
        ) => {
          const updatedItems = items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          );
          handleDataChange(component.id, updatedItems);
        };

        const removeChecklistItem = (itemId: string) => {
          const filteredItems = items.filter((item) => item.id !== itemId);
          handleDataChange(component.id, filteredItems);
        };

        return (
          <div key={component.id} className="mb-6">
            <label className="block text-sm font-medium mb-3 dark:text-dark-textPrimary">
              <Check className="inline w-4 h-4 mr-1" />
              {component.label}
            </label>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) =>
                      updateChecklistItem(item.id, {
                        checked: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-green-600 dark:bg-dark-secondary dark:border-dark-divider rounded focus:ring-green-500 dark:focus:ring-green-400"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      updateChecklistItem(item.id, { text: e.target.value })
                    }
                    placeholder="Add item..."
                    className={`flex-1 p-2 border dark:border-dark-divider rounded dark:bg-dark-secondary dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 ${
                      item.checked ? "line-through opacity-60" : ""
                    }`}
                  />
                  <button
                    onClick={() => removeChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addChecklistItem}
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add item
              </button>
            </div>
          </div>
        );

      case "table":
        const { rows, cols } = component.config || { rows: 4, cols: 4 };

        // Ensure we have properly initialized table data
        let tableData: string[][];
        if (!value || !Array.isArray(value)) {
          // Initialize with empty strings for all cells
          tableData = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => "")
          );
        } else {
          // Ensure existing data matches the required dimensions
          tableData = Array.from({ length: rows }, (_, rowIndex) =>
            Array.from(
              { length: cols },
              (_, colIndex) =>
                (value[rowIndex] && value[rowIndex][colIndex]) || ""
            )
          );
        }

        const handleTableCellChange = (
          rowIndex: number,
          colIndex: number,
          cellValue: string
        ) => {
          // Create a proper deep copy with the updated value
          const newTableData = tableData.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              if (rIdx === rowIndex && cIdx === colIndex) {
                return cellValue;
              }
              return cell;
            })
          );
          handleDataChange(component.id, newTableData);
        };

        return (
          <div key={component.id} className="mb-6">
            <label className="block text-sm font-medium mb-3 dark:text-dark-textPrimary">
              <Table className="inline w-4 h-4 mr-1" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-gray-600 ml-2">
                ({rows}×{cols} editable table)
              </span>
            </label>
            <div className="overflow-x-auto border dark:border-dark-divider rounded-lg">
              <table className="w-full border-collapse min-w-max">
                <tbody>
                  {Array.from({ length: rows }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: cols }).map((_, colIndex) => (
                        <td
                          key={colIndex}
                          className="border-r border-b dark:border-dark-divider last:border-r-0 p-0 min-w-[120px] h-10"
                        >
                          <input
                            type="text"
                            value={tableData[rowIndex][colIndex] || ""}
                            onChange={(e) =>
                              handleTableCellChange(
                                rowIndex,
                                colIndex,
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Tab") {
                                e.preventDefault();
                                const nextCol = (colIndex + 1) % cols;
                                const nextRow =
                                  nextCol === 0
                                    ? (rowIndex + 1) % rows
                                    : rowIndex;
                                const nextInput = document.querySelector(
                                  `[data-table-cell="${component.id}-${nextRow}-${nextCol}"]`
                                ) as HTMLInputElement;
                                nextInput?.focus();
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                const nextRow = (rowIndex + 1) % rows;
                                const nextInput = document.querySelector(
                                  `[data-table-cell="${component.id}-${nextRow}-${colIndex}"]`
                                ) as HTMLInputElement;
                                nextInput?.focus();
                              }
                            }}
                            className="w-full h-full px-3 py-2 dark:bg-dark-secondary dark:text-dark-textPrimary border-none outline-none focus:bg-green-50 dark:focus:bg-neutral-900/20 transition-colors"
                            placeholder={`Cell ${String.fromCharCode(
                              65 + colIndex
                            )}${rowIndex + 1}`}
                            onFocus={(e) => e.target.select()}
                            data-table-cell={`${component.id}-${rowIndex}-${colIndex}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-600">
              Click any cell to edit. Use Tab to navigate right/down, Enter to
              move to next row.
            </div>
          </div>
        );

      case "graph":
        return (
          <div key={component.id} className="mb-6">
            <label className="block text-sm font-medium mb-3 dark:text-dark-textPrimary">
              <Share2 className="inline w-4 h-4 mr-1" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-gray-600 ml-2">
                (Interactive knowledge graph)
              </span>
            </label>
            <SimpleGraph
              data={value || { nodes: [], links: [] }}
              onChange={(newData) => handleDataChange(component.id, newData)}
              height={component.config?.height || 400}
            />
          </div>
        );

      case "tree":
        return (
          <div key={component.id} className="mb-6">
            <label className="block text-sm font-medium mb-3 dark:text-dark-textPrimary">
              <GitBranch className="inline w-4 h-4 mr-1" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-gray-600 ml-2">
                (Hierarchical tree structure)
              </span>
            </label>
            <InteractiveTree
              data={value || { id: "", name: "", children: [] }}
              onChange={(newData) => handleDataChange(component.id, newData)}
              height={component.config?.height || 400}
            />
          </div>
        );

      case "flowchart":
        return (
          <div key={component.id} className="mb-6">
            <label className="block text-sm font-medium mb-3 dark:text-dark-textPrimary">
              <Workflow className="inline w-4 h-4 mr-1" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-gray-600 ml-2">
                (Interactive process flowchart)
              </span>
            </label>
            <InteractiveFlowchart
              data={value || { nodes: [] }}
              onChange={(newData) => handleDataChange(component.id, newData)}
              height={component.config?.height || 400}
            />
          </div>
        );

      case "mindmap":
        return (
          <div key={component.id} className="mb-6">
            <label className="block text-sm font-medium mb-3 dark:text-dark-textPrimary">
              <Brain className="inline w-4 h-4 mr-1" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-gray-600 ml-2">
                (Interactive mind map)
              </span>
            </label>
            <InteractiveMindMap
              data={value || { centerNode: "", nodes: [] }}
              onChange={(newData) => handleDataChange(component.id, newData)}
              height={component.config?.height || 400}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col dark:bg-dark-background transition-all">
      {/* Header */}
      <div className="flex-shrink-0 border-b dark:border-dark-divider p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Dynamic Note
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  disabled={isSaving || externalIsSaving || isAutoSaving}
                  className={`p-2 rounded-lg transition-colors
                    text-light-icon hover:text-light-accent hover:bg-light-hover
                    dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                    ${
                      isSaving || externalIsSaving || isAutoSaving
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  aria-label="Save changes"
                >
                  {isSaving || externalIsSaving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 text-light-icon hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
                  aria-label="Delete item"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled note"
            className="text-2xl font-bold bg-transparent border-none outline-none w-full dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last updated {formatDistanceToNow(updatedAt)} ago
        </div>
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {schema.components.map(renderComponent)}
        </div>
      </div>
    </div>
  );
}
