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

// ── Kanban Analytics Types ────────────────────────────────

export interface KanbanSummaryData {
  averageVelocity: number;
  averageVelocityUnit: string;
  velocityTrend: number;
  cycleTime: number;
  cycleTimeTrend: number;
  throughput: number;
  throughputTrend: number;
  wip: number;
  wipChange: number;
}

export interface KanbanSummaryResponse {
  data: KanbanSummaryData;
  interpretation: string;
}

export interface CumulativeFlowPoint {
  date: string;
  [column: string]: string | number; // dynamic columns
}

export interface CumulativeFlowResponse {
  data: CumulativeFlowPoint[];
  columns: string[];
  interpretation: string;
}

export interface CycleTimeScatterPoint {
  task: string;
  time: number;
}

export interface CycleTimeScatterResponse {
  data: CycleTimeScatterPoint[];
  interpretation: string;
}

export interface ThroughputWeek {
  week: string;
  count: number;
}

export interface ThroughputResponse {
  data: ThroughputWeek[];
  interpretation: string;
}

export interface AvgCycleTimeWeek {
  week: string;
  avg: number;
  p50: number;
  p85: number;
}

export interface AvgCycleTimeResponse {
  data: AvgCycleTimeWeek[];
  interpretation: string;
}

export interface ThroughputTrendPoint {
  week: string;
  actual: number;
  trend: number;
}

export interface ThroughputTrendResponse {
  data: ThroughputTrendPoint[];
  interpretation: string;
}

export interface WipPoint {
  date: string;
  wip: number;
  limit: number;
}

export interface WipHistoryResponse {
  data: WipPoint[];
  interpretation: string;
}

export interface DistributionBucket {
  range: string;
  count: number;
}

export interface DistributionResponse {
  data: DistributionBucket[];
  interpretation: string;
}

// ── Filter params ────────────────────────────────────────────

export interface AnalyticsFilters {
  boardId?: string;
  filters?: Record<string, string[]>;
}

function appendFilterParams(qs: URLSearchParams, params?: AnalyticsFilters) {
  if (!params) return;
  if (params.boardId) qs.set('board_id', params.boardId);
  if (params.filters) {
    for (const [fieldId, values] of Object.entries(params.filters)) {
      if (values.length > 0) qs.set(`filter_${fieldId}`, values.join(','));
    }
  }
}

// ── API calls ──────────────────────────────────────────────

/**
 * Get velocity chart data.
 * metricType: 'story_points' | 'task_count' | 'estimation_hours'
 * limit: number of last sprints (0 = all)
 */
export function getVelocityChart(projectId: string, metricType: string = 'task_count', limit: number = 0, analyticsFilters?: AnalyticsFilters) {
  const qs = new URLSearchParams({ metric_type: metricType });
  if (limit > 0) qs.set('limit', String(limit));
  appendFilterParams(qs, analyticsFilters);
  return apiRequest<VelocityResponse>(`/projects/${projectId}/analytics/velocity?${qs}`);
}

/**
 * Get burndown chart data for a specific sprint.
 * metricType: 'story_points' | 'task_count' | 'estimation_hours'
 * sprintId: specific sprint (omit for active sprint)
 */
export function getBurndownChart(projectId: string, metricType: string = 'task_count', sprintId?: string, analyticsFilters?: AnalyticsFilters) {
  const qs = new URLSearchParams({ metric_type: metricType });
  if (sprintId) qs.set('sprint_id', sprintId);
  appendFilterParams(qs, analyticsFilters);
  return apiRequest<BurndownResponse>(`/projects/${projectId}/analytics/burndown?${qs}`);
}

// ── Kanban Analytics ─────────────────────────────────────

function kanbanQs(params?: AnalyticsFilters) {
  const qs = new URLSearchParams();
  appendFilterParams(qs, params);
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function getKanbanSummary(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<KanbanSummaryResponse>(`/projects/${projectId}/analytics/kanban/summary${kanbanQs(params)}`);
}

export function getCumulativeFlow(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<CumulativeFlowResponse>(`/projects/${projectId}/analytics/kanban/cumulative-flow${kanbanQs(params)}`);
}

export function getCycleTimeScatter(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<CycleTimeScatterResponse>(`/projects/${projectId}/analytics/kanban/cycle-time-scatter${kanbanQs(params)}`);
}

export function getThroughput(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<ThroughputResponse>(`/projects/${projectId}/analytics/kanban/throughput${kanbanQs(params)}`);
}

export function getAvgCycleTime(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<AvgCycleTimeResponse>(`/projects/${projectId}/analytics/kanban/avg-cycle-time${kanbanQs(params)}`);
}

export function getThroughputTrend(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<ThroughputTrendResponse>(`/projects/${projectId}/analytics/kanban/throughput-trend${kanbanQs(params)}`);
}

export function getWipHistory(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<WipHistoryResponse>(`/projects/${projectId}/analytics/kanban/wip${kanbanQs(params)}`);
}

export function getCycleTimeDistribution(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<DistributionResponse>(`/projects/${projectId}/analytics/kanban/cycle-time-distribution${kanbanQs(params)}`);
}

export function getThroughputDistribution(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<DistributionResponse>(`/projects/${projectId}/analytics/kanban/throughput-distribution${kanbanQs(params)}`);
}
