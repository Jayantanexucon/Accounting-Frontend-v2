// components/CompanyPermissionModal.jsx
import React, { useState, useEffect } from "react";
import { X, Save, CheckSquare, Square, FolderTree, Building2, ChevronRight, ChevronDown, Folder, FolderOpen, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { getEntitiesApi } from "../apis/entityApi";
import { getCompaniesApi } from "../apis/entityApi";
import { updateUserPermissionsApi } from "../apis/userApi";
import { useAuth } from "../contexts/AuthContext";

const ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE"];

function CompanyPermissionModal({ isOpen, onClose, user, onSuccess, getUsers }) {
  const [entities, setEntities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedEntityIds, setExpandedEntityIds] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [bulkSelectAll, setBulkSelectAll] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const { initAuth } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      fetchData();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCompany(null);
      updatePermissionsForCompany(null);
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entitiesData, companiesData] = await Promise.all([getEntitiesApi(), getCompaniesApi()]);
      setEntities(entitiesData?.data || []);
      setCompanies(companiesData?.data || []);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const updatePermissionsForCompany = (companyId) => {
    const companyPermissions =
      user?.permissions
        ?.filter((perm) => {
          const permCompanyId = typeof perm.company === "object" ? perm.company?._id : perm.company;
          return permCompanyId === (companyId || null);
        })
        ?.map((permission) => ({
          _id: permission._id,
          entity: typeof permission.entity === "object" ? permission.entity._id : permission.entity,
          company: typeof permission.company === "object" ? permission.company?._id || null : permission.company,
          actions: permission.actions,
        })) || [];

    setSelectedPermissions(companyPermissions);
    setBulkSelectAll(false);
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    updatePermissionsForCompany(company?._id || null);
  };

  // Get all child entity IDs for a parent
  const getChildEntityIds = (parentId) => {
    return entities.filter((entity) => entity.parent?._id === parentId).map((entity) => entity._id);
  };

  // Get all descendant IDs (children + grandchildren, etc.)
  const getAllDescendantIds = (parentId) => {
    const descendants = [];
    const stack = [parentId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      const children = entities.filter((e) => e.parent?._id === currentId);

      children.forEach((child) => {
        descendants.push(child._id);
        stack.push(child._id);
      });
    }

    return descendants;
  };

  const handleEntityActionToggle = (entityId, isSelected, isBulk = false, specificAction = null) => {
    setSelectedPermissions((prev) => {
      const newPermissions = [...prev];
      const entity = entities.find((e) => e._id === entityId);
      const childIds = getAllDescendantIds(entityId);
      const allAffectedIds = [entityId, ...childIds];

      // For bulk select/deselect all actions
      if (isBulk) {
        // Remove existing permissions for this entity and its children
        const filteredPermissions = newPermissions.filter((perm) => !allAffectedIds.includes(perm.entity));

        if (isSelected) {
          // Add all actions to entity and all children
          allAffectedIds.forEach((id) => {
            filteredPermissions.push({
              entity: id,
              company: selectedCompany?._id || null,
              actions: [...ACTIONS],
            });
          });
        }

        return filteredPermissions;
      }

      // For single action toggle
      if (isSelected) {
        // Add action to entity and all children
        allAffectedIds.forEach((id) => {
          const existingIndex = newPermissions.findIndex((p) => p.entity === id);

          if (existingIndex >= 0) {
            if (!newPermissions[existingIndex].actions.includes(specificAction)) {
              newPermissions[existingIndex].actions.push(specificAction);
            }
          } else {
            newPermissions.push({
              entity: id,
              company: selectedCompany?._id || null,
              actions: [specificAction],
            });
          }
        });
      } else {
        // Remove action from entity and all children
        allAffectedIds.forEach((id) => {
          const existingIndex = newPermissions.findIndex((p) => p.entity === id);

          if (existingIndex >= 0) {
            newPermissions[existingIndex].actions = newPermissions[existingIndex].actions.filter((a) => a !== specificAction);

            if (newPermissions[existingIndex].actions.length === 0) {
              newPermissions.splice(existingIndex, 1);
            }
          }
        });
      }

      return newPermissions;
    });
  };

  const buildEntityTree = (parentId = null, level = 0) => {
    return entities
      .filter((entity) => (parentId === null && !entity.parent) || (entity.parent && entity.parent._id === parentId))
      .map((entity) => {
        const children = buildEntityTree(entity._id, level + 1);
        const hasChildren = children.length > 0;
        const isExpanded = expandedEntityIds.includes(entity._id);

        // Find existing permission
        const existingPermission = selectedPermissions.find((p) => p.entity === entity._id);
        const hasAllActions = existingPermission && ACTIONS.every((action) => existingPermission.actions.includes(action));

        return (
          <div key={entity._id} className={level > 0 ? "ml-6" : ""}>
            <div className="flex items-start gap-2 py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-start gap-2">
                {hasChildren ? (
                  <button onClick={() => toggleEntityNode(entity._id)} className="p-1 hover:bg-gray-100 rounded mt-1">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                  </button>
                ) : (
                  <div className="w-6" />
                )}
                {isExpanded ? <FolderOpen className="w-5 h-5 text-blue-500 mt-1" /> : <Folder className="w-5 h-5 text-gray-500 mt-1" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{entity.name}</span>
                    {entity.key && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{entity.key}</span>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEntityActionToggle(entity._id, !hasAllActions, true);
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ml-2
                      ${hasAllActions ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                  >
                    {hasAllActions ? "Clear All" : "Select All"}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACTIONS.map((action) => {
                    const isChecked = existingPermission?.actions?.includes(action) || false;

                    return (
                      <label
                        key={action}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer 
                                 transition-all duration-200 hover:scale-[1.02]
                                 ${isChecked ? getActionBorderColor(action) : "border-gray-200 hover:border-gray-300"}`}
                        title={action}
                      >
                        <div className="relative">
                          <input type="checkbox" checked={isChecked} onChange={() => handleEntityActionToggle(entity._id, !isChecked, false, action)} className="sr-only" />
                          {isChecked ? <CheckSquare className={`w-4 h-4 ${getActionIconColor(action)}`} /> : <Square className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-medium ${isChecked ? getActionTextColor(action) : "text-gray-600"}`}>{action}</span>
                          {isChecked && <span className={`w-2 h-2 rounded-full ${getActionBadgeColor(action)}`}></span>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            {hasChildren && isExpanded && <div className="ml-8">{children}</div>}
          </div>
        );
      });
  };

  const toggleEntityNode = (entityId) => {
    setExpandedEntityIds((prev) => (prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]));
  };

  const handleBulkSelectAll = () => {
    if (bulkSelectAll) {
      // Clear all permissions
      setSelectedPermissions([]);
    } else {
      // Add VIEW to all entities
      const allEntityIds = entities.map((e) => e._id);
      const newPermissions = allEntityIds.map((entityId) => ({
        entity: entityId,
        company: selectedCompany?._id || null,
        actions: ["VIEW"],
      }));
      setSelectedPermissions(newPermissions);
    }
    setBulkSelectAll(!bulkSelectAll);
  };

  const handleSaveAll = async () => {
    if (!user || !selectedCompany) return;

    try {
      setLoading(true);

      const payload = {
        companyId: selectedCompany._id,
        permissions: selectedPermissions.map((perm) => ({
          entity: perm.entity,
          company: selectedCompany._id,
          actions: perm.actions,
        })),
      };

      // IMPORTANT:
      // If selectedPermissions is empty,
      // backend will REMOVE all permissions for this company
      await updateUserPermissionsApi(user._id, payload);

      toast.success(`Permissions updated successfully for ${selectedCompany.name}`);
      await initAuth();
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };


  // Helper functions for styling
  const getActionBorderColor = (action) => {
    switch (action) {
      case "VIEW":
        return "border-gray-300 bg-gray-50";
      case "CREATE":
        return "border-green-300 bg-green-50";
      case "EDIT":
        return "border-blue-300 bg-blue-50";
      case "DELETE":
        return "border-red-300 bg-red-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getActionIconColor = (action) => {
    switch (action) {
      case "VIEW":
        return "text-gray-700";
      case "CREATE":
        return "text-green-700";
      case "EDIT":
        return "text-blue-700";
      case "DELETE":
        return "text-red-700";
      default:
        return "text-gray-700";
    }
  };

  const getActionTextColor = (action) => {
    switch (action) {
      case "VIEW":
        return "text-gray-800";
      case "CREATE":
        return "text-green-800";
      case "EDIT":
        return "text-blue-800";
      case "DELETE":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case "VIEW":
        return "bg-gray-500";
      case "CREATE":
        return "bg-green-500";
      case "EDIT":
        return "bg-blue-500";
      case "DELETE":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const countSelectedEntities = () => {
    return selectedPermissions.length;
  };

  const countTotalActions = () => {
    return selectedPermissions.reduce((total, perm) => total + perm.actions.length, 0);
  };

  const refreshData = async () => {
    await fetchData();
    toast.success("Data refreshed");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Permissions for {user?.name}</h2>
              <p className="text-gray-600 text-sm mt-1">Select a company and set permissions</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh data">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Company Selection */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {companies?.map((company) => {
              const isSelected = selectedCompany?._id === company._id;
              return (
                <button
                  key={company._id}
                  onClick={() => handleCompanySelect(company)}
                  className={`px-4 py-2.5 rounded-lg border flex items-center gap-2 transition-all duration-200
                    ${isSelected ? "border-gray-900 bg-gray-900 text-white shadow-sm" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm"}`}
                >
                  <Building2 className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-500"}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium">{company.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        {selectedCompany ? (
          <>
            {/* Stats */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{countSelectedEntities()}</div>
                    <div className="text-xs text-gray-600">Entities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{countTotalActions()}</div>
                    <div className="text-xs text-gray-600">Actions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{entities.length}</div>
                    <div className="text-xs text-gray-600">Total Entities</div>
                  </div>
                </div>
                <button
                  onClick={handleBulkSelectAll}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 
                           rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  {bulkSelectAll ? (
                    <>
                      <Square className="w-4 h-4" />
                      Clear All Entities
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Select All Entities (VIEW only)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Entity Tree */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-320px)]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="text-gray-600 mt-2">Loading entities...</p>
                </div>
              ) : entities.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No entities found</p>
                  <p className="text-sm text-gray-500">Create entities first to manage permissions</p>
                </div>
              ) : (
                <div className="space-y-1">{buildEntityTree()}</div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Company</h3>
            <p className="text-gray-600">Choose a company from the list above to manage its permissions</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCompany ? (
                <div className="flex items-center gap-4">
                  <span>{selectedCompany.name}</span>
                  <span>•</span>
                  <span>{countSelectedEntities()} entities</span>
                  <span>•</span>
                  <span>{countTotalActions()} actions</span>
                </div>
              ) : (
                <span>Select a company to begin</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 
                         hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {selectedCompany && (
                <button
                  onClick={handleSaveAll}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium bg-gray-900 
                           text-white rounded-lg hover:bg-gray-800 
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Permissions for {selectedCompany.name}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyPermissionModal;
