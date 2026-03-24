import { apiRequest } from './client';

export type MeetingStatus = 'active' | 'cancelled';

export interface MeetingResponse {
  id: string;
  projectId: string | null;
  organizerId: string | null;
  name: string;
  description: string | null;
  meetingType: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: MeetingStatus;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface MeetingDetailsResponse extends MeetingResponse {
  participants: MeetingParticipant[];
}

export interface CreateMeetingData {
  name: string;
  startTime: string;
  endTime: string;
  projectId?: string | null;
  description?: string | null;
  meetingType?: string | null;
  location?: string | null;
  participantIds?: string[];
}

export interface UpdateMeetingData {
  name?: string;
  description?: string | null;
  meetingType?: string | null;
  startTime?: string;
  endTime?: string;
  location?: string | null;
}

export function getMeetings(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiRequest<MeetingResponse[]>(`/meetings${qs ? `?${qs}` : ''}`);
}

export function getMeeting(meetingId: string) {
  return apiRequest<MeetingDetailsResponse>(`/meetings/${meetingId}`);
}

export function createMeeting(data: CreateMeetingData) {
  return apiRequest<MeetingDetailsResponse>('/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMeeting(meetingId: string, data: UpdateMeetingData) {
  return apiRequest<MeetingDetailsResponse>(`/meetings/${meetingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function cancelMeeting(meetingId: string) {
  return apiRequest<MeetingResponse>(`/meetings/${meetingId}/cancel`, {
    method: 'POST',
  });
}

export function addParticipants(meetingId: string, participantIds: string[]) {
  return apiRequest<MeetingParticipant[]>(`/meetings/${meetingId}/participants`, {
    method: 'POST',
    body: JSON.stringify({ participantIds }),
  });
}

export function getParticipants(meetingId: string) {
  return apiRequest<MeetingParticipant[]>(`/meetings/${meetingId}/participants`);
}

export function respondToMeeting(meetingId: string, status: 'accepted' | 'declined') {
  return apiRequest<void>(`/meetings/${meetingId}/response`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
