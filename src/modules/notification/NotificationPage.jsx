import { useNavigate } from "react-router-dom";
import { BellRing, CheckCheck } from "lucide-react";
import { useNotifications } from "./notification.slice.jsx";
import NotificationItem from "./NotificationItem";

const resolveNotificationUrl = (notification) =>
  notification.actionUrl || "/invoice-data/viewall-invoices";

export default function NotificationPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    navigate(resolveNotificationUrl(notification));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── STICKY HEADER ───────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div 
                className="p-3.5 rounded-2xl shadow-lg shrink-0"
                style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}
              >
                <BellRing size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  Notification Center
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {unreadCount} NEW
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">
                    • Activity History
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={!unreadCount}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white uppercase tracking-widest hover:bg-slate-800 transition-all hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCheck className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Mark all as read
              </button>
            </div>
          </div>
        </div>
        {/* Header Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-transparent opacity-10" />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/50 bg-white/60 px-6 py-20 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md">
            <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Refreshing Feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-3xl border border-white/50 bg-white/60 px-6 py-20 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-all">
             <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-400 shadow-inner">
                <BellRing className="h-8 w-8" />
             </div>
            <p className="text-xl font-black text-slate-900 tracking-tight">Everything caught up</p>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
              Your notification feed is empty. New alerts will appear here as they happen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Latest Updates</h3>
               <span className="text-[11px] font-medium text-slate-400 italic">Showing {notifications.length} items</span>
            </div>
            
            <div className="grid gap-4">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onClick={handleNotificationClick}
                  onMarkRead={(item) => markAsRead(item._id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
