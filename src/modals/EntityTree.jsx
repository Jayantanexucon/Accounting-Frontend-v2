// components/EntityTree.jsx
import React, { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";

function EntityTree({ entities, selectedEntity, onSelect }) {
  const [expandedNodes, setExpandedNodes] = useState([]);

  const toggleNode = (entityId) => {
    setExpandedNodes((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  };

  const buildTree = (parentId = null) => {
    return entities
      .filter((entity) => entity.parent === parentId)
      .map((entity) => {
        const children = buildTree(entity._id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.includes(entity._id);
        const isSelected = selectedEntity === entity._id;

        return (
          <div key={entity._id} className="ml-4">
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
                       transition-colors ${
                         isSelected
                           ? "bg-gray-100 text-gray-900"
                           : "hover:bg-gray-50 text-gray-700"
                       }`}
              onClick={() => onSelect(entity._id)}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(entity._id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="w-6" />
              )}

              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-gray-500" />
              )}

              <span className="text-sm">{entity.name}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {entity.key}
              </span>
            </div>

            {hasChildren && isExpanded && (
              <div className="ml-4 border-l border-gray-200">{children}</div>
            )}
          </div>
        );
      });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Entity Hierarchy
      </h4>
      {buildTree()}
    </div>
  );
}

export default EntityTree;
