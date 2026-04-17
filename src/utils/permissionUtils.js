/**
 * Permission Checking Utilities
 * Use these functions throughout the frontend for consistent permission validation
 */

/**
 * Check if user has a specific permission for an entity
 * @param {Array} userPermissions - User's permissions array from backend
 * @param {String|Object} entityId - Entity ID (string or object with _id)
 * @param {String} action - Permission action (VIEW, CREATE, EDIT, DELETE)
 * @param {String|Object} companyId - Company ID (string or object with _id)
 * @returns {Boolean} Whether user has the permission
 */
export const checkPermission = (userPermissions, entityId, action, companyId) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;

  return userPermissions.some((permission) => {
    // Handle both string and object formats for entity
    const permissionEntityId = typeof permission.entity === "object" 
      ? permission.entity._id 
      : permission.entity;

    // Handle both string and object formats for company
    const permissionCompanyId = typeof permission.company === "object" 
      ? permission.company._id 
      : permission.company;

    // Extract company ID if it's an object
    const targetCompanyId = typeof companyId === "object" 
      ? companyId._id 
      : companyId;

    return (
      permissionEntityId?.toString() === entityId?.toString() &&
      permissionCompanyId?.toString() === targetCompanyId?.toString() &&
      permission.actions.includes(action)
    );
  });
};

/**
 * Check if user has VIEW permission for an entity
 */
export const canView = (userPermissions, entityId, companyId) => {
  return checkPermission(userPermissions, entityId, "VIEW", companyId);
};

/**
 * Check if user has CREATE permission for an entity
 */
export const canCreate = (userPermissions, entityId, companyId) => {
  return checkPermission(userPermissions, entityId, "CREATE", companyId);
};

/**
 * Check if user has EDIT permission for an entity
 */
export const canEdit = (userPermissions, entityId, companyId) => {
  return checkPermission(userPermissions, entityId, "EDIT", companyId);
};

/**
 * Check if user has DELETE permission for an entity
 */
export const canDelete = (userPermissions, entityId, companyId) => {
  return checkPermission(userPermissions, entityId, "DELETE", companyId);
};

/**
 * React Hook: usePermission
 * Use this hook in components for easy permission checking
 * @param {Object} user - User object from AuthContext
 * @returns {Object} Permission checking functions
 */
export const usePermission = (user) => {
  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany"));

  if (!user || !selectedCompany) {
    return {
      can: () => false,
      canView: () => false,
      canCreate: () => false,
      canEdit: () => false,
      canDelete: () => false,
    };
  }

  return {
    can: (entityId, action) => 
      checkPermission(user.permissions, entityId, action, selectedCompany._id),
    canView: (entityId) => 
      canView(user.permissions, entityId, selectedCompany._id),
    canCreate: (entityId) => 
      canCreate(user.permissions, entityId, selectedCompany._id),
    canEdit: (entityId) => 
      canEdit(user.permissions, entityId, selectedCompany._id),
    canDelete: (entityId) => 
      canDelete(user.permissions, entityId, selectedCompany._id),
  };
};

/**
 * Example Usage in Components:
 * 
 * import { usePermission } from "../utils/permissionUtils.js";
 * import { useAuth } from "../contexts/AuthContext.jsx";
 * 
 * export function JournalsPage() {
 *   const { user } = useAuth();
 *   const { canCreate, canEdit, canDelete } = usePermission(user);
 *   const journalEntity = entities.find(e => e.key === "JOURNAL");
 * 
 *   return (
 *     <div>
 *       {canCreate(journalEntity._id) && (
 *         <button onClick={handleCreate}>+ Create Journal</button>
 *       )}
 *     </div>
 *   );
 * }
 */
