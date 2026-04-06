import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "./notification.slice.jsx";
import NotificationItem from "./NotificationItem";

const resolveNotificationUrl = (notification) =>
  notification.actionUrl || "/invoice-data/viewall-invoices";

export default function NotificationBell({
  collapsed = false,
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
  align = "right",
  isLink = false,
}) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [removedPreviewIds, setRemovedPreviewIds] = useState([]);
  const {
    unreadCount,
    recentNotifications,
    markAsRead,
    refreshNotifications,
  } = useNotifications();

  useEffect(() => {
    refreshNotifications({ silent: true });
  }, [refreshNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    setOpen(false);
    navigate(resolveNotificationUrl(notification));
  };

  const visibleNotifications = recentNotifications.filter(
    (notification) => !removedPreviewIds.includes(notification._id),
  );

  const Comp = isLink ? Link : "button";
  const linkProps = isLink ? { to: "/notifications" } : { type: "button" };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Comp
        {...linkProps}
        onClick={() => {
          if (isLink) {
            setOpen(false);
            return;
          }
          setOpen((prev) => {
            const nextOpen = !prev;
            if (nextOpen) {
              setRemovedPreviewIds([]);
            }
            return nextOpen;
          });
        }}
        className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 ${
          buttonClassName || "w-full text-slate-600 hover:bg-slate-50 hover:text-blue-600"
        } ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="relative">
          <Bell className={`h-5 w-5 transition-transform duration-300 ${open ? "scale-110 text-blue-600" : ""}`} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.5)] ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        {!collapsed && <span className="text-sm font-bold tracking-tight">Notifications</span>}
      </Comp>

      {open && (
        <div
          className={`absolute z-50 mt-3 w-[380px] origin-top rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-300 ${
            collapsed
              ? "left-14 bottom-0"
              : align === "left"
                ? "left-0 top-full"
                : "right-0 top-full"
          } ${dropdownClassName}`}
        >
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Activity</h3>
              <p className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                {unreadCount} NEW
              </p>
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-blue-600 transition-colors"
            >
              View all
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {visibleNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quiet for now</p>
                <p className="mt-1 text-[11px] text-slate-400">We'll notify you when something happens.</p>
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <div key={notification._id} className="relative group/item">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemovedPreviewIds((prev) => [...prev, notification._id]);
                    }}
                    className="absolute right-3 top-3 z-20 rounded-lg p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover/item:opacity-100"
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <NotificationItem
                    notification={notification}
                    compact
                    onClick={handleNotificationClick}
                    onMarkRead={(item) => markAsRead(item._id)}
                  />
                </div>
              ))
            )}
          </div>
          
          {visibleNotifications.length > 0 && (
             <div className="mt-4 pt-4 border-t border-slate-50">
               <button 
                  onClick={() => navigate("/notifications")}
                  className="w-full py-2.5 rounded-xl bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all"
               >
                 View Activity History
               </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
