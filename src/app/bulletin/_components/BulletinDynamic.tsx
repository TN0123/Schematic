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
  PencilRuler,
  MousePointer,
  GripVertical,
  SquarePen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import dynamic from "next/dynamic";
import {
  DndContext,
  closestCenter,
  rectIntersection,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";
import InteractiveTree, { TreeNode } from "./InteractiveTree";
import InteractiveFlowchart, { FlowchartData } from "./InteractiveFlowchart";
import InteractiveMindMap, { MindMapData } from "./InteractiveMindMap";
import NoteRefactorModal from "./NoteRefactorModal";

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
    | "mindmap"
    | "button";
  label: string;
  placeholder?: string;
  required?: boolean;
  config?: any;
}

// Define layout row structure
export interface LayoutRow {
  id: string;
  components: string[]; // Array of component IDs in this row
  gap?: number; // Optional gap size between components (1-8, default 4)
}

export interface DynamicSchema {
  components: DynamicComponent[];
  layout?: LayoutRow[]; // Optional layout structure - if not provided, falls back to single column
}

// Define button action types
export interface ButtonAction {
  type:
    | "table-add-row"
    | "table-remove-row"
    | "table-add-column"
    | "table-remove-column"
    | "increment-number"
    | "decrement-number"
    | "set-value"
    | "add-checklist-item"
    | "toggle-checklist-item"
    | "set-date-today"
    | "clear-component";
  targetComponentId: string;
  value?: any;
  incrementBy?: number;
  checklistItemText?: string;
}

