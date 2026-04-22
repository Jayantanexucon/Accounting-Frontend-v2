import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { getNotificationSocketTokenApi } from "../modules/notification/notification.api";
import { SocketContext } from "./SocketContextValue";

const resolveSocketUrl = () => {
  const baseUrl =
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "";

  return baseUrl.replace(/\/api\/?$/, "");
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?._id) {
      return undefined;
    }

    let active = true;
    let socketInstance = null;

    const connectSocket = async () => {
      try {
        const response = await getNotificationSocketTokenApi();
        if (!active) {
          return;
        }

        // Debug logging
        console.log("📊 Socket token response:", { 
          hasData: !!response?.data, 
          token: response?.data?.token ? "present" : "null" 
        });

        socketInstance = io(resolveSocketUrl(), {
          transports: ["websocket"],
          autoConnect: true,
          auth: {
            token: response.data?.token,
          },
        });

        socketInstance.on("connect", () => {
          if (active) {
            console.log("✅ Socket connected successfully");
            setIsConnected(true);
          }
        });

        socketInstance.on("disconnect", () => {
          if (active) {
            console.log("❌ Socket disconnected");
            setIsConnected(false);
          }
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error(
          "❌ Socket connection failed:",
          {
            message: error?.response?.data?.message || error?.message || error,
            responseStatus: error?.response?.status,
            hasData: !!error?.response?.data,
          }
        );
        setSocket(null);
        setIsConnected(false);
      }
    };

    connectSocket();

    return () => {
      active = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?._id]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
    }),
    [socket, isConnected],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
