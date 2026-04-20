// import { API } from "../../apis/api";

// export const getNotificationsApi = async ({ params = {}, companyId } = {}) => {
//   const { data } = await API.get("/notifications", {
//     params: { ...params, companyId },
//   });
//   return data;
// };

// export const markNotificationReadApi = async (notificationId, companyId) => {
//   const { data } = await API.patch(`/notifications/${notificationId}/read`, {
//     companyId,
//   });
//   return data;
// };

// export const markAllNotificationsReadApi = async (companyId) => {
//   const { data } = await API.patch("/notifications/read-all", { companyId });
//   return data;
// };

// export const getNotificationSocketTokenApi = async () => {
//   const { data } = await API.get("/notifications/socket-token");
//   return data;
// };
const ENABLE_NOTIFICATIONS_API = false;
export const getNotificationsApi = async ({ params = {}, companyId } = {}) => {
  if (!ENABLE_NOTIFICATIONS_API) {
    return { data: [] }; // mock response
  }

  const { data } = await API.get("/notifications", {
    params: { ...params, companyId },
  });
  return data;
};

export const markNotificationReadApi = async (notificationId, companyId) => {
  if (!ENABLE_NOTIFICATIONS_API) {
    return { success: true };
  }

  const { data } = await API.patch(`/notifications/${notificationId}/read`, {
    companyId,
  });
  return data;
};

export const markAllNotificationsReadApi = async (companyId) => {
  if (!ENABLE_NOTIFICATIONS_API) {
    return { success: true };
  }

  const { data } = await API.patch("/notifications/read-all", { companyId });
  return data;
};

export const getNotificationSocketTokenApi = async () => {
  if (!ENABLE_NOTIFICATIONS_API) {
    return { token: null };
  }

  const { data } = await API.get("/notifications/socket-token");
  return data;
};