interface BulletinDynamicProps {
  id: string;
  initialTitle: string;
  initialSchema: DynamicSchema;
  initialData: Record<string, any>;
  updatedAt: Date;
  onSave: (
    id: string,
    updates: {
      title?: string;
      data?: Record<string, any>;
      schema?: DynamicSchema;
    }
  ) => Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

// DraggableComponent wrapper for individual components
interface DraggableComponentProps {
  component: DynamicComponent;
  children: React.ReactNode;
  onDelete: () => void;
  isEditMode: boolean;
}

function DraggableComponent({
  component,
  children,
  onDelete,
  isEditMode,
}: DraggableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative h-full ${isDragging ? "z-50" : ""}`}
    >
      {/* Drag handle - only show in edit mode */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-8 top-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 text-gray-400 hover:text-gray-600 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary cursor-grab active:cursor-grabbing bg-white dark:bg-dark-secondary rounded-lg shadow-md border border-gray-200 dark:border-dark-divider z-20 hover:shadow-lg transform hover:scale-105"
          aria-label={`Drag ${component.label}`}
          title={`Drag ${component.label}`}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Delete button - only show in edit mode */}
      {isEditMode && (
        <button
          onClick={onDelete}
          className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-dark-secondary rounded-full shadow-md border border-gray-200 dark:border-dark-divider z-20 hover:shadow-lg transform hover:scale-105 hover:bg-red-50 dark:hover:bg-red-900/20"
          aria-label={`Delete ${component.label}`}
          title={`Delete ${component.label}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {children}
    </div>
  );
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
  const [schema, setSchema] = useState<DynamicSchema>(initialSchema);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isRefactorModalOpen, setIsRefactorModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const lastSavedState = useRef({
    title: initialTitle,
    data: initialData || {},
  });

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleSchemaChange = async (updatedSchema: DynamicSchema) => {
    setSchema(updatedSchema);
    setHasUnsavedChanges(true);

    // Auto-save the schema changes
    setIsAutoSaving(true);
    try {
      await onSave(id, { schema: updatedSchema });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to auto-save schema:", error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleComponentLabelChange = (
    componentId: string,
    newLabel: string
  ) => {
    const newSchema = {
      ...schema,
      components: schema.components.map((comp) =>
        comp.id === componentId ? { ...comp, label: newLabel } : comp
      ),
    };
    handleSchemaChange(newSchema);
  };

  const handleComponentDescriptionChange = (
    componentId: string,
    newDescription: string
  ) => {
    const newSchema = {
      ...schema,
      components: schema.components.map((comp) =>
        comp.id === componentId
          ? {
              ...comp,
              config: {
                ...comp.config,
                description: newDescription,
              },
            }
          : comp
      ),
    };
    handleSchemaChange(newSchema);
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

  const handleRefactor = async (
    newTitle: string,
    newSchema: DynamicSchema,
    mappedData: Record<string, any>
  ) => {
    setIsSaving(true);
    try {
      await onSave(id, {
        title: newTitle,
        schema: newSchema,
        data: mappedData,
      });
      setTitle(newTitle);
      setSchema(newSchema);
      setData(mappedData);
      lastSavedState.current = { title: newTitle, data: mappedData };
      setHasUnsavedChanges(false);
      setIsRefactorModalOpen(false);
    } catch (error) {
      console.error("Failed to refactor note:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComponent = async (componentId: string) => {
    // Remove component from schema
    const newComponents = schema.components.filter(
      (comp) => comp.id !== componentId
    );

    // Update layout to remove the component from any rows
    let newLayout = schema.layout;
    if (newLayout) {
      newLayout = newLayout
        .map((row) => ({
          ...row,
          components: row.components.filter((id) => id !== componentId),
        }))
        .filter((row) => row.components.length > 0); // Remove empty rows
    }

    const newSchema = {
      ...schema,
      components: newComponents,
      layout: newLayout,
    };

    // Remove component data
    const newData = { ...data };
    delete newData[componentId];

    // Update state
    setSchema(newSchema);
    setData(newData);
    setHasUnsavedChanges(true);

    // Auto-save the changes
    setIsAutoSaving(true);
    try {
      await onSave(id, { schema: newSchema, data: newData });
      lastSavedState.current.data = newData;
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to delete component:", error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleButtonAction = (action: ButtonAction) => {
    const targetComponent = schema.components.find(
      (comp) => comp.id === action.targetComponentId
    );

    if (!targetComponent) {
      console.error(`Target component ${action.targetComponentId} not found`);
      return;
    }

    const currentValue = data[action.targetComponentId] || "";
    let newValue = currentValue;

    switch (action.type) {
      case "table-add-row":
        if (targetComponent.type === "table") {
          const { cols } = targetComponent.config || { cols: 4 };
          const tableData = Array.isArray(currentValue) ? currentValue : [];

          // Create new row with specified value or empty cells
          let newRow;
          if (action.value && Array.isArray(action.value)) {
            // Use provided row data, padding with empty strings if needed
            newRow = Array.from(
              { length: cols },
              (_, i) => action.value[i] || ""
            );
          } else if (action.value && typeof action.value === "string") {
            // Put the value in the first column, rest empty
            newRow = Array.from({ length: cols }, (_, i) =>
              i === 0 ? action.value : ""
            );
          } else {
            // Default: add row with today's date in first column if not specified
            const today = new Date().toISOString().split("T")[0];
            newRow = Array.from({ length: cols }, (_, i) =>
              i === 0 ? today : ""
            );
          }

          newValue = [...tableData, newRow];
        }
        break;

      case "table-remove-row":
        if (targetComponent.type === "table" && Array.isArray(currentValue)) {
          if (currentValue.length > 1) {
            newValue = currentValue.slice(0, -1);
          }
        }
        break;

      case "table-add-column":
        if (targetComponent.type === "table") {
          const tableData = Array.isArray(currentValue) ? currentValue : [[]];
          const newCols = (targetComponent.config?.cols || 4) + 1;

          // Add empty column to each row
          newValue = tableData.map((row) => [...(row || []), ""]);

          // Update component config
          const newSchema = {
            ...schema,
            components: schema.components.map((comp) =>
              comp.id === action.targetComponentId
                ? { ...comp, config: { ...comp.config, cols: newCols } }
                : comp
            ),
          };
          setSchema(newSchema);
        }
        break;

      case "table-remove-column":
        if (targetComponent.type === "table" && Array.isArray(currentValue)) {
          const currentCols = targetComponent.config?.cols || 4;
          if (currentCols > 1) {
            const newCols = currentCols - 1;

            // Remove last column from each row
            newValue = currentValue.map((row) => (row || []).slice(0, -1));

            // Update component config
            const newSchema = {
              ...schema,
              components: schema.components.map((comp) =>
                comp.id === action.targetComponentId
                  ? { ...comp, config: { ...comp.config, cols: newCols } }
                  : comp
              ),
            };
            setSchema(newSchema);
          }
        }
        break;

      case "increment-number":
        if (targetComponent.type === "number") {
          const increment = action.incrementBy || 1;
          const currentNum = parseFloat(currentValue) || 0;
          newValue = currentNum + increment;
        }
        break;

      case "decrement-number":
        if (targetComponent.type === "number") {
          const decrement = action.incrementBy || 1;
          const currentNum = parseFloat(currentValue) || 0;
          newValue = currentNum - decrement;
        }
        break;

      case "set-value":
        newValue = action.value;
        break;

      case "add-checklist-item":
        if (targetComponent.type === "checklist") {
          const items = Array.isArray(currentValue) ? currentValue : [];
          const newItem: ChecklistItem = {
            id: Date.now().toString(),
            text: action.checklistItemText || action.value || "New item",
            checked: false,
          };
          newValue = [...items, newItem];
        }
        break;

      case "set-date-today":
        if (targetComponent.type === "date") {
          newValue = new Date().toISOString().split("T")[0];
        }
        break;

      case "clear-component":
        if (targetComponent.type === "table") {
          const { cols } = targetComponent.config || { cols: 4 };
          newValue = [Array.from({ length: cols }, () => "")];
        } else if (targetComponent.type === "checklist") {
          newValue = [];
        } else {
          newValue = "";
        }
        break;

      default:
        console.error(`Unknown button action type: ${action.type}`);
        return;
    }

    // Update the data
    handleDataChange(action.targetComponentId, newValue);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeComponentId = active.id as string;
    const overComponentId = over.id as string;

    // Find which rows contain these components
    let activeRowIndex = -1;
    let activeComponentIndex = -1;
    let overRowIndex = -1;
    let overComponentIndex = -1;

    // If no layout exists, create a simple single-column layout
    if (!schema.layout || schema.layout.length === 0) {
      const newLayout: LayoutRow[] = [
        {
          id: "default-row",
          components: schema.components.map((comp) => comp.id),
        },
      ];
      setSchema({
        ...schema,
        layout: newLayout,
      });
      return;
    }

    // Find positions of active and over components
    schema.layout.forEach((row, rowIndex) => {
      const activeIndex = row.components.indexOf(activeComponentId);
      const overIndex = row.components.indexOf(overComponentId);

      if (activeIndex !== -1) {
        activeRowIndex = rowIndex;
        activeComponentIndex = activeIndex;
      }
      if (overIndex !== -1) {
        overRowIndex = rowIndex;
        overComponentIndex = overIndex;
      }
    });

    if (activeRowIndex === -1 || overRowIndex === -1) return;

    const newLayout = [...schema.layout];

    if (activeRowIndex === overRowIndex) {
      // Same row - reorder within row
      const row = { ...newLayout[activeRowIndex] };
      row.components = arrayMove(
        row.components,
        activeComponentIndex,
        overComponentIndex
      );
      newLayout[activeRowIndex] = row;
    } else {
      // Different rows - move between rows
      const activeRow = { ...newLayout[activeRowIndex] };
      const overRow = { ...newLayout[overRowIndex] };

      // Remove from active row
      activeRow.components = activeRow.components.filter(
        (id) => id !== activeComponentId
      );

      // Add to over row at the position of the over component
      overRow.components.splice(overComponentIndex, 0, activeComponentId);

      newLayout[activeRowIndex] = activeRow;
      newLayout[overRowIndex] = overRow;

      // Remove empty rows
      const filteredLayout = newLayout.filter(
        (row) => row.components.length > 0
      );

      setSchema({
        ...schema,
        layout: filteredLayout,
      });
      setHasUnsavedChanges(true);

      // Auto-save the layout changes
      setIsAutoSaving(true);
      onSave(id, { schema: { ...schema, layout: filteredLayout } })
        .then(() => {
          setHasUnsavedChanges(false);
        })
        .catch((error) => {
          console.error("Failed to auto-save layout:", error);
        })
        .finally(() => {
          setIsAutoSaving(false);
        });

      return;
    }

    setSchema({
      ...schema,
      layout: newLayout,
    });
    setHasUnsavedChanges(true);

    // Auto-save the layout changes
    setIsAutoSaving(true);
    onSave(id, { schema: { ...schema, layout: newLayout } })
      .then(() => {
        setHasUnsavedChanges(false);
      })
      .catch((error) => {
        console.error("Failed to auto-save layout:", error);
      })
      .finally(() => {
        setIsAutoSaving(false);
      });
  };

  // Helper function to render components with layout
  const renderComponentsWithLayout = () => {
    // If no layout is defined, fall back to single column layout
    if (!schema.layout || schema.layout.length === 0) {
      const allComponentIds = schema.components.map((comp) => comp.id);

      return (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allComponentIds}
            strategy={verticalListSortingStrategy}
          >
            <div className={`space-y-8 ${isEditMode ? "pl-12" : ""}`}>
              {schema.components.map((component) => (
                <DraggableComponent
                  key={component.id}
                  component={component}
                  onDelete={() => handleDeleteComponent(component.id)}
                  isEditMode={isEditMode}
                >
                  {renderComponent(component)}
                </DraggableComponent>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-dark-divider transform rotate-2">
                <div className="text-sm font-semibold text-gray-700 dark:text-dark-textPrimary">
                  {schema.components.find((comp) => comp.id === activeId)
                    ?.label || "Component"}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      );
    }

    // Create a map for quick component lookup
    const componentMap = new Map(
      schema.components.map((comp) => [comp.id, comp])
    );

    // Get all component IDs for the sortable context
    const allComponentIds = schema.layout.flatMap((row) => row.components);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`space-y-8 ${isEditMode ? "pl-12" : ""}`}>
          {schema.layout.map((row) => {
            const gapSize = row.gap || 4;
            // Map gap size to valid Tailwind classes
            const gapClassMap = {
              1: "gap-2",
              2: "gap-3",
              3: "gap-4",
              4: "gap-6",
              5: "gap-8",
              6: "gap-10",
              7: "gap-12",
              8: "gap-16",
            };
            const gapClass =
              gapClassMap[gapSize as keyof typeof gapClassMap] || "gap-6";

            return (
              <SortableContext
                key={row.id}
                items={row.components}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  className={`flex flex-wrap ${gapClass} items-stretch content-start`}
                >
                  {row.components.map((componentId) => {
                    const component = componentMap.get(componentId);
                    if (!component) {
                      console.warn(
                        `Component with ID ${componentId} not found in schema`
                      );
                      return null;
                    }

                    // Calculate flex basis for responsive layout
                    const itemCount = row.components.length;
                    let flexBasis = "flex-1"; // Default to equal width

                    // For 2 items, use equal width
                    if (itemCount === 2) {
                      flexBasis = "flex-1";
                    }
                    // For 3 items, use equal width
                    else if (itemCount === 3) {
                      flexBasis = "flex-1";
                    }
                    // For 4+ items, wrap to smaller sizes
                    else if (itemCount >= 4) {
                      flexBasis =
                        "flex-1 min-w-0 md:flex-none md:w-1/2 lg:w-1/3";
                    }

                    return (
                      <div key={componentId} className={`${flexBasis} min-w-0`}>
                        <DraggableComponent
                          component={component}
                          onDelete={() => handleDeleteComponent(component.id)}
                          isEditMode={isEditMode}
                        >
                          {renderComponent(component)}
                        </DraggableComponent>
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            );
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-dark-divider transform rotate-2">
              <div className="text-sm font-semibold text-gray-700 dark:text-dark-textPrimary">
                {schema.components.find((comp) => comp.id === activeId)
                  ?.label || "Component"}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  // Component renderers for different types
  const renderComponent = (component: DynamicComponent) => {
    const value = data[component.id] || "";

    switch (component.type) {
      case "title":
        return (
          <div key={component.id} className="mb-6">
            <input
              type="text"
              value={value}
              onChange={(e) => handleDataChange(component.id, e.target.value)}
              placeholder={component.placeholder || component.label}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none dark:text-dark-textPrimary placeholder:text-gray-300 dark:placeholder:text-neutral-400 leading-tight tracking-tight hover:bg-gray-50 dark:hover:bg-dark-secondary rounded-lg px-3 py-2 transition-all duration-200 focus:bg-white dark:focus:bg-dark-secondary focus:shadow-sm"
            />
          </div>
        );

      case "text":
        return (
          <div key={component.id} className="mb-6 group">
            <label className="flex items-center text-sm font-semibold mb-3 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Type className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
            </label>
            <div className="relative">
              <input
                type="text"
                value={value}
                onChange={(e) => handleDataChange(component.id, e.target.value)}
                placeholder={component.placeholder}
                className="w-full px-4 py-3 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-lg text-gray-900 dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20 focus:border-green-500 dark:focus:border-green-400 shadow-sm hover:shadow-md focus:shadow-md"
              />
            </div>
          </div>
        );

      case "textarea":
        return (
          <div key={component.id} className="mb-6 group">
            <label className="flex items-center text-sm font-semibold mb-3 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <List className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
            </label>
            <div className="relative">
              <textarea
                value={value}
                onChange={(e) => handleDataChange(component.id, e.target.value)}
                placeholder={component.placeholder}
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-lg text-gray-900 dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20 focus:border-green-500 dark:focus:border-green-400 shadow-sm hover:shadow-md focus:shadow-md resize-y min-h-[100px]"
              />
            </div>
          </div>
        );

      case "number":
        return (
          <div
            key={component.id}
            className="mb-6 h-full flex flex-col justify-center group"
          >
            <label className="flex items-center text-sm font-semibold mb-3 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Hash className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
            </label>
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  handleDataChange(
                    component.id,
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder={component.placeholder}
                className="w-full px-4 py-3 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-lg text-gray-900 dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20 focus:border-green-500 dark:focus:border-green-400 shadow-sm hover:shadow-md focus:shadow-md"
              />
            </div>
          </div>
        );

      case "date":
        return (
          <div key={component.id} className="mb-6 group">
            <label className="flex items-center text-sm font-semibold mb-3 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
            </label>
            <div className="relative">
              <input
                type="date"
                value={value}
                onChange={(e) => handleDataChange(component.id, e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-lg text-gray-900 dark:text-dark-textPrimary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20 focus:border-green-500 dark:focus:border-green-400 shadow-sm hover:shadow-md focus:shadow-md"
              />
            </div>
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
            <label className="flex items-center text-sm font-medium mb-3 text-gray-700 dark:text-dark-textPrimary">
              <Check className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
            </label>
            <div className="space-y-1">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 group/item hover:bg-gray-50 dark:hover:bg-dark-actionHover rounded-lg px-1 py-1 transition-colors duration-150"
                >
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        updateChecklistItem(item.id, {
                          checked: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-green-600 dark:text-green-500 bg-white dark:bg-dark-background border border-gray-300 dark:border-dark-divider rounded focus:ring-1 focus:ring-green-500/30 dark:focus:ring-green-400/30 focus:border-green-500 dark:focus:border-green-400 transition-all duration-200 cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      updateChecklistItem(item.id, { text: e.target.value })
                    }
                    placeholder="Add item..."
                    className={`flex-1 px-2 py-1.5 bg-transparent text-sm border-none outline-none text-gray-900 dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary transition-all duration-200 rounded ${
                      item.checked
                        ? "line-through opacity-60 text-gray-500 dark:text-dark-textSecondary"
                        : ""
                    }`}
                  />
                  <button
                    onClick={() => removeChecklistItem(item.id)}
                    className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={addChecklistItem}
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm px-2 py-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-all duration-200 mt-2"
              >
                <Plus className="w-3 h-3" />
                Add item
              </button>
            </div>
          </div>
        );

      case "table":
        const { cols } = component.config || { cols: 4 };

        // Ensure we have properly initialized table data
        let tableData: string[][];
        if (!value || !Array.isArray(value)) {
          // Initialize with one row of empty strings
          tableData = [Array.from({ length: cols }, () => "")];
        } else {
          // Ensure existing data has proper column structure
          tableData = value.map((row) =>
            Array.from(
              { length: cols },
              (_, colIndex) => (row && row[colIndex]) || ""
            )
          );
          // Ensure we have at least one row
          if (tableData.length === 0) {
            tableData = [Array.from({ length: cols }, () => "")];
          }
        }

        const currentRows = tableData.length;

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

        const addRow = () => {
          const newRow = Array.from({ length: cols }, () => "");
          const newTableData = [...tableData, newRow];
          handleDataChange(component.id, newTableData);
        };

        const removeRow = () => {
          // Don't allow removing the last row
          if (tableData.length <= 1) return;

          const newTableData = tableData.slice(0, -1); // Remove last row
          handleDataChange(component.id, newTableData);
        };

        const addColumn = () => {
          const newCols = cols + 1;
          const newTableData = tableData.map((row) => [...row, ""]);

          // Update the component config and data
          const newConfig = { ...component.config, cols: newCols };
          const newSchema = {
            ...schema,
            components: schema.components.map((comp) =>
              comp.id === component.id ? { ...comp, config: newConfig } : comp
            ),
          };
          setSchema(newSchema);
          handleDataChange(component.id, newTableData);
        };

        const removeColumn = () => {
          // Don't allow removing the last column
          if (cols <= 1) return;

          const newCols = cols - 1;
          const newTableData = tableData.map((row) => row.slice(0, -1)); // Remove last column

          // Update the component config and data
          const newConfig = { ...component.config, cols: newCols };
          const newSchema = {
            ...schema,
            components: schema.components.map((comp) =>
              comp.id === component.id ? { ...comp, config: newConfig } : comp
            ),
          };
          setSchema(newSchema);
          handleDataChange(component.id, newTableData);
        };

        return (
          <div key={component.id} className="mb-8">
            <label className="flex items-center text-sm font-semibold mb-4 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Table className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
            </label>
            <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-divider overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-max">
                  <tbody>
                    {tableData.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="group/row hover:bg-gray-50 dark:hover:bg-dark-actionHover transition-colors duration-150"
                      >
                        {row.map((cell, colIndex) => (
                          <td
                            key={colIndex}
                            className="border-r border-b border-gray-200 dark:border-dark-divider last:border-r-0 p-0 min-w-[140px] h-12 relative"
                          >
                            <input
                              type="text"
                              value={cell || ""}
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
                                      ? (rowIndex + 1) % currentRows
                                      : rowIndex;
                                  const nextInput = document.querySelector(
                                    `[data-table-cell="${component.id}-${nextRow}-${nextCol}"]`
                                  ) as HTMLInputElement;
                                  nextInput?.focus();
                                } else if (e.key === "Enter") {
                                  e.preventDefault();
                                  const nextRow = (rowIndex + 1) % currentRows;
                                  const nextInput = document.querySelector(
                                    `[data-table-cell="${component.id}-${nextRow}-${colIndex}"]`
                                  ) as HTMLInputElement;
                                  nextInput?.focus();
                                }
                              }}
                              className="w-full h-full px-4 py-3 bg-transparent text-gray-900 dark:text-dark-textPrimary border-none outline-none focus:bg-green-50 dark:focus:bg-green-900/10 transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary"
                              placeholder={`${String.fromCharCode(
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
              <div className="border-t border-gray-200 dark:border-dark-divider p-4 bg-gray-50 dark:bg-dark-background">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={addRow}
                    className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-green-200 dark:hover:border-green-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>
                  <button
                    onClick={removeRow}
                    disabled={tableData.length <= 1}
                    className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-red-200 dark:hover:border-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Row
                  </button>
                  <button
                    onClick={addColumn}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add Column
                  </button>
                  <button
                    onClick={removeColumn}
                    disabled={cols <= 1}
                    className="flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Column
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "graph":
        return (
          <div key={component.id} className="mb-8">
            <label className="flex items-center text-sm font-semibold mb-4 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Share2 className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-dark-textSecondary ml-2 font-normal">
                Interactive knowledge graph
              </span>
            </label>
            <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-divider overflow-hidden">
              <SimpleGraph
                data={value || { nodes: [], links: [] }}
                onChange={(newData) => handleDataChange(component.id, newData)}
                height={component.config?.height || 400}
              />
            </div>
          </div>
        );

      case "tree":
        return (
          <div key={component.id} className="mb-8">
            <label className="flex items-center text-sm font-semibold mb-4 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <GitBranch className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-dark-textSecondary ml-2 font-normal">
                Hierarchical tree structure
              </span>
            </label>
            <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-divider overflow-hidden">
              <InteractiveTree
                data={value || { id: "", name: "", children: [] }}
                onChange={(newData) => handleDataChange(component.id, newData)}
                height={component.config?.height || 400}
              />
            </div>
          </div>
        );

      case "flowchart":
        return (
          <div key={component.id} className="mb-8">
            <label className="flex items-center text-sm font-semibold mb-4 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Workflow className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-dark-textSecondary ml-2 font-normal">
                Interactive process flowchart
              </span>
            </label>
            <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-divider overflow-hidden">
              <InteractiveFlowchart
                data={value || { nodes: [] }}
                onChange={(newData) => handleDataChange(component.id, newData)}
                height={component.config?.height || 400}
              />
            </div>
          </div>
        );

      case "mindmap":
        return (
          <div key={component.id} className="mb-8">
            <label className="flex items-center text-sm font-semibold mb-4 text-gray-700 dark:text-dark-textPrimary tracking-wide">
              <Brain className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
              {component.label}
              <span className="text-xs text-gray-400 dark:text-dark-textSecondary ml-2 font-normal">
                Interactive mind map
              </span>
            </label>
            <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-sm border border-gray-200 dark:border-dark-divider overflow-hidden">
              <InteractiveMindMap
                data={value || { centerNode: "", nodes: [] }}
                onChange={(newData) => handleDataChange(component.id, newData)}
                height={component.config?.height || 400}
              />
            </div>
          </div>
        );

      case "button":
        const action = component.config?.action as ButtonAction;
        if (!action) {
          return (
            <div key={component.id} className="mb-6">
              <div className="text-red-600 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-xl">
                Button "{component.label}" has no action configured
              </div>
            </div>
          );
        }

        return (
          <div key={component.id} className="mb-6 h-full">
            {isEditMode ? (
              <div className="space-y-4 bg-white dark:bg-dark-secondary rounded-xl p-6 border border-gray-200 dark:border-dark-divider">
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-dark-textPrimary mb-3 tracking-wide">
                    <MousePointer className="w-4 h-4 mr-2 text-gray-500 dark:text-dark-textSecondary" />
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={component.label}
                    onChange={(e) =>
                      handleComponentLabelChange(component.id, e.target.value)
                    }
                    placeholder="Button text..."
                    className="w-full px-4 py-3 bg-white dark:bg-dark-background border border-gray-200 dark:border-dark-divider rounded-lg text-gray-900 dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20 focus:border-green-500 dark:focus:border-green-400 shadow-sm hover:shadow-md focus:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-textPrimary mb-3 tracking-wide">
                    Button Description (optional)
                  </label>
                  <input
                    type="text"
                    value={component.config?.description || ""}
                    onChange={(e) =>
                      handleComponentDescriptionChange(
                        component.id,
                        e.target.value
                      )
                    }
                    placeholder="Describe what this button does..."
                    className="w-full px-4 py-3 bg-white dark:bg-dark-background border border-gray-200 dark:border-dark-divider rounded-lg text-gray-900 dark:text-dark-textPrimary placeholder:text-gray-400 dark:placeholder:text-dark-textSecondary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20 focus:border-green-500 dark:focus:border-green-400 shadow-sm hover:shadow-md focus:shadow-md"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-start">
                <button
                  onClick={() => handleButtonAction(action)}
                  className="flex items-center gap-3 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <MousePointer className="w-4 h-4" />
                  {component.label}
                </button>
                {component.config?.description &&
                  component.config.description.trim() && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-dark-textSecondary leading-relaxed">
                      {component.config.description}
                    </p>
                  )}
              </div>
            )}
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
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isEditMode
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                    : "text-light-icon hover:text-light-accent hover:bg-light-hover dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover"
                }`}
                aria-label="Toggle edit mode"
                title={isEditMode ? "Exit edit mode" : "Enter edit mode"}
              >
                <SquarePen className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsRefactorModalOpen(true)}
                disabled={isSaving || externalIsSaving || isAutoSaving}
                className={`p-2 rounded-lg transition-colors
                  text-light-icon hover:text-light-accent hover:bg-light-hover
                  dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${
                    isSaving || externalIsSaving || isAutoSaving
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                aria-label="Refactor note structure"
                title="Refactor note structure"
              >
                <PencilRuler className="h-5 w-5" />
              </button>
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
          {isEditMode && (
            <div className="mt-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="text-green-700 dark:text-green-300 text-sm font-medium">
                Edit Mode Active
              </div>
              <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                Drag components by their grip handles to reorder them. Click
                delete buttons to remove components.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-background">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {renderComponentsWithLayout()}
        </div>
      </div>

      {/* Refactor Modal */}
      <NoteRefactorModal
        isOpen={isRefactorModalOpen}
        onClose={() => setIsRefactorModalOpen(false)}
        currentTitle={title}
        currentSchema={schema}
        currentData={data}
        onRefactor={handleRefactor}
      />
    </div>
  );
}
