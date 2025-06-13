"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  ArrowDown,
  Square,
  Circle,
  Diamond,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

export interface FlowNode {
  id: string;
  text: string;
  type: "start" | "process" | "decision" | "end";
  x: number;
  y: number;
  connections?: string[];
}

export interface FlowchartData {
  nodes: FlowNode[];
}

interface InteractiveFlowchartProps {
  data: FlowchartData;
  onChange: (data: FlowchartData) => void;
  height?: number;
}

export default function InteractiveFlowchart({
  data,
  onChange,
  height = 400,
}: InteractiveFlowchartProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newNodeText, setNewNodeText] = useState("");
  const [newNodeType, setNewNodeType] = useState<
    "start" | "process" | "decision" | "end"
  >("process");
  const [showAddNode, setShowAddNode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);

  // Viewport state
  const [viewBox, setViewBox] = useState({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize with default data if empty
  const flowData =
    !data || !data.nodes || data.nodes.length === 0
      ? {
          nodes: [
            {
              id: "1",
              text: "Start",
              type: "start" as const,
              x: 200,
              y: 50,
              connections: ["2"],
            },
            {
              id: "2",
              text: "Process Data",
              type: "process" as const,
              x: 200,
              y: 150,
              connections: ["3"],
            },
            {
              id: "3",
              text: "Decision?",
              type: "decision" as const,
              x: 200,
              y: 250,
              connections: ["4", "5"],
            },
            {
              id: "4",
              text: "Yes Path",
              type: "process" as const,
              x: 100,
              y: 350,
              connections: ["6"],
            },
            {
              id: "5",
              text: "No Path",
              type: "process" as const,
              x: 300,
              y: 350,
              connections: ["6"],
            },
            {
              id: "6",
              text: "End",
              type: "end" as const,
              x: 200,
              y: 450,
              connections: [],
            },
          ],
        }
      : data;

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback(
    (screenX: number, screenY: number) => {
      if (!svgRef.current) return { x: screenX, y: screenY };

      const rect = svgRef.current.getBoundingClientRect();
      const x =
        ((screenX - rect.left) / rect.width) * viewBox.width + viewBox.x;
      const y =
        ((screenY - rect.top) / rect.height) * viewBox.height + viewBox.y;
      return { x, y };
    },
    [viewBox]
  );

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as Element).closest(".flowchart-node")) {
      // Left mouse button and not on a node
      setIsPanning(true);
      const svgCoords = screenToSVG(e.clientX, e.clientY);
      setPanStart(svgCoords);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const svgCoords = screenToSVG(e.clientX, e.clientY);
      const dx = panStart.x - svgCoords.x;
      const dy = panStart.y - svgCoords.y;

      setViewBox((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Prevent all scrolling over the flowchart
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setViewBox({ x: 0, y: 0, width: 800, height: 600 });
  };

  // Zoom controls
  const zoomIn = () => {
    const newZoom = Math.min(5, zoom * 1.2);
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const newWidth = viewBox.width * (zoom / newZoom);
    const newHeight = viewBox.height * (zoom / newZoom);

    setZoom(newZoom);
    setViewBox({
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    });
  };

  const zoomOut = () => {
    const newZoom = Math.max(0.1, zoom * 0.8);
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const newWidth = viewBox.width * (zoom / newZoom);
    const newHeight = viewBox.height * (zoom / newZoom);

    setZoom(newZoom);
    setViewBox({
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    });
  };

  const addNode = () => {
    if (!newNodeText.trim()) return;

    const newNode: FlowNode = {
      id: Date.now().toString(),
      text: newNodeText.trim(),
      type: newNodeType,
      x: viewBox.x + viewBox.width / 2 + (Math.random() - 0.5) * 100,
      y: viewBox.y + viewBox.height / 2 + (Math.random() - 0.5) * 100,
      connections: [],
    };

    const updatedData = {
      nodes: [...flowData.nodes, newNode],
    };
    onChange(updatedData);
    setNewNodeText("");
    setShowAddNode(false);
  };

  const deleteNode = (nodeId: string) => {
    const updatedNodes = flowData.nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => ({
        ...node,
        connections: node.connections?.filter((conn) => conn !== nodeId) || [],
      }));

    onChange({ nodes: updatedNodes });
    setSelectedNode(null);
  };

  const updateNodeText = (nodeId: string, newText: string) => {
    const updatedNodes = flowData.nodes.map((node) =>
      node.id === nodeId ? { ...node, text: newText } : node
    );
    onChange({ nodes: updatedNodes });
  };

  const handleNodeClick = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (isConnecting) {
      if (connectionSource && connectionSource !== nodeId) {
        // Create connection
        const updatedNodes = flowData.nodes.map((node) => {
          if (node.id === connectionSource) {
            return {
              ...node,
              connections: [...(node.connections || []), nodeId],
            };
          }
          return node;
        });
        onChange({ nodes: updatedNodes });
        setIsConnecting(false);
        setConnectionSource(null);
      } else {
        setConnectionSource(nodeId);
      }
    } else {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
    }
  };

  const getNodeShape = (node: FlowNode) => {
    const isSelected = selectedNode === node.id;
    const strokeColor = isSelected ? "#3b82f6" : "#6b7280";
    const strokeWidth = isSelected ? 3 : 2;

    switch (node.type) {
      case "start":
      case "end":
        return (
          <circle
            cx={node.x}
            cy={node.y}
            r={40}
            fill={node.type === "start" ? "#10b981" : "#ef4444"}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="cursor-pointer flowchart-node"
          />
        );
      case "decision":
        return (
          <polygon
            points={`${node.x},${node.y - 40} ${node.x + 40},${node.y} ${
              node.x
            },${node.y + 40} ${node.x - 40},${node.y}`}
            fill="#f59e0b"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="cursor-pointer flowchart-node"
          />
        );
      default: // process
        return (
          <rect
            x={node.x - 40}
            y={node.y - 25}
            width={80}
            height={50}
            fill="#3b82f6"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            rx={5}
            className="cursor-pointer flowchart-node"
          />
        );
    }
  };

  const renderConnections = () => {
    const connections: React.ReactNode[] = [];
    flowData.nodes.forEach((node) => {
      if (node.connections) {
        node.connections.forEach((targetId) => {
          const targetNode = flowData.nodes.find((n) => n.id === targetId);
          if (targetNode) {
            connections.push(
              <line
                key={`${node.id}-${targetId}`}
                x1={node.x}
                y1={node.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="#6b7280"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
            );
          }
        });
      }
    });
    return connections;
  };

  return (
    <div className="border dark:border-dark-divider rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-dark-secondary border-b dark:border-dark-divider p-3">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
                : "bg-gray-200 dark:bg-dark-background text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <ArrowDown className="w-4 h-4" />
            {isConnecting ? "Cancel Connect" : "Connect Nodes"}
          </button>

          {/* Viewport controls */}
          <div className="flex items-center gap-1 border-l dark:border-dark-divider pl-2 ml-2">
            <button
              onClick={zoomIn}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {Math.round(zoom * 100)}%
            </span>
          </div>

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
          <div className="space-y-2">
            <input
              type="text"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              placeholder="Node text..."
              className="w-full px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-background dark:text-dark-textPrimary"
              onKeyDown={(e) => e.key === "Enter" && addNode()}
              autoFocus
            />
            <div className="flex gap-2 items-center">
              <span className="text-sm dark:text-dark-textPrimary">Type:</span>
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as any)}
                className="px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-background dark:text-dark-textPrimary"
              >
                <option value="start">Start</option>
                <option value="process">Process</option>
                <option value="decision">Decision</option>
                <option value="end">End</option>
              </select>
              <button
                onClick={addNode}
                disabled={!newNodeText.trim()}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddNode(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isConnecting && connectionSource && (
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Click another node to connect from "
            {flowData.nodes.find((n) => n.id === connectionSource)?.text}"
          </div>
        )}
      </div>

      <div style={{ height, overflow: "hidden" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="bg-white dark:bg-dark-background cursor-move"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
          </defs>

          {renderConnections()}

          {flowData.nodes.map((node) => (
            <g key={node.id} onClick={(e) => handleNodeClick(node.id, e)}>
              {getNodeShape(node)}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-medium fill-white pointer-events-none flowchart-node"
                style={{ fontSize: "11px" }}
              >
                {node.text.length > 10
                  ? `${node.text.substring(0, 10)}...`
                  : node.text}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selectedNode && (
        <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-3">
          <div className="text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Edit Node: {flowData.nodes.find((n) => n.id === selectedNode)?.text}
          </div>
          <input
            type="text"
            value={
              flowData.nodes.find((n) => n.id === selectedNode)?.text || ""
            }
            onChange={(e) => updateNodeText(selectedNode, e.target.value)}
            className="w-full px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-background dark:text-dark-textPrimary"
          />
        </div>
      )}

      <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-green-500" />
            Start/End
          </div>
          <div className="flex items-center gap-1">
            <Square className="w-3 h-3 text-blue-500" />
            Process
          </div>
          <div className="flex items-center gap-1">
            <Diamond className="w-3 h-3 text-yellow-500" />
            Decision
          </div>
          <div className="flex items-center gap-1">
            <Move className="w-3 h-3" />
            Drag to pan • Use zoom buttons
          </div>
          <span>Click: select • Connect mode: create arrows</span>
        </div>
      </div>
    </div>
  );
}
