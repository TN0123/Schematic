"use client";

import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import {
  Trash2,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import dynamic from "next/dynamic";
import * as d3 from "d3-force";

// Constants
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

const BASE_RADIUS = 12;
const HOVER_RADIUS = 18;
const ANIMATION_SPEED = 0.25;

// Utility functions
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
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${urlObj.origin}`;
  } catch {
    return "";
  }
}

function normalizeCategory(
  category: string,
  existingCategories: string[]
): string {
  const normalizedInput = category.trim();
  const matchingCategory = existingCategories.find(
    (cat) => cat.toLowerCase() === normalizedInput.toLowerCase()
  );
  return matchingCategory || normalizedInput;
}

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

// Subcomponents for GraphView
const Legend = ({
  categories,
  categoryColorMap,
}: {
  categories: string[];
  categoryColorMap: Record<string, string>;
}) => (
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
        <span className="dark:text-dark-textPrimary text-gray-800">{cat}</span>
      </div>
    ))}
  </div>
);

const Tooltip = ({
  node,
  pos,
  categoryColorMap,
}: {
  node: any;
  pos: { x: number; y: number };
  categoryColorMap: Record<string, string>;
}) => {
  if (!node || !pos) return null;

  const TOOLTIP_WIDTH = 320;
  const PADDING = 16;
  const TOOLTIP_OFFSET = 16;
  const ESTIMATED_TOOLTIP_HEIGHT = 200;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = pos.x + TOOLTIP_OFFSET;
  let top = pos.y + TOOLTIP_OFFSET;

  if (left + TOOLTIP_WIDTH + PADDING > viewportWidth) {
    left = pos.x - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
  }

  if (top + ESTIMATED_TOOLTIP_HEIGHT + PADDING > viewportHeight) {
    top = pos.y - ESTIMATED_TOOLTIP_HEIGHT - TOOLTIP_OFFSET;
  }

  left = Math.max(
    PADDING,
    Math.min(left, viewportWidth - TOOLTIP_WIDTH - PADDING)
  );
  top = Math.max(
    PADDING,
    Math.min(top, viewportHeight - ESTIMATED_TOOLTIP_HEIGHT - PADDING)
  );

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 9999,
        pointerEvents: "none",
        minWidth: 220,
        maxWidth: TOOLTIP_WIDTH,
      }}
      className="rounded-lg shadow-lg px-4 py-3 bg-white/90 dark:bg-dark-secondary/90 border border-gray-200 dark:border-dark-divider text-xs text-gray-900 dark:text-dark-textPrimary"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: categoryColorMap[node.category],
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px #8884",
          }}
        />
        <span className="font-semibold truncate">{node.link.title}</span>
        <span
          className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium truncate"
          style={{
            background: categoryColorMap[node.category] + "22",
            color: categoryColorMap[node.category],
          }}
        >
          {node.category}
        </span>
      </div>
      <div className="text-right mt-2 text-[10px] text-gray-500 dark:text-dark-textSecondary">
        Right-click to modify
      </div>
    </div>
  );
};

function GraphView({
  links,
  onDelete,
  onCategoryChange,
}: {
  links: LinkPreview[];
  onDelete: (id: string) => void;
  onCategoryChange: (id: string, newCategory: string) => void;
}) {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [zoom, setZoom] = useState(1);
  const [graphInstance, setGraphInstance] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const graphRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<{
    node: any;
    x: number;
    y: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const faviconCache = useRef<{ [url: string]: HTMLImageElement }>({});
  const [nodeRadii, setNodeRadii] = useState<{ [id: string]: number }>({});

  // Map category to color
  const categories = Array.from(new Set(links.map((l) => l.category)));
  const categoryColorMap: Record<string, string> = {};
  categories.forEach((cat, i) => {
    categoryColorMap[cat] = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  });

  // Add global mouse tracking
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (hoveredNode) {
        setMousePos({
          x: event.clientX,
          y: event.clientY,
        });
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [hoveredNode]);

  // Animate node radii towards their target
  useEffect(() => {
    let running = true;
    function animate() {
      setNodeRadii((prev) => {
        const next: { [id: string]: number } = { ...prev };
        for (const node of graphData.nodes) {
          const target =
            hoveredNode && hoveredNode.id === node.id
              ? HOVER_RADIUS
              : BASE_RADIUS;
          const current = prev[node.id] ?? BASE_RADIUS;
          if (Math.abs(current - target) > 0.5) {
            next[node.id] = current + (target - current) * ANIMATION_SPEED;
          } else {
            next[node.id] = target;
          }
        }
        return next;
      });
      if (running) requestAnimationFrame(animate);
    }
    animate();
    return () => {
      running = false;
    };
  }, [graphData.nodes, hoveredNode]);

  useEffect(() => {
    setIsClient(true);
    handleResetZoom();
  }, []);

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

  // --- HIGHLIGHTING LOGIC ---
  const highlightedNodeId = hoveredNode?.id;

  return (
    <div className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute left-4 top-4 z-20">
        <Legend categories={categories} categoryColorMap={categoryColorMap} />
      </div>
      {/* Tooltip */}
      {hoveredNode && mousePos && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 9999 }}
        >
          <Tooltip
            node={hoveredNode}
            pos={mousePos}
            categoryColorMap={categoryColorMap}
          />
        </div>
      )}
      {/* Add context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[99998]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu(null);
          }}
        >
          <div
            ref={menuRef}
            className="fixed z-[99999] bg-white dark:bg-dark-secondary rounded-lg shadow-lg border border-gray-200 dark:border-dark-divider"
            style={{
              left: (() => {
                const MENU_WIDTH = 200;
                const PADDING = 16;
                const viewportWidth = window.innerWidth;
                const rightEdge = contextMenu.x + MENU_WIDTH;

                // If menu would overflow right edge, position it to the left of the cursor
                if (rightEdge + PADDING > viewportWidth) {
                  return Math.max(PADDING, contextMenu.x - MENU_WIDTH);
                }
                // Otherwise position it to the right of the cursor
                return Math.min(
                  contextMenu.x,
                  viewportWidth - MENU_WIDTH - PADDING
                );
              })(),
              top: (() => {
                const MENU_HEIGHT = 200; // Estimated height
                const PADDING = 16;
                const viewportHeight = window.innerHeight;
                const bottomEdge = contextMenu.y + MENU_HEIGHT;

                // If menu would overflow bottom edge, position it above the cursor
                if (bottomEdge + PADDING > viewportHeight) {
                  return Math.max(PADDING, contextMenu.y - MENU_HEIGHT);
                }
                // Otherwise position it below the cursor
                return Math.min(
                  contextMenu.y,
                  viewportHeight - MENU_HEIGHT - PADDING
                );
              })(),
              minWidth: 200,
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="p-2 border-b border-gray-200 dark:border-dark-divider">
              <div className="text-sm font-medium text-gray-900 dark:text-dark-textPrimary">
                {contextMenu.node.link.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-dark-textSecondary truncate">
                {contextMenu.node.link.url}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-dark-textSecondary mb-1">
                Category
              </div>
              {isEditing ? (
                <div
                  className="flex gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Add a small delay to allow the save button click to be processed first
                      setTimeout(() => {
                        if (
                          !menuRef.current?.contains(document.activeElement)
                        ) {
                          setIsEditing(false);
                        }
                      }, 100);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-background text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                    placeholder="Enter category..."
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent the input from losing focus before the click
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (
                        newCategory.trim() &&
                        newCategory !== contextMenu.node.category
                      ) {
                        onCategoryChange(
                          contextMenu.node.id,
                          newCategory.trim()
                        );
                      }
                      setIsEditing(false);
                    }}
                    className="px-2 py-1 text-sm text-white bg-light-accent dark:bg-dark-accent rounded hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewCategory(contextMenu.node.category);
                    setIsEditing(true);
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center justify-between group"
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium truncate"
                    style={{
                      background:
                        categoryColorMap[contextMenu.node.category] + "22",
                      color: categoryColorMap[contextMenu.node.category],
                    }}
                  >
                    {contextMenu.node.category}
                  </span>
                  <span className="text-gray-400 dark:text-dark-textSecondary text-xs group-hover:text-gray-600 dark:group-hover:text-dark-textPrimary">
                    Click to edit
                  </span>
                </button>
              )}
            </div>
            <div className="p-1 border-t border-gray-200 dark:border-dark-divider">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(contextMenu.node.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Delete Link
              </button>
            </div>
          </div>
        </div>
      )}
      <ForceGraph2DWithRef
        ref={graphRef}
        graphData={graphData}
        nodeLabel={"title"}
        d3Charge={() => -1000}
        d3ForceInit={(fg: any) => {
          fg.d3Force("collide", d3.forceCollide().radius(38));
          fg.d3Force("x", d3.forceX(0).strength(0.05));
          fg.d3Force("y", d3.forceY(0).strength(0.05));
        }}
        nodeCanvasObject={(
          node: any,
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ) => {
          const radius = nodeRadii[node.id] ?? BASE_RADIUS;
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

          // Draw favicon or icon (cached)
          if (node.link.faviconUrl) {
            let img = faviconCache.current[node.link.faviconUrl];
            if (!img) {
              img = new window.Image();
              img.src = node.link.faviconUrl;
              faviconCache.current[node.link.faviconUrl] = img;
            }
            if (img.complete && img.naturalWidth > 0) {
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
            }
          } else {
            // Draw default icon (simple colored dot)
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius - 8, 0, 2 * Math.PI);
            ctx.fillStyle = color + "99";
            ctx.fill();
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
        onNodeClick={(node: any, event: MouseEvent) => {
          window.open(node.link.url, "_blank");
        }}
        onNodeRightClick={(node: any, event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          setContextMenu({
            node,
            x: event.clientX,
            y: event.clientY,
          });
        }}
        cooldownTicks={200}
        nodeRelSize={8}
        d3Force="charge"
        d3VelocityDecay={0.5}
        d3AlphaMin={0.001}
        d3AlphaDecay={0.02}
        d3Alpha={0.3}
        onNodeHover={(node: any) => {
          setHoveredNode(node);
          if (!node) {
            setMousePos(null);
          }
        }}
        onEngineStop={() => {
          if (graphInstance) {
            const nodes = graphData.nodes;
            if (nodes.length > 0) {
              const centerX =
                nodes.reduce((sum, node) => sum + (node.x || 0), 0) /
                nodes.length;
              const centerY =
                nodes.reduce((sum, node) => sum + (node.y || 0), 0) /
                nodes.length;
              graphInstance.centerAt(centerX, centerY);
              graphInstance.zoom(1.2);
            }
          }
        }}
        onBackgroundClick={() => {
          if (!document.querySelector(".context-menu:hover")) {
            setHoveredNode(null);
            setMousePos(null);
            setContextMenu(null);
          }
        }}
        backgroundCanvas={(ctx: CanvasRenderingContext2D, graph: GraphData) => {
          categories.forEach((cat) => {
            const nodes = graph.nodes.filter(
              (n) =>
                n.category === cat &&
                typeof n.x === "number" &&
                typeof n.y === "number"
            );
            if (nodes.length === 0) return;
            const color = categoryColorMap[cat] || "#888";
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            if (nodes.length === 1) {
              ctx.arc(nodes[0].x!, nodes[0].y!, 100, 0, 2 * Math.PI);
            } else if (nodes.length === 2) {
              const x = (nodes[0].x! + nodes[1].x!) / 2;
              const y = (nodes[0].y! + nodes[1].y!) / 2;
              const dx = nodes[0].x! - nodes[1].x!;
              const dy = nodes[0].y! - nodes[1].y!;
              const dist = Math.sqrt(dx * dx + dy * dy);
              ctx.ellipse(
                x,
                y,
                dist / 2 + 100,
                100,
                Math.atan2(dy, dx),
                0,
                2 * Math.PI
              );
            } else {
              const points = nodes.map((n) => [n.x!, n.y!]);
              points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
              function cross(o: number[], a: number[], b: number[]) {
                return (
                  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
                );
              }
              const lower: number[][] = [];
              for (const p of points) {
                while (
                  lower.length >= 2 &&
                  cross(lower[lower.length - 2], lower[lower.length - 1], p) <=
                    0
                )
                  lower.pop();
                lower.push(p);
              }
              const upper: number[][] = [];
              for (let i = points.length - 1; i >= 0; i--) {
                const p = points[i];
                while (
                  upper.length >= 2 &&
                  cross(upper[upper.length - 2], upper[upper.length - 1], p) <=
                    0
                )
                  upper.pop();
                upper.push(p);
              }
              const hull = lower.concat(upper.slice(1, -1));
              if (hull.length > 1) {
                ctx.moveTo(hull[0][0], hull[0][1]);
                for (let i = 1; i < hull.length; i++) {
                  ctx.lineTo(hull[i][0], hull[i][1]);
                }
                ctx.closePath();
              }
            }
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 40;
            ctx.fill();
            ctx.globalAlpha = 0.8;
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          });
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

  const handleCategoryChange = async (linkId: string, newCategory: string) => {
    const existingCategories = Array.from(
      new Set(links.map((link) => link.category))
    );
    const finalCategory = normalizeCategory(newCategory, existingCategories);

    const updatedLinks = links.map((link) =>
      link.id === linkId ? { ...link, category: finalCategory } : link
    );
    setLinks(updatedLinks);
    setHasUnsavedChanges(true);
    await handleSave();
  };

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

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
        lastSavedState.current = { title, links };
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [id, onSave, title, links, hasUnsavedChanges]);

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
    return () => document.removeEventListener("keydown", handleKeyPress);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, link: newLinkPreview }),
      });

      if (!response.ok) throw new Error("Failed to categorize link");

      const { result } = await response.json();
      newLinkPreview.category = normalizeCategory(result, categories);

      setLinks((prev) => [...prev, newLinkPreview]);
      setNewLink("");
      setHasUnsavedChanges(true);
      await handleSave();
    } catch (error) {
      console.error("Failed to add link:", error);
      setError("Failed to add link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== linkId));
    setHasUnsavedChanges(true);
    await handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
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
          <GraphView
            links={links}
            onDelete={handleDeleteLink}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </div>
    </div>
  );
}
