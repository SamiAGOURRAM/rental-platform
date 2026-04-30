import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  type Notification,
} from '../api/notifications';
import { toast } from '@/lib/toast';

const POLL_INTERVAL_MS = 60000;

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  readNotification: (id: string) => Promise<void>;
  readAll: () => Promise<void>;
  refetch: () => void;
}

export function useNotifications(limit = 20): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchList = useCallback(
    async (nextCursor?: string) => {
      setLoading(true);
      try {
        const res = await getNotifications({
          cursor: nextCursor,
          limit,
        });
        if (nextCursor) {
          setNotifications((prev) => [...prev, ...res.items]);
        } else {
          setNotifications(res.items);
        }
        setCursor(res.nextCursor ?? undefined);
        setHasMore(!!res.nextCursor);
      } catch {
        toast.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail on polling errors
    }
  }, []);

  const refetch = useCallback(() => {
    fetchList(undefined);
    fetchUnreadCount();
  }, [fetchList, fetchUnreadCount]);

  const loadMore = useCallback(() => {
    if (cursor && !loading) {
      fetchList(cursor);
    }
  }, [cursor, loading, fetchList]);

  const readNotification = useCallback(async (id: string) => {
    try {
      await markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark notification as read');
      throw new Error('MARK_READ_FAILED');
    }
  }, []);

  const readAll = useCallback(async () => {
    try {
      await markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchList(undefined);
    fetchUnreadCount();
  }, [fetchList, fetchUnreadCount]);

  // Polling when tab is visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    loadMore,
    readNotification,
    readAll,
    refetch,
  };
}
