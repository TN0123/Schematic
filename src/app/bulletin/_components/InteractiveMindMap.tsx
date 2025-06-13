"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Edit3, Brain } from "lucide-react";

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  children?: string[];
  parent?: string;
  color?: string;
  level: number;
}

export interface MindMapData {
  centerNode: string;
  nodes: MindMapNode[];
}

interface InteractiveMindMapProps {
  data: MindMapData;
  onChange: (data: MindMapData) => void;
  height?: number;
}

export default function InteractiveMindMap({
  data,
  onChange,
  height = 400,
}: InteractiveMindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newNodeText, setNewNodeText] = useState("");
  const [showAddNode, setShowAddNode] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Initialize with default data if empty
  const mindMapData =
    !data || !data.nodes || data.nodes.length === 0
      ? {
          centerNode: "1",
          nodes: [
            {
              id: "1",
              text: "Central Idea",
              x: 250,
              y: 200,
              level: 0,
              children: ["2", "3", "4"],
              color: "#10b981",
            },
            {
              id: "2",
              text: "Branch 1",
              x: 150,
              y: 120,
              level: 1,
              parent: "1",
              children: ["5"],
              color: "#3b82f6",
            },
            {
              id: "3",
              text: "Branch 2",
              x: 350,
              y: 120,
              level: 1,
              parent: "1",
              color: "#8b5cf6",
            },
            {
              id: "4",
              text: "Branch 3",
              x: 250,
              y: 320,
              level: 1,
              parent: "1",
              color: "#f59e0b",
            },
            {
              id: "5",
              text: "Sub-idea",
              x: 80,
              y: 80,
              level: 2,
              parent: "2",
              color: "#ef4444",
            },
          ],
        }
      : data;

  const calculatePosition = (
    parentNode: MindMapNode,
    childIndex: number,
    totalChildren: number
  ): { x: number; y: number } => {
    const radius = 120 + parentNode.level * 40;
    const angleStep = (2 * Math.PI) / Math.max(totalChildren, 3);
    const angle = angleStep * childIndex - Math.PI / 2; // Start from top

    return {
      x: parentNode.x + radius * Math.cos(angle),
      y: parentNode.y + radius * Math.sin(angle),
    };
  };

  const addChildNode = (parentId: string) => {
    if (!newNodeText.trim()) return;

    const parentNode = mindMapData.nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const newNodeId = Date.now().toString();
    const siblingCount = parentNode.children?.length || 0;
    const position = calculatePosition(
      parentNode,
      siblingCount,
      siblingCount + 1
    );

    const newNode: MindMapNode = {
      id: newNodeId,
      text: newNodeText.trim(),
      x: position.x,
      y: position.y,
      level: parentNode.level + 1,
      parent: parentId,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    };

    const updatedNodes = [...mindMapData.nodes, newNode];
    const updatedParent = updatedNodes.find((n) => n.id === parentId);
    if (updatedParent) {
      updatedParent.children = [...(updatedParent.children || []), newNodeId];
    }

    onChange({
      ...mindMapData,
      nodes: updatedNodes,
    });

    setNewNodeText("");
    setShowAddNode(false);
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === mindMapData.centerNode) return; // Can't delete center node

    const nodeToDelete = mindMapData.nodes.find((n) => n.id === nodeId);
    if (!nodeToDelete) return;

    // Get all descendant nodes
    const getDescendants = (id: string): string[] => {
      const node = mindMapData.nodes.find((n) => n.id === id);
      if (!node || !node.children) return [id];

      const descendants = [id];
      node.children.forEach((childId) => {
        descendants.push(...getDescendants(childId));
      });
      return descendants;
    };

    const toDelete = getDescendants(nodeId);

    // Remove from parent's children array
    if (nodeToDelete.parent) {
      const parent = mindMapData.nodes.find(
        (n) => n.id === nodeToDelete.parent
      );
      if (parent && parent.children) {
        parent.children = parent.children.filter((id) => id !== nodeId);
      }
    }

    // Filter out deleted nodes
    const updatedNodes = mindMapData.nodes.filter(
      (n) => !toDelete.includes(n.id)
    );

    onChange({
      ...mindMapData,
      nodes: updatedNodes,
    });

    setSelectedNode(null);
  };

  const updateNodeText = (nodeId: string, newText: string) => {
    const updatedNodes = mindMapData.nodes.map((node) =>
      node.id === nodeId ? { ...node, text: newText } : node
    );
    onChange({
      ...mindMapData,
      nodes: updatedNodes,
    });
  };

  const handleNodeClick = (nodeId: string) => {
    if (editingNode) return; // Don't select while editing
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const startEditing = (nodeId: string) => {
    const node = mindMapData.nodes.find((n) => n.id === nodeId);
    if (node) {
      setEditingNode(nodeId);
      setEditText(node.text);
    }
  };

  const finishEditing = () => {
    if (editingNode && editText.trim()) {
      updateNodeText(editingNode, editText.trim());
    }
    setEditingNode(null);
    setEditText("");
  };

  const renderConnections = () => {
    return mindMapData.nodes.map((node) => {
      if (!node.parent) return null;

      const parentNode = mindMapData.nodes.find((n) => n.id === node.parent);
      if (!parentNode) return null;

      return (
        <line
          key={`${node.parent}-${node.id}`}
          x1={parentNode.x}
          y1={parentNode.y}
          x2={node.x}
          y2={node.y}
          stroke="#6b7280"
          strokeWidth={2}
          opacity={0.6}
        />
      );
    });
  };

  const renderNodes = () => {
    return mindMapData.nodes.map((node) => {
      const isSelected = selectedNode === node.id;
      const isCenter = node.id === mindMapData.centerNode;
      const radius = isCenter ? 25 : 20;

      return (
        <g key={node.id} onClick={() => handleNodeClick(node.id)}>
          <circle
            cx={node.x}
            cy={node.y}
            r={radius}
            fill={node.color || "#10b981"}
            stroke={isSelected ? "#3b82f6" : "#fff"}
            strokeWidth={isSelected ? 3 : 2}
            className="cursor-pointer"
          />
          {editingNode === node.id ? (
            <foreignObject
              x={node.x - 40}
              y={node.y - 8}
              width={80}
              height={16}
            >
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") finishEditing();
                  if (e.key === "Escape") {
                    setEditingNode(null);
                    setEditText("");
                  }
                }}
                className="w-full text-xs text-center bg-white dark:bg-dark-secondary border rounded px-1"
                autoFocus
              />
            </foreignObject>
          ) : (
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-xs font-medium fill-white pointer-events-none select-none"
              style={{ fontSize: isCenter ? "11px" : "10px" }}
            >
              {node.text.length > 12
                ? `${node.text.substring(0, 12)}...`
                : node.text}
            </text>
          )}
        </g>
      );
    });
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
            Add Branch
          </button>
          {selectedNode && (
            <>
              <button
                onClick={() => startEditing(selectedNode)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              {selectedNode !== mindMapData.centerNode && (
                <button
                  onClick={() => deleteNode(selectedNode)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>

        {showAddNode && (
          <div className="space-y-2">
            <input
              type="text"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              placeholder="Branch name..."
              className="w-full px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-tertiary dark:text-dark-textPrimary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedNode) {
                  addChildNode(selectedNode);
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => selectedNode && addChildNode(selectedNode)}
                disabled={!selectedNode || !newNodeText.trim()}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Add to Selected
              </button>
              <button
                onClick={() => setShowAddNode(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
            {!selectedNode && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Select a node first to add a branch to it
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ height, overflow: "auto" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="bg-white dark:bg-dark-background"
        >
          {renderConnections()}
          {renderNodes()}
        </svg>
      </div>

      <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Brain className="w-3 h-3 text-blue-500" />
            Mind Map
          </div>
          <span>
            Click: select • Edit button: rename • Add: create branches
          </span>
        </div>
      </div>
    </div>
  );
}
