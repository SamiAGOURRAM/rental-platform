import { fetchApi } from './client';

export interface Notification {
  id: string;
  type: string;
  titleEn: string;
  titleFr: string;
  titleEs: string;
  bodyEn: string;
  bodyFr: string;
  bodyEs: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
}

export interface GetNotificationsParams {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

export async function getNotifications(
  params?: GetNotificationsParams,
): Promise<{ items: Notification[]; totalCount: number; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.unreadOnly) search.set('unreadOnly', 'true');

  const path = search.toString() ? `/notifications?${search.toString()}` : '/notifications';
  return fetchApi<{ items: Notification[]; totalCount: number; nextCursor: string | null }>(path);
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetchApi<{ count: number }>('/notifications/unread-count');
  return res.count;
}

export async function markRead(id: string): Promise<Notification> {
  return fetchApi<Notification>(`/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllRead(): Promise<void> {
  await fetchApi<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
}
