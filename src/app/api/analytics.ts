import { apiRequest } from './client';

// ── Scrum Analytics Types ──────────────────────────────────

export interface VelocityPoint {
  sprint: string;
  sprintId: string;
  planned: number;
  completed: number;
}

export interface BurndownPoint {
  day: string;
  remaining: number;
  ideal: number;
}

export interface ScrumMetrics {
  averageVelocity: number;
  velocityTrend: number; // % change
  completionRate: number; // % of planned work completed
  averageSprintScope: number;
  sprintCount: number;
}

export interface VelocityResponse {
  data: VelocityPoint[];
  metrics: ScrumMetrics;
  interpretation: string;
}

export interface BurndownResponse {
  data: BurndownPoint[];
  sprintName: string;
  interpretation: string;
}

// ── API calls ──────────────────────────────────────────────

/**
 * Get velocity chart data.
 * metricType: 'story_points' | 'task_count' | 'estimation_hours'
 * limit: number of last sprints (0 = all)
 */
export function getVelocityChart(projectId: string, metricType: string = 'task_count', limit: number = 0) {
  const qs = new URLSearchParams({ metricType });
  if (limit > 0) qs.set('limit', String(limit));
  return apiRequest<VelocityResponse>(`/projects/${projectId}/analytics/velocity?${qs}`);
}

/**
 * Get burndown chart data for a specific sprint.
 * metricType: 'story_points' | 'task_count' | 'estimation_hours'
 * sprintId: specific sprint (omit for active sprint)
 */
export function getBurndownChart(projectId: string, metricType: string = 'task_count', sprintId?: string) {
  const qs = new URLSearchParams({ metricType });
  if (sprintId) qs.set('sprintId', sprintId);
  return apiRequest<BurndownResponse>(`/projects/${projectId}/analytics/burndown?${qs}`);
}
