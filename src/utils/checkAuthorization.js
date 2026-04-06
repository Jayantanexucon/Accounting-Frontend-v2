export const checkAuthorization = (user, key, action) => {
  try {
    if (!user) return false;

    // ✅ SUPER ADMIN BYPASS
    if (user.role === "superAdmin" ) {
      return true;
    }
    const company = JSON.parse(localStorage.getItem("selectedCompany"));
    // console.log("check authorization",user,company,key,action);
    const companyId = company?._id;
    const permissions = user?.permissions;
    const allowed = permissions.filter((p) => p.entity?.key === key && p.actions?.includes(action) && p.company?._id === companyId);
    // console.log("check authorization", allowed);
    if (allowed && allowed?.length > 0) {
      return true;
    }
    return false;
  } catch (error) {
    // console.log(error);
  }
};
