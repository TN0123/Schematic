"use client";

import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import {
  Trash2,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Save,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import dynamic from "next/dynamic";
import * as d3 from "d3-force";

// Dynamically import ForceGraph2D with no SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const ForceGraph2DWithRef = forwardRef((props: any, ref) => {
  return <ForceGraph2D {...props} ref={ref} />;
});

export interface LinkPreview {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: string;
  faviconUrl?: string;
}

interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  link: LinkPreview;
  category: string;
}

interface GraphLink {
  source: string;
  target: string;
  category: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface BulletinLinkCollectionProps {
  id: string;
  initialTitle: string;
  initialLinks?: LinkPreview[];
  onSave: (
    id: string,
    updates: {
      title?: string;
      content?: string;
      data?: { links: LinkPreview[] };
    }
  ) => Promise<void>;
  onDelete?: () => void;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Use Google S2 Favicon API for higher-res icons
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${urlObj.origin}`;
  } catch {
    return "";
  }
}

function SortableLinkCard({
  link,
  onDelete,
}: {
  link: LinkPreview;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border dark:border-dark-divider rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-dark-secondary relative"
    >
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab bg-white/80 dark:bg-dark-secondary/80 p-1 rounded"
        >
          <GripVertical className="h-4 w-4 text-gray-400 dark:text-dark-icon" />
        </div>
        <button
          onClick={() => onDelete(link.id)}
          className="p-1 hover:bg-red-300 dark:hover:bg-red-900 rounded bg-white/80 dark:bg-dark-secondary/80"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>

      {link.imageUrl ? (
        <img
          src={link.imageUrl}
          alt={link.title}
          className="w-full h-32 object-cover"
        />
      ) : link.faviconUrl ? (
        <div className="w-full h-32 bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
          <img
            src={link.faviconUrl}
            alt="Favicon"
            className="h-10 w-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
          <LinkIcon className="h-8 w-8 text-gray-400 dark:text-dark-icon" />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {link.faviconUrl && (
            <img
              src={link.faviconUrl}
              alt=""
              className="w-4 h-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <h3 className="font-medium dark:text-dark-textPrimary truncate">
            {link.title}
          </h3>
        </div>
        {link.description && (
          <p className="text-sm text-gray-600 dark:text-dark-textSecondary line-clamp-2 mb-2">
            {link.description}
          </p>
        )}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-light-accent dark:text-dark-accent hover:underline truncate block"
        >
          {link.url}
        </a>
      </div>
    </div>
  );
}

function LinkCard({ link }: { link: LinkPreview }) {
  return (
    <div className="border dark:border-dark-divider rounded-lg overflow-hidden shadow-lg bg-white dark:bg-dark-secondary relative">
      <div className="absolute top-2 right-2 z-10">
        <div className="cursor-grab bg-white/80 dark:bg-dark-secondary/80 p-1 rounded">
          <GripVertical className="h-4 w-4 text-gray-400 dark:text-dark-icon" />
        </div>
      </div>

      {link.imageUrl ? (
        <img
          src={link.imageUrl}
          alt={link.title}
          className="w-full h-32 object-cover"
        />
      ) : link.faviconUrl ? (
        <div className="w-full h-32 bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
          <img
            src={link.faviconUrl}
            alt="Favicon"
            className="h-10 w-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 dark:bg-dark-hover flex items-center justify-center">
          <LinkIcon className="h-8 w-8 text-gray-400 dark:text-dark-icon" />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {link.faviconUrl && (
            <img
              src={link.faviconUrl}
              alt=""
              className="w-4 h-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <h3 className="font-medium dark:text-dark-textPrimary truncate">
            {link.title}
          </h3>
        </div>
        {link.description && (
          <p className="text-sm text-gray-600 dark:text-dark-textSecondary line-clamp-2 mb-2">
            {link.description}
          </p>
        )}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-light-accent dark:text-dark-accent hover:underline truncate block"
        >
          {link.url}
        </a>
      </div>
    </div>
  );
}

function GraphView({
  links,
  onDelete,
}: {
  links: LinkPreview[];
  onDelete: (id: string) => void;
}) {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [zoom, setZoom] = useState(1);
  const [graphInstance, setGraphInstance] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const graphRef = useRef<any>(null);

  // --- CATEGORY COLOR PALETTE ---
  // Fixed palette for up to 10 categories, fallback to random if more
  const CATEGORY_COLORS = [
    "#1a73e8", // blue
    "#e8711a", // orange
    "#34a853", // green
    "#e91e63", // pink
    "#fbbc05", // yellow
    "#9c27b0", // purple
    "#00bcd4", // cyan
    "#ff9800", // deep orange
    "#607d8b", // blue grey
    "#8bc34a", // light green
  ];
  // Map category to color
  const categories = Array.from(new Set(links.map((l) => l.category)));
  const categoryColorMap: Record<string, string> = {};
  categories.forEach((cat, i) => {
    categoryColorMap[cat] = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  });

  // --- HOVER STATE FOR TOOLTIP & HIGHLIGHTING ---
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      setGraphInstance(graphRef.current);
      graphRef.current.zoomToFit(400);
    }
  }, [graphRef.current]);

  useEffect(() => {
    // Convert links to graph data
    const nodes: GraphNode[] = links.map((link) => ({
      id: link.id,
      link,
      category: link.category,
    }));

    // Create links between nodes in the same category
    const linksByCategory = links.reduce((acc, link) => {
      if (!acc[link.category]) {
        acc[link.category] = [];
      }
      acc[link.category].push(link);
      return acc;
    }, {} as Record<string, LinkPreview[]>);

    const graphLinks: GraphLink[] = Object.values(linksByCategory).flatMap(
      (categoryLinks) => {
        const links: GraphLink[] = [];
        for (let i = 0; i < categoryLinks.length; i++) {
          for (let j = i + 1; j < categoryLinks.length; j++) {
            links.push({
              source: categoryLinks[i].id,
              target: categoryLinks[j].id,
              category: categoryLinks[i].category,
            });
          }
        }
        return links;
      }
    );

    setGraphData({ nodes, links: graphLinks });
  }, [links]);

  const handleZoomIn = () => {
    if (graphInstance) {
      const newZoom = zoom * 1.2;
      setZoom(newZoom);
      graphInstance.zoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (graphInstance) {
      const newZoom = zoom / 1.2;
      setZoom(newZoom);
      graphInstance.zoom(newZoom);
    }
  };

  const handleResetZoom = () => {
    if (graphInstance) {
      setZoom(1);
      graphInstance.zoom(1);
      graphInstance.centerAt(0, 0);
    }
  };

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // --- LEGEND COMPONENT ---
  const Legend = () => (
    <div className="flex flex-wrap gap-3 mb-2 px-4 py-2 bg-white/80 dark:bg-dark-secondary/80 rounded-lg shadow text-xs">
      {categories.map((cat) => (
        <div key={cat} className="flex items-center gap-2">
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: categoryColorMap[cat],
              border: "2px solid #fff",
              boxShadow: "0 0 0 1px #8884",
            }}
          />
          <span className="dark:text-dark-textPrimary text-gray-800">
            {cat}
          </span>
        </div>
      ))}
    </div>
  );

  // --- TOOLTIP COMPONENT ---
  const Tooltip = ({
    node,
    pos,
  }: {
    node: any;
    pos: { x: number; y: number };
  }) => {
    if (!node || !pos) return null;
    return (
      <div
        style={{
          position: "fixed",
          left: pos.x + 16,
          top: pos.y + 16,
          zIndex: 50,
          pointerEvents: "none",
          minWidth: 220,
          maxWidth: 320,
        }}
        className="rounded-lg shadow-lg px-4 py-3 bg-white/90 dark:bg-dark-secondary/90 border border-gray-200 dark:border-dark-divider text-xs text-gray-900 dark:text-dark-textPrimary"
      >
        <div className="font-semibold mb-1 truncate">{node.link.title}</div>
        <div className="mb-1 break-all text-light-accent dark:text-dark-accent">
          <a href={node.link.url} target="_blank" rel="noopener noreferrer">
            {node.link.url}
          </a>
        </div>
        {node.link.description && (
          <div className="text-gray-600 dark:text-dark-textSecondary line-clamp-3">
            {node.link.description}
          </div>
        )}
      </div>
    );
  };

  // --- HIGHLIGHTING LOGIC ---
  const highlightedNodeId = hoveredNode?.id;

  return (
    <div className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute left-4 top-4 z-20">
        <Legend />
      </div>
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/80 dark:bg-dark-secondary/80 p-2 rounded-lg shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
          aria-label="Reset view"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      {/* Tooltip */}
      {hoveredNode && mousePos && <Tooltip node={hoveredNode} pos={mousePos} />}
      <ForceGraph2DWithRef
        ref={graphRef}
        graphData={graphData}
        nodeLabel={"title"}
        nodeCanvasObject={(
          node: any,
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ) => {
          const label = node.link.title;
          const fontSize = 14 / globalScale;
          const radius = highlightedNodeId === node.id ? 30 : 22;
          const color = categoryColorMap[node.category] || "#888";

          // Draw node circle (border)
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = highlightedNodeId === node.id ? 6 : 4;
          ctx.strokeStyle = color;
          ctx.globalAlpha =
            highlightedNodeId && highlightedNodeId !== node.id ? 0.3 : 1;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Draw favicon or icon
          if (node.link.faviconUrl) {
            const img = new window.Image();
            img.src = node.link.faviconUrl;
            img.onload = () => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius - 6, 0, 2 * Math.PI);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(
                img,
                node.x - (radius - 8),
                node.y - (radius - 8),
                (radius - 8) * 2,
                (radius - 8) * 2
              );
              ctx.restore();
            };
          } else {
            // Draw default icon (simple colored dot)
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius - 8, 0, 2 * Math.PI);
            ctx.fillStyle = color + "99";
            ctx.fill();
          }

          // Draw label below node
          ctx.font = `bold ${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#222";
          if (!highlightedNodeId || highlightedNodeId === node.id) {
            ctx.fillText(label, node.x, node.y + radius + 4);
          }
        }}
        linkColor={(link: any) => {
          const isHighlighted =
            highlightedNodeId &&
            (link.source === highlightedNodeId ||
              link.target === highlightedNodeId);
          return isHighlighted
            ? categoryColorMap[link.category] || "#bbb"
            : (categoryColorMap[link.category] || "#bbb") + "55";
        }}
        linkWidth={(link: any) => {
          const isHighlighted =
            highlightedNodeId &&
            (link.source === highlightedNodeId ||
              link.target === highlightedNodeId);
          return isHighlighted ? 4 : 2;
        }}
        linkDirectionalParticles={0}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={(node: any) => {
          window.open(node.link.url, "_blank");
        }}
        onNodeRightClick={(node: any) => {
          onDelete(node.id);
        }}
        cooldownTicks={100}
        nodeRelSize={8}
        d3Force="charge"
        d3VelocityDecay={0.3}
        d3AlphaMin={0.001}
        d3Charge={(node: any) => -400}
        onNodeHover={(node: any, prevNode: any) => {
          setHoveredNode(node);
        }}
        onNodeMouseMove={(node: any, event: MouseEvent) => {
          setMousePos({ x: event.clientX, y: event.clientY });
        }}
        onBackgroundClick={() => {
          setHoveredNode(null);
          setMousePos(null);
        }}
      />
    </div>
  );
}

