/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import {
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "./notification.api";

const NotificationContext = createContext(null);

const sortNotifications = (items) =>
  [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

const mergeNotifications = (current, incoming) => {
  const map = new Map(current.map((item) => [item._id, item]));

  incoming.forEach((item) => {
    map.set(item._id, {
      ...(map.get(item._id) || {}),
      ...item,
    });
  });

  return sortNotifications(Array.from(map.values()));
};

const resolveActiveCompanyId = (user) => {
  if (user?.company?._id) return user.company._id;
  const storedCompany = localStorage.getItem("selectedCompany");
  if (!storedCompany) return null;

  try {
    return JSON.parse(storedCompany)?._id || null;
  } catch {
    return null;
  }
};

const normalizeCompanyId = (notification) =>
  notification?.companyId?._id ||
  notification?.companyId?.toString?.() ||
  notification?.companyId ||
  null;

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const activeCompanyId = resolveActiveCompanyId(user);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const refreshNotifications = useCallback(
    async ({ silent = false, page = 1, limit = 50 } = {}) => {
      if (!user?._id || !activeCompanyId) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await getNotificationsApi({
          params: { page, limit },
          companyId: activeCompanyId,
        });
        const nextNotifications = response.data || [];
        const nextMeta = response.meta || {};

        setNotifications(sortNotifications(nextNotifications));
        setUnreadCount(nextMeta.unreadCount || 0);
        setMeta((prev) => ({
          ...prev,
          ...nextMeta,
        }));
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [user?._id, activeCompanyId],
  );

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!activeCompanyId || !user?._id) return undefined;

    const intervalId = window.setInterval(() => {
      refreshNotifications({ silent: true, page: 1, limit: 50 });
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNotifications({ silent: true, page: 1, limit: 50 });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [activeCompanyId, user?._id, refreshNotifications]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleNotification = (notification) => {
      if (normalizeCompanyId(notification)?.toString() !== activeCompanyId?.toString()) {
        return;
      }
      setNotifications((prev) => mergeNotifications(prev, [notification]));
      setUnreadCount((prev) => prev + (notification.isRead ? 0 : 1));
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, activeCompanyId]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!activeCompanyId) {
        return null;
      }

      const target = notifications.find(
        (notification) => notification._id === notificationId,
      );

      if (!target || target.isRead) {
        return target || null;
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));

      try {
        const response = await markNotificationReadApi(notificationId, activeCompanyId);
        const updated = response.data;

        setNotifications((prev) => mergeNotifications(prev, [updated]));
        return updated;
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId
              ? { ...notification, isRead: false, readAt: null }
              : notification,
          ),
        );
        setUnreadCount((prev) => prev + 1);
        throw error;
      }
    },
    [notifications, activeCompanyId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!activeCompanyId) return;
    await markAllNotificationsReadApi(activeCompanyId);
    const timestamp = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || timestamp,
      })),
    );
    setUnreadCount(0);
  }, [activeCompanyId]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      meta,
      recentNotifications: notifications.slice(0, 5),
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      unreadCount,
      loading,
      meta,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return context;
};
