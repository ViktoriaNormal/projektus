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

export interface ThroughputPoint {
  week: string;
  actual: number;
  trend: number;
}

export interface ThroughputResponse {
  data: ThroughputPoint[];
  interpretation: string;
}

export interface WipAgePoint {
  taskKey: string;
  ageDays: number;
  columnName: string;
}

export interface WipAgeResponse {
  data: WipAgePoint[];
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

// ── Monte Carlo Forecast Types ───────────────────────────────

export interface MonteCarloPercentile {
  percentile: number;  // e.g. 50, 75, 85, 90, 95
  date: string;        // ISO date, e.g. "2026-03-19"
}

export interface MonteCarloChartPoint {
  date: string;        // formatted date for chart X axis, e.g. "19.03"
  probability: number; // 0-100
}

export interface MonteCarloResponse {
  percentiles: MonteCarloPercentile[];
  chart: MonteCarloChartPoint[];
  targetDateProbability?: number; // probability (0-100) of completing by target date, if target date was provided
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

export function getCumulativeFlow(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<CumulativeFlowResponse>(`/projects/${projectId}/analytics/kanban/cumulative-flow${kanbanQs(params)}`);
}

export function getCycleTimeScatter(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<CycleTimeScatterResponse>(`/projects/${projectId}/analytics/kanban/cycle-time-scatter${kanbanQs(params)}`);
}

export function getThroughput(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<ThroughputResponse>(`/projects/${projectId}/analytics/kanban/throughput${kanbanQs(params)}`);
}

export function getWipAge(projectId: string, params?: AnalyticsFilters) {
  return apiRequest<WipAgeResponse>(`/projects/${projectId}/analytics/kanban/wip-age${kanbanQs(params)}`);
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

// ── Monte Carlo Forecast ────────────────────────────────────

export function getMonteCarloForecast(projectId: string, taskCount: number, targetDate?: string, weeks?: number, params?: AnalyticsFilters) {
  const qs = new URLSearchParams({ task_count: String(taskCount) });
  if (targetDate) qs.set('target_date', targetDate);
  if (weeks && weeks !== 12) qs.set('weeks', String(weeks));
  appendFilterParams(qs, params);
  return apiRequest<MonteCarloResponse>(`/projects/${projectId}/analytics/kanban/monte-carlo?${qs}`);
}
