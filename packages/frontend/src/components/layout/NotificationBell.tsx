import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from '@/lib/toast';

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, readNotification, readAll, refetch } = useNotifications(5);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleItemClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.readAt) {
      try {
        await readNotification(notif.id);
      } catch (err) {
        if (!(err instanceof Error) || err.message !== 'MARK_READ_FAILED') {
          toast.error('Something went wrong');
        }
        return;
      }
    }
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) refetch();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-pearl hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-ivory">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] rounded-default border border-linen bg-white shadow-floating">
          <div className="flex items-center justify-between border-b border-linen px-4 py-3">
            <span className="font-sans text-sm font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={readAll}
                className="font-sans text-xs font-medium text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center font-sans text-sm text-stone">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex w-full flex-col gap-0.5 border-b border-linen px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-pearl ${
                    notif.readAt ? 'opacity-60' : ''
                  }`}
                >
                  <span className="font-sans text-xs font-semibold text-ink">{notif.titleEn}</span>
                  <span className="line-clamp-2 font-sans text-xs text-charcoal">
                    {notif.bodyEn}
                  </span>
                  <span className="font-sans text-[10px] text-stone">
                    {relativeTime(notif.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-linen px-4 py-2">
            <Link
              to="/account/notifications"
              onClick={() => setOpen(false)}
              className="block text-center font-sans text-xs font-medium text-brand hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
