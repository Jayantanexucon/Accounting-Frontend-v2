const normalizeToken = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const normalizeAction = (value = "") => normalizeToken(value);

const safeJsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const getStoredSelectedCompany = () =>
  safeJsonParse(localStorage.getItem("selectedCompany"));

export const getStoredEntities = () =>
  safeJsonParse(localStorage.getItem("entityCatalog"), []);

const getCompanyId = (company) =>
  company?._id || company?.id || company?.companyId || company;

const getEntityId = (entity) =>
  entity?._id || entity?.id || entity?.entityId || entity;

const buildEntityMaps = (entities = []) => {
  const byId = new Map();
  const byKey = new Map();

  entities.forEach((entity) => {
    const entityId = getEntityId(entity)?.toString();
    if (entityId) {
      byId.set(entityId, entity);
    }

    const normalizedKey = normalizeToken(entity?.key || entity?.name);
    if (normalizedKey) {
      byKey.set(normalizedKey, entity);
    }
  });

  return { byId, byKey };
};

const permissionHasAction = (permission, action) => {
  const normalizedAction = normalizeAction(action);

  if (Array.isArray(permission?.actions)) {
    return permission.actions.some(
      (item) => normalizeAction(item) === normalizedAction
    );
  }

  if (permission?.actions && typeof permission.actions === "object") {
    const matchedKey = Object.keys(permission.actions).find(
      (key) => normalizeAction(key) === normalizedAction
    );
    return Boolean(matchedKey && permission.actions[matchedKey]);
  }

  return false;
};

export const resolvePermissionModule = (permission, entities = []) => {
  const directModule =
    permission?.module ||
    permission?.entityKey ||
    permission?.entity?.key ||
    permission?.entity?.name;

  if (directModule) {
    return normalizeToken(directModule);
  }

  const entityId = getEntityId(permission?.entity)?.toString();
  if (!entityId) return "";

  const { byId } = buildEntityMaps(entities);
  const matchedEntity = byId.get(entityId);
  return normalizeToken(matchedEntity?.key || matchedEntity?.name);
};

export const normalizePermissions = (permissions = [], entities = []) =>
  Array.isArray(permissions)
    ? permissions.map((permission) => ({
        entityId: getEntityId(permission?.entity)?.toString() || "",
        module: resolvePermissionModule(permission, entities),
        companyId: getCompanyId(permission?.company)?.toString() || "",
        actions: permission?.actions || {},
        raw: permission,
      }))
    : [];

export const hasPermission = ({
  user,
  permissions,
  entities,
  module,
  entityId,
  action = "VIEW",
  companyId,
} = {}) => {
  if (!user && !permissions) return false;
  if ((user?.role || "").toLowerCase() === "superadmin") return true;

  const effectivePermissions = permissions || user?.permissions || [];
  if (!Array.isArray(effectivePermissions) || effectivePermissions.length === 0) {
    return false;
  }

  const effectiveEntities =
    entities?.length > 0 ? entities : getStoredEntities();
  const effectiveCompanyId =
    getCompanyId(companyId || user?.company || getStoredSelectedCompany())?.toString();
  const normalizedModule = normalizeToken(module);
  const normalizedEntityId = getEntityId(entityId)?.toString();

  return effectivePermissions.some((permission) => {
    const permissionCompanyId = getCompanyId(
      permission?.company || permission?.companyId
    )?.toString();
    const permissionEntityId = getEntityId(permission?.entity)?.toString();
    const permissionModule = resolvePermissionModule(permission, effectiveEntities);

    const matchesModule =
      normalizedModule && permissionModule === normalizedModule;
    const matchesEntityId =
      normalizedEntityId && permissionEntityId === normalizedEntityId;

    if (!matchesModule && !matchesEntityId) {
      return false;
    }

    if (effectiveCompanyId && permissionCompanyId !== effectiveCompanyId) {
      return false;
    }

    return permissionHasAction(permission, action);
  });
};

export const checkPermission = (
  userPermissions,
  entityId,
  action,
  companyId,
  entities = []
) =>
  hasPermission({
    permissions: userPermissions,
    entityId,
    action,
    companyId,
    entities,
  });

export const canView = (userPermissions, entityId, companyId, entities = []) =>
  checkPermission(userPermissions, entityId, "VIEW", companyId, entities);

export const canCreate = (userPermissions, entityId, companyId, entities = []) =>
  checkPermission(userPermissions, entityId, "CREATE", companyId, entities);

export const canEdit = (userPermissions, entityId, companyId, entities = []) =>
  checkPermission(userPermissions, entityId, "EDIT", companyId, entities);

export const canDelete = (userPermissions, entityId, companyId, entities = []) =>
  checkPermission(userPermissions, entityId, "DELETE", companyId, entities);

export const usePermission = (user, entities = []) => {
  const selectedCompany = getStoredSelectedCompany();

  return {
    can: (moduleOrEntityId, action = "VIEW", options = {}) =>
      hasPermission({
        user,
        entities,
        companyId: options.companyId || selectedCompany?._id,
        module: options.module ? moduleOrEntityId : undefined,
        entityId: options.module ? options.entityId : moduleOrEntityId,
        action,
      }),
    canView: (module, options = {}) =>
      hasPermission({
        user,
        entities,
        companyId: options.companyId || selectedCompany?._id,
        module,
        entityId: options.entityId,
        action: "VIEW",
      }),
    canCreate: (module, options = {}) =>
      hasPermission({
        user,
        entities,
        companyId: options.companyId || selectedCompany?._id,
        module,
        entityId: options.entityId,
        action: "CREATE",
      }),
    canEdit: (module, options = {}) =>
      hasPermission({
        user,
        entities,
        companyId: options.companyId || selectedCompany?._id,
        module,
        entityId: options.entityId,
        action: "EDIT",
      }),
    canDelete: (module, options = {}) =>
      hasPermission({
        user,
        entities,
        companyId: options.companyId || selectedCompany?._id,
        module,
        entityId: options.entityId,
        action: "DELETE",
      }),
  };
};
