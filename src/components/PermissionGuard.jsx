/**
 * PermissionGuard Component
 * Use this component to conditionally render UI elements based on user permissions
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children only if user has the required permission
 * 
 * @component
 * @example
 * // Show button only if user has CREATE permission
 * <PermissionGuard 
 *   entityId={journalEntity._id} 
 *   action="CREATE"
 *   fallback={<span>No Permission</span>}
 * >
 *   <button onClick={handleCreate}>Create Journal</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  entityId, 
  module,
  action = "VIEW", 
  children, 
  fallback = null 
}) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(module, action, { entityId });

  if (!allowed) {
    return fallback;
  }

  return children;
}

/**
 * ActionButton Component
 * Renders a button that's automatically disabled when user lacks permission
 * 
 * @component
 * @example
 * <ActionButton 
 *   entityId={journalEntity._id}
 *   action="CREATE"
 *   onClick={handleCreate}
 * >
 *   Create Journal
 * </ActionButton>
 */
export function ActionButton({
  entityId,
  module,
  action = "VIEW",
  onClick,
  children,
  className = "",
  disabledClassName = "opacity-50 cursor-not-allowed",
  ...props
}) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(module, action, { entityId });

  return (
    <button
      onClick={onClick}
      disabled={!allowed}
      className={`${className} ${!allowed ? disabledClassName : ""}`}
      title={!allowed ? `No permission to ${action.toLowerCase()}` : ""}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * FeatureGuard Component
 * Higher-order component for protecting entire feature sections
 * 
 * @component
 * @example
 * <FeatureGuard 
 *   entityId={journalEntity._id}
 *   fallback={<div>You don't have access to this feature</div>}
 * >
 *   <JournalModule />
 * </FeatureGuard>
 */
export function FeatureGuard({ 
  entityId, 
  module,
  children, 
  fallback = null 
}) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(module, "VIEW", { entityId });

  if (!allowed) {
    return fallback;
  }

  return children;
}

export default PermissionGuard;

/**
 * Usage Examples:
 * 
 * // Example 1: Show/hide button based on permission
 * <ActionButton
 *   entityId={entity._id}
 *   action="CREATE"
 *   onClick={handleCreate}
 *   className="bg-blue-500 text-white px-4 py-2 rounded"
 * >
 *   Create New Item
 * </ActionButton>
 * 
 * // Example 2: Conditionally render entire section
 * <PermissionGuard 
 *   entityId={journalEntity._id} 
 *   action="CREATE"
 *   fallback={<p>You don't have permission to create journals</p>}
 * >
 *   <div>
 *     <h3>Create New Journal</h3>
 *     <form {...journalForm}>...</form>
 *   </div>
 * </PermissionGuard>
 * 
 * // Example 3: Protect an entire feature module
 * <FeatureGuard 
 *   entityId={invoiceEntity._id}
 *   fallback={
 *     <div className="p-6 text-center">
 *       <p>You don't have access to invoice management</p>
 *     </div>
 *   }
 * >
 *   <InvoiceModule />
 * </FeatureGuard>
 */
