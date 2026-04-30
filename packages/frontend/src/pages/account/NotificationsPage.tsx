import { Container } from '@/components/layout/Container';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, hasMore, loadMore, readNotification, readAll } =
    useNotifications(20);

  return (
    <Container className="pt-24 pb-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold text-ink">Notifications</h1>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={readAll}>
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 && !loading ? (
          <div className="rounded-default border border-linen bg-white px-6 py-12 text-center">
            <p className="font-sans text-sm text-stone">You have no notifications yet.</p>
            <p className="mt-1 font-sans text-xs text-stone">
              New notifications will appear here when your orders are updated.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-default border border-linen bg-white px-5 py-4 transition-opacity ${
                  notif.readAt ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => {
                      if (!notif.readAt) readNotification(notif.id);
                      if (notif.link) window.location.href = notif.link;
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="font-sans text-sm font-semibold text-ink">{notif.titleEn}</p>
                    <p className="mt-0.5 font-sans text-sm text-charcoal">{notif.bodyEn}</p>
                    <p className="mt-1 font-sans text-xs text-stone">
                      {relativeTime(notif.createdAt)}
                    </p>
                  </button>
                  {!notif.readAt && (
                    <button
                      onClick={() => readNotification(notif.id)}
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                      aria-label="Mark as read"
                    />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="py-4 text-center font-sans text-sm text-stone">Loading...</div>
            )}

            {hasMore && !loading && (
              <div className="pt-2 text-center">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
