import { authorizedFetch } from '@/lib/api';

export async function markNotificationRead(notificationId: string): Promise<void> {
  const response = await authorizedFetch(`/v1/notifications/${notificationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ read: true }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'update failed' }));
    throw new Error(payload.error ?? 'update failed');
  }
}

export async function markAllNotificationsRead(orgSlug: string): Promise<void> {
  const response = await authorizedFetch('/v1/notifications/mark-all', {
    method: 'POST',
    body: JSON.stringify({ orgSlug }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'mark all failed' }));
    throw new Error(payload.error ?? 'mark all failed');
  }
}
