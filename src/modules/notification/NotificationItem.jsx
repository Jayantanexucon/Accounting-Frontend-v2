import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Bell, CheckCircle2, FileEdit, FilePlus2, FileX2,
  ShieldAlert, ShieldCheck, ShieldX, ChevronLeft, ChevronRight,
} from "lucide-react";

dayjs.extend(relativeTime);

const ICON_BY_TYPE = {
  CREATE:           FilePlus2,
  APPROVAL_REQUEST: ShieldAlert,
  APPROVED:         ShieldCheck,
  REJECTED:         ShieldX,
  UPDATED:          FileEdit,
  DELETED:          FileX2,
};

const GRADIENT_BY_TYPE = {
  CREATE:           "linear-gradient(135deg,#1e40af,#3b82f6)",
  APPROVAL_REQUEST: "linear-gradient(135deg,#b45309,#f59e0b)",
  APPROVED:         "linear-gradient(135deg,#065f46,#10b981)",
  REJECTED:         "linear-gradient(135deg,#9f1239,#f43f5e)",
  UPDATED:          "linear-gradient(135deg,#3730a3,#6366f1)",
  DELETED:          "linear-gradient(135deg,#991b1b,#ef4444)",
};

const LIGHT_BG_BY_TYPE = {
  CREATE:           "bg-blue-50/50 border-blue-100",
  APPROVAL_REQUEST: "bg-amber-50/50 border-amber-100",
  APPROVED:         "bg-emerald-50/50 border-emerald-100",
  REJECTED:         "bg-rose-50/50 border-rose-100",
  UPDATED:          "bg-indigo-50/50 border-indigo-100",
  DELETED:          "bg-red-50/50 border-red-100",
};

/* ── Single notification card ─────────────────────────── */
export default function NotificationItem({ notification, onClick, onMarkRead, compact = false }) {
  const Icon     = ICON_BY_TYPE[notification.type] || Bell;
  const gradient = GRADIENT_BY_TYPE[notification.type] || "linear-gradient(135deg,#475569,#94a3b8)";
  const lightBg  = LIGHT_BG_BY_TYPE[notification.type] || "bg-slate-50/50 border-slate-100";

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 ${
        notification.isRead
          ? "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
          : `${lightBg} shadow-sm border-blue-200`
      }`}
    >
      <button
        type="button"
        onClick={() => onClick(notification)}
        className="w-full text-left p-4 flex items-start gap-4"
      >
        <div
          className="mt-0.5 rounded-xl p-2.5 shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300"
          style={{ background: gradient }}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-bold tracking-tight mb-0.5 ${notification.isRead ? "text-slate-900" : "text-blue-900"}`}>
                {notification.title}
              </p>
              <p className={`text-[13px] leading-relaxed ${notification.isRead ? "text-slate-500" : "text-blue-700/80"} ${compact ? "line-clamp-2" : ""}`}>
                {notification.message}
              </p>
            </div>

            {!notification.isRead && (
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
            )}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                {notification.sender?.name || "System"}
              </span>
              <span>•</span>
              <span>{dayjs(notification.createdAt).fromNow()}</span>
            </div>

            {!notification.isRead && onMarkRead && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMarkRead(notification); }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all"
              >
                <CheckCircle2 className="h-3 w-3" />
                Mark read
              </button>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

/* ── Notification list with pagination ────────────────── */
export function NotificationList({
  notifications = [],
  onClick,
  onMarkRead,
  compact = false,
  pageSize = 5,
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(notifications.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paged      = notifications.slice((safePage - 1) * pageSize, safePage * pageSize);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="p-4 rounded-2xl bg-slate-100">
          <Bell size={24} className="text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-500">No notifications</p>
        <p className="text-xs text-slate-400">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Items */}
      {paged.map((n) => (
        <NotificationItem
          key={n._id || n.id}
          notification={n}
          onClick={onClick}
          onMarkRead={onMarkRead}
          compact={compact}
        />
      ))}

      {/* Pagination bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          {/* Count */}
          <p className="text-[10px] text-slate-400 font-medium">
            Showing{" "}
            <span className="font-bold text-slate-600">{(safePage - 1) * pageSize + 1}</span>
            {" – "}
            <span className="font-bold text-slate-600">{Math.min(safePage * pageSize, notifications.length)}</span>
            {" of "}
            <span className="font-bold text-slate-600">{notifications.length}</span>
            {unreadCount > 0 && (
              <span className="ml-2 text-blue-500">· {unreadCount} unread</span>
            )}
          </p>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="px-1 text-[11px] text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="min-w-[28px] h-[28px] rounded-lg text-[11px] font-bold transition-all border"
                    style={
                      safePage === p
                        ? { background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "white", borderColor: "#2563eb" }
                        : { background: "white", color: "#475569", borderColor: "#e2e8f0" }
                    }
                  >
                    {p}
                  </button>
                )
              )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}