import { apiRequest } from './client';
import { unwrapList } from '../lib/api-unwrap';

// ── Types ────────────────────────────────────────────────────

export interface NotificationResponse {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string | null;
  taskKey?: string | null;
  meetingId?: string | null;
  meetingName?: string | null;
  meetingStartTime?: string | null; // ISO datetime
  participantStatus?: 'pending' | 'accepted' | 'declined' | null;
}

export interface NotificationSettingResponse {
  eventType: string;
  enabled: boolean;
  deadlineValue?: number;
  deadlineUnit?: string;
}

// ── API calls ────────────────────────────────────────────────

export function getNotifications() {
  return apiRequest<NotificationResponse[]>('/notifications').then(result =>
    unwrapList<NotificationResponse>(result, ['notifications'])
  );
}

export function markAsRead(notificationId: string) {
  return apiRequest<void>(`/notifications/${notificationId}/read`, { method: 'POST' });
}

export function markAllAsRead() {
  return apiRequest<void>('/notifications/read-all', { method: 'POST' });
}

// BACKEND TODO: POST /notifications/delete-all — удаляет все уведомления текущего пользователя. Ответ 204.
// Также для meeting_invite уведомлений бэкенд должен возвращать поле participant_status
// со значением 'pending' | 'accepted' | 'declined' — текущий статус участия пользователя во встрече.
export function deleteAllNotifications() {
  return apiRequest<void>('/notifications/delete-all', { method: 'POST' });
}

export function getNotificationSettings() {
  return apiRequest<NotificationSettingResponse[]>('/notifications/settings').then(result =>
    unwrapList<NotificationSettingResponse>(result, ['settings'])
  );
}

export function updateNotificationSettings(settings: NotificationSettingResponse[]) {
  return apiRequest<NotificationSettingResponse[]>('/notifications/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
