"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  collapsed?: boolean;
}

interface InteractiveTreeProps {
  data: TreeNode;
  onChange: (data: TreeNode) => void;
  height?: number;
}

export default function InteractiveTree({
  data,
  onChange,
  height = 400,
}: InteractiveTreeProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  const [showAddNode, setShowAddNode] = useState(false);

  // Initialize with default data if empty
  const treeData =
    !data || !data.id
      ? {
          id: "1",
          name: "Root Node",
          children: [
            {
              id: "2",
              name: "Child 1",
              children: [
                { id: "4", name: "Grandchild 1" },
                { id: "5", name: "Grandchild 2" },
              ],
            },
            { id: "3", name: "Child 2" },
          ],
        }
      : data;

  const addChildNode = (parentId: string) => {
    if (!newNodeName.trim()) return;

    const newNode: TreeNode = {
      id: Date.now().toString(),
      name: newNodeName.trim(),
      children: [],
    };

    const updateNodeRecursively = (node: TreeNode): TreeNode => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeRecursively),
        };
      }
      return node;
    };

    const updatedData = updateNodeRecursively(treeData);
    onChange(updatedData);
    setNewNodeName("");
    setShowAddNode(false);
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === treeData.id) {
      return; // Can't delete root
    }

    const deleteNodeRecursively = (node: TreeNode): TreeNode => {
      if (node.children) {
        return {
          ...node,
          children: node.children
            .filter((child) => child.id !== nodeId)
            .map(deleteNodeRecursively),
        };
      }
      return node;
    };

    const updatedData = deleteNodeRecursively(treeData);
    onChange(updatedData);
    setSelectedNode(null);
  };

  const updateNodeName = (nodeId: string, newName: string) => {
    const updateNodeRecursively = (node: TreeNode): TreeNode => {
      if (node.id === nodeId) {
        return { ...node, name: newName };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeRecursively),
        };
      }
      return node;
    };

    const updatedData = updateNodeRecursively(treeData);
    onChange(updatedData);
  };

  const toggleCollapse = (nodeId: string) => {
    const updateNodeRecursively = (node: TreeNode): TreeNode => {
      if (node.id === nodeId) {
        return { ...node, collapsed: !node.collapsed };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeRecursively),
        };
      }
      return node;
    };

    const updatedData = updateNodeRecursively(treeData);
    onChange(updatedData);
  };

  const findNodeName = (nodeId: string, node: TreeNode = treeData): string => {
    if (node.id === nodeId) return node.name;
    if (node.children) {
      for (const child of node.children) {
        const result = findNodeName(nodeId, child);
        if (result) return result;
      }
    }
    return "";
  };

  const renderTreeNode = (
    node: TreeNode,
    level: number = 0
  ): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 24;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-dark-secondary cursor-pointer rounded transition-colors ${
            selectedNode === node.id ? "bg-blue-100 dark:bg-blue-900/20" : ""
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() =>
            setSelectedNode(selectedNode === node.id ? null : node.id)
          }
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(node.id);
              }}
              className="mr-2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {node.collapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex-1 flex items-center justify-between">
            <span className="text-sm dark:text-dark-textPrimary font-medium">
              {node.name}
            </span>

            {selectedNode === node.id && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddNode(true);
                  }}
                  className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-xs"
                  title="Add child"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {node.id !== treeData.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(`Delete "${node.name}" and all its children?`)
                      ) {
                        deleteNode(node.id);
                      }
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-xs"
                    title="Delete node"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {hasChildren && !node.collapsed && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
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
        </div>

        {showAddNode && (
          <div className="space-y-2">
            <input
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              placeholder="Node name..."
              className="w-full px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-secondary dark:text-dark-textPrimary"
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
                disabled={!selectedNode || !newNodeName.trim()}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add as Child
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
                Select a node first to add a child to it
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ height, overflow: "auto" }} className="p-3">
        {renderTreeNode(treeData)}
      </div>

      {selectedNode && (
        <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-3">
          <div className="text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Edit Node: {findNodeName(selectedNode)}
          </div>
          <input
            type="text"
            value={findNodeName(selectedNode)}
            onChange={(e) => updateNodeName(selectedNode, e.target.value)}
            className="w-full px-2 py-1 border dark:border-dark-divider rounded text-sm dark:bg-dark-secondary dark:text-dark-textPrimary"
          />
        </div>
      )}

      <div className="bg-gray-50 dark:bg-dark-secondary border-t dark:border-dark-divider p-2 text-xs text-gray-500 dark:text-gray-400">
        Click: select • Arrows: expand/collapse • Controls appear when selected
      </div>
    </div>
  );
}
