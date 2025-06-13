"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Link2 } from "lucide-react";

// Dynamically import ForceGraph2D only on client side
let ForceGraph2D: any = null;
if (typeof window !== "undefined") {
  ForceGraph2D = require("react-force-graph-2d").default;
}

export interface GraphNode {
  id: string;
  name: string;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface SimpleGraphProps {
  data: GraphData;
  onChange: (data: GraphData) => void;
  height?: number;
}

export default function SimpleGraph({
  data,
  onChange,
  height = 400,
}: SimpleGraphProps) {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  const [showAddNode, setShowAddNode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize with default data if empty
  const graphData =
    !data || !data.nodes || data.nodes.length === 0
      ? {
          nodes: [
            { id: "1", name: "Central Idea", color: "#10b981" },
            { id: "2", name: "Sub Topic 1", color: "#3b82f6" },
            { id: "3", name: "Sub Topic 2", color: "#8b5cf6" },
          ],
          links: [
            { source: "1", target: "2" },
            { source: "1", target: "3" },
          ],
        }
      : data;

  const addNode = () => {
    if (!newNodeName.trim()) return;

    const newNode: GraphNode = {
      id: Date.now().toString(),
      name: newNodeName.trim(),
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    };

    const updatedData = {
      ...graphData,
      nodes: [...graphData.nodes, newNode],
    };
    onChange(updatedData);
    setNewNodeName("");
    setShowAddNode(false);
  };

  const deleteNode = (nodeId: string) => {
    const updatedData = {
      nodes: graphData.nodes.filter((n) => n.id !== nodeId),
      links: graphData.links.filter(
        (l) => l.source !== nodeId && l.target !== nodeId
      ),
    };
    onChange(updatedData);
    setSelectedNode(null);
  };

  const updateNodeName = (nodeId: string, newName: string) => {
    const updatedData = {
      ...graphData,
      nodes: graphData.nodes.map((node) =>
        node.id === nodeId ? { ...node, name: newName } : node
      ),
    };
    onChange(updatedData);
  };

  const handleNodeClick = (node: any) => {
    if (isConnecting) {
      if (connectionSource && connectionSource !== node.id) {
        const newLink: GraphLink = {
          source: connectionSource,
          target: node.id,
        };

        const updatedData = {
          ...graphData,
          links: [...graphData.links, newLink],
        };
        onChange(updatedData);
        setIsConnecting(false);
        setConnectionSource(null);
      } else {
        setConnectionSource(node.id);
      }
    } else {
      setSelectedNode(selectedNode === node.id ? null : node.id);
    }
  };

  return (
    <div className="border dark:border-dark-divider rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-dark-secondary border-b dark:border-dark-divider p-3">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowAddNode(!showAddNode)}
            className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>
          <button
            onClick={() => setIsConnecting(!isConnecting)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
              isConnecting
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300"
            }`}
          >
            <Link2 className="w-4 h-4" />
            {isConnecting ? "Cancel Link" : "Connect"}
          </button>
          {selectedNode && (
            <button
              onClick={() => deleteNode(selectedNode)}
              className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>

        {showAddNode && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Node name..."
              className="flex-1 px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-tertiary dark:text-dark-textPrimary"
              onKeyDown={(e) => e.key === "Enter" && addNode()}
              autoFocus
            />
            <button
              onClick={addNode}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
            >
              Add
            </button>
          </div>
        )}

        {isConnecting && connectionSource && (
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Click another node to connect from "
            {graphData.nodes.find((n) => n.id === connectionSource)?.name}"
          </div>
        )}
      </div>

      <div style={{ height }}>
        {isClient && ForceGraph2D ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(
              node: any,
              ctx: CanvasRenderingContext2D,
              globalScale: number
            ) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;

              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color || "#10b981";
              ctx.fill();

              // Draw selection ring
              if (selectedNode === node.id) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
                ctx.strokeStyle = "#3b82f6";
                ctx.lineWidth = 2;
                ctx.stroke();
              }

              // Draw label
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#333";
              ctx.fillText(label, node.x, node.y + 15);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Loading graph...
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-3">
          <div className="text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Edit Node:{" "}
            {graphData.nodes.find((n) => n.id === selectedNode)?.name}
          </div>
          <input
            type="text"
            value={
              graphData.nodes.find((n) => n.id === selectedNode)?.name || ""
            }
            onChange={(e) => updateNodeName(selectedNode, e.target.value)}
            className="w-full px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-tertiary dark:text-dark-textPrimary"
          />
        </div>
      )}

      <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-2 text-xs text-gray-500 dark:text-gray-400">
        Click: select • Connect mode: create links • Drag: move nodes
      </div>
    </div>
  );
}
