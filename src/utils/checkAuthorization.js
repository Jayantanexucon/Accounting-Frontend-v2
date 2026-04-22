import { getStoredEntities, getStoredSelectedCompany, hasPermission } from "./permissionUtils";

export const checkAuthorization = (user, key, action) => {
  try {
    return hasPermission({
      user,
      module: key,
      action,
      companyId: getStoredSelectedCompany()?._id,
      entities: getStoredEntities(),
    });
  } catch (error) {
    return false;
  }
};