export default function BulletinLinkCollection({
  id,
  initialTitle,
  initialLinks = [],
  onSave,
  onDelete,
}: BulletinLinkCollectionProps) {
  const [title, setTitle] = useState(initialTitle);
  const [links, setLinks] = useState<LinkPreview[]>(initialLinks);
  const [newLink, setNewLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedState = useRef({
    title: initialTitle,
    links: initialLinks,
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryNameEdits, setCategoryNameEdits] = useState<
    Record<string, string>
  >({});

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeLink = activeId
    ? links.find((link) => link.id === activeId)
    : null;

  const sensors = useSensors(useSensor(PointerSensor));

  const handleRenameCategory = (oldCategory: string, newCategory: string) => {
    if (!newCategory.trim() || oldCategory === newCategory) return;

    const updatedLinks = links.map((link) =>
      link.category === oldCategory ? { ...link, category: newCategory } : link
    );

    setLinks(updatedLinks);
    setEditingCategory(null);
    setCategoryNameEdits((prev) => {
      const copy = { ...prev };
      delete copy[oldCategory];
      return copy;
    });

    setHasUnsavedChanges(true);
    handleSaveWithLinks(updatedLinks);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates: { title?: string; data?: { links: LinkPreview[] } } = {};
      if (title !== lastSavedState.current.title) updates.title = title;
      if (
        JSON.stringify(links) !== JSON.stringify(lastSavedState.current.links)
      ) {
        updates.data = { links };
      }

      if (Object.keys(updates).length > 0) {
        await onSave(id, updates);
        lastSavedState.current = {
          title,
          links,
        };
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [id, onSave, title, links]);

  const handleSaveWithLinks = useCallback(
    async (customLinks: LinkPreview[]) => {
      setIsSaving(true);
      try {
        const updates: { title?: string; data?: { links: LinkPreview[] } } = {};
        if (title !== lastSavedState.current.title) updates.title = title;
        if (
          JSON.stringify(customLinks) !==
          JSON.stringify(lastSavedState.current.links)
        ) {
          updates.data = { links: customLinks };
        }

        if (Object.keys(updates).length > 0) {
          await onSave(id, updates);
          lastSavedState.current = {
            title,
            links: customLinks,
          };
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [id, onSave, title]
  );

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasUnsavedChanges) {
        handleSave();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        handleSave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, handleSave]);

  const handleAddLink = async () => {
    if (!newLink.trim()) return;

    const normalizedUrl = normalizeUrl(newLink.trim());

    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    if (links.some((link) => link.url === normalizedUrl)) {
      setError("This URL has already been added");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newLinkPreview: LinkPreview = {
        id: Date.now().toString(),
        url: normalizedUrl,
        title: normalizedUrl,
        category: "Uncategorized",
        faviconUrl: getFaviconUrl(normalizedUrl),
      };

      const categories = Array.from(
        new Set(links.map((link) => link.category))
      );

      const response = await fetch("/api/categorize-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories,
          link: newLinkPreview,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to categorize link");
      }

      const { result } = await response.json();

      // Find the closest existing category (case-insensitive match)
      const existingCategory = categories.find(
        (cat) => cat.toLowerCase() === result.toLowerCase()
      );

      newLinkPreview.category = existingCategory || result;

      const updatedLinks = [...links, newLinkPreview];
      setLinks(updatedLinks);
      setNewLink("");
      setHasUnsavedChanges(true);
      await handleSaveWithLinks(updatedLinks);
    } catch (error) {
      console.error("Failed to add link:", error);
      setError("Failed to add link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const updatedLinks = links.filter((link) => link.id !== linkId);
    setLinks(updatedLinks);
    setHasUnsavedChanges(true);
    await handleSaveWithLinks(updatedLinks);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  };

  const linksByCategory = links.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, LinkPreview[]>);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeLink = links.find((link) => link.id === active.id);
    const overLink = links.find((link) => link.id === over.id);

    if (!activeLink || !overLink) return;

    // If the links are in different categories, update the category
    if (activeLink.category !== overLink.category) {
      const updatedLinks = links.map((link) =>
        link.id === active.id ? { ...link, category: overLink.category } : link
      );
      setLinks(updatedLinks);
      setHasUnsavedChanges(true);
      handleSaveWithLinks(updatedLinks);
    } else {
      // If in the same category, reorder the links
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over.id);
      const updatedLinks = arrayMove(links, oldIndex, newIndex);
      setLinks(updatedLinks);
      setHasUnsavedChanges(true);
      handleSaveWithLinks(updatedLinks);
    }
  };

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all">
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 mb-2 text-center dark:text-dark-textPrimary dark:bg-dark-background dark:focus:ring-dark-accent"
            placeholder="Link Collection Title"
          />
          <div className="flex gap-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors
                  text-light-icon hover:text-light-accent hover:bg-light-hover
                  dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="Save changes"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-light-icon hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
              aria-label="Delete list"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={newLink}
              onChange={(e) => {
                setNewLink(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter a URL..."
              className={`flex-1 p-2 rounded-lg border dark:border-dark-divider dark:bg-dark-editorBackground dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent ${
                error ? "border-red-500 dark:border-red-500" : ""
              }`}
            />
            <button
              onClick={handleAddLink}
              disabled={isLoading}
              className="p-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LinkIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border dark:border-dark-divider">
          <GraphView links={links} onDelete={handleDeleteLink} />
        </div>
      </div>
    </div>
  );
}
