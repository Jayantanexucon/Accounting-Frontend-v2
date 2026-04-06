export const isAdmin = (user) =>
  user?.role === "admin" || user?.role === "superAdmin";

export const isSuperAdmin = (user) =>
  user?.role === "superAdmin";