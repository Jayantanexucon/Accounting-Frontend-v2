import { API } from "../../apis/api";

export const getNotificationsApi = async ({ params = {}, companyId } = {}) => {
  const { data } = await API.get("/notifications", {
    params: { ...params, companyId },
  });
  return data;
};

export const markNotificationReadApi = async (notificationId, companyId) => {
  const { data } = await API.patch(`/notifications/${notificationId}/read`, {
    companyId,
  });
  return data;
};

export const markAllNotificationsReadApi = async (companyId) => {
  const { data } = await API.patch("/notifications/read-all", { companyId });
  return data;
};

export const getNotificationSocketTokenApi = async () => {
  const { data } = await API.get("/notifications/socket-token");
  return data;
};
