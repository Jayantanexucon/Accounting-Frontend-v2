// components/entities/EntityList.jsx
import React, { useState } from "react";
import {
  FolderTree,
  FolderOpen,
  Folder,
  FileEdit,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  CirclePlus,
} from "lucide-react";
import EntityModal from "./CreateEntityModal";
import { createEntityApi,updateEntityApi } from "../apis/entityApi";

function EntityList({
  entities,
  loading,
  onEdit,
  onDelete,
  onRefresh,
  onCreate,
}) {
  const [expandedIds, setExpandedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [createEntityModal, setCreateEntityModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [editEntity, setEditEntity] = useState(null);

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateChild = (entity) => {
    if (onCreate) {
      onCreate(entity); // Pass the parent entity to create as child
    }
  };

  const handleCreateRoot = () => {
    if (onCreate) {
      onCreate(null); // Pass null to create at root level
    }
  };

  const createEntityHandler = async (
    name,
    key,
    isNavItem,
    navLink,
    parentId,
    system,
    editId
  ) => {
    try {
      if (editId) {
        await updateEntityApi(editId, {
          name,
          isNavItem,
          navLink,
          system,
        });
      } else {
        await createEntityApi({
          name,
          key,
          isNavItem,
          navLink,
          parent: parentId,
          system,
        });
      }
      setCreateEntityModal(false);
      await onRefresh();
    } catch (error) {
      throw error;
    }
  };

  const renderEntityTree = (parentId = null, level = 0) => {
    return filteredEntities
      .filter(
        (entity) =>
          (parentId === null && !entity.parent) ||
          (entity.parent && entity.parent._id === parentId)
      )
      .map((entity) => {
        const children = renderEntityTree(entity._id, level + 1);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.includes(entity._id);

        return (
          <div key={entity._id}>
            {/* Entity Row */}
            <div
              className={`flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 ${
                level > 0 ? "ml-6" : ""
              }`}
            >
              {/* Expand/Collapse */}
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(entity._id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              ) : (
                <div className="w-6" />
              )}

              {/* Icon */}
              {isExpanded ? (
                <FolderOpen className="w-5 h-5 text-blue-500" />
              ) : (
                <Folder className="w-5 h-5 text-gray-500" />
              )}

              {/* Entity Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {entity.name}
                  </span>
                  {entity.key && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {entity.key}
                    </span>
                  )}
                  {entity.isSystem && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      System
                    </span>
                  )}
                </div>
                {entity.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {entity.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Add Child Entity Button */}
                <button
                  onClick={() => {
                    setEditEntity(null); // 👈 clear edit mode
                    setSelectedParent(entity);
                    setCreateEntityModal(true);
                  }}
                  className="p-2 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors"
                  title="Add Child Entity"
                >
                  <CirclePlus className="w-4 h-4" />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => {
                    setEditEntity(entity);
                    setSelectedParent(entity.parent || null);
                    setCreateEntityModal(true);
                  }}
                  className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  title="Edit"
                >
                  <FileEdit className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                {!entity.isSystem && (
                  <button
                    onClick={() => onDelete(entity)}
                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
              <div className="ml-6">{children}</div>
            )}
          </div>
        );
      });
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="text-gray-600 mt-2">Loading entities...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              onClick={handleCreateRoot}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Add Root Entity"
            >
              <Plus className="w-4 h-4" />
              Add Root
            </button> */}

            <button
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      {createEntityModal && (
        <EntityModal
          isOpen={createEntityModal}
          onClose={() => {
            setCreateEntityModal(false);
            setEditEntity(null);
          }}
          parent={selectedParent}
          editEntity={editEntity}
          handleSubmit={createEntityHandler}
        />
      )}
      {/* Entity List */}
      {filteredEntities.length === 0 ? (
        <div className="p-12 text-center">
          <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No entities found</p>
          {searchTerm ? (
            <p className="text-sm text-gray-500">Try a different search term</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">
                Create your first entity to get started
              </p>
              <button
                onClick={() => {
                  setEditEntity(null); // 👈 clear edit mode
                  setSelectedParent(null);
                  setCreateEntityModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Entity
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Root Level Header with Action */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Root Entities</h3>
              <span className="text-sm text-gray-500">
                ({filteredEntities.filter((e) => !e.parent).length})
              </span>
            </div>
            <button
              onClick={() => {
                setEditEntity(null); // 👈 clear edit mode
                setSelectedParent(null);
                setCreateEntityModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add at Root
            </button>
          </div>

          {/* Tree */}
          <div className="divide-y divide-gray-100">{renderEntityTree()}</div>
        </div>
      )}
    </div>
  );
}

export default EntityList;
