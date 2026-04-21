import { apiRequest } from './client';
import { unwrapList } from '../lib/api-unwrap';

export interface ProjectOwner {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

export interface ProjectResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  projectType: 'scrum' | 'kanban';
  ownerId: string;
  status: 'active' | 'archived' | 'paused';
  sprintDurationWeeks?: number;
  incompleteTasksAction?: 'backlog' | 'next_sprint';
  createdAt: string;
  owner?: ProjectOwner;
}

export function getProjects() {
  return apiRequest<ProjectResponse[]>('/projects').then((result) =>
    unwrapList<ProjectResponse>(result, ['projects'])
  );
}

export function getProject(projectId: string) {
  return apiRequest<ProjectResponse>(`/projects/${projectId}`);
}

export interface CreateProjectData {
  name: string;
  description?: string;
  projectType: 'scrum' | 'kanban';
  ownerId: string;
}

export function createProject(data: CreateProjectData) {
  return apiRequest<ProjectResponse>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProject(projectId: string, data: Partial<{
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'paused';
  ownerId: string;
  sprintDurationWeeks: number;
  incompleteTasksAction: 'backlog' | 'next_sprint';
}>) {
  return apiRequest<ProjectResponse>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProject(projectId: string) {
  return apiRequest<null>(`/projects/${projectId}?confirm=true`, {
    method: 'DELETE',
  });
}

// ── Project Members ─────────────────────────────────────────

export interface ProjectMemberRoleRef {
  id: string;
  name: string;
}

export interface ProjectMemberResponse {
  id: string;
  projectId: string;
  userId: string;
  /** С 2026-04 бэкенд возвращает массив {id, name}. Запросы (addProjectMember, updateMemberRoles) по-прежнему принимают массив id. */
  roles: ProjectMemberRoleRef[];
}

export function getProjectMembers(projectId: string) {
  return apiRequest<ProjectMemberResponse[]>(`/projects/${projectId}/members`);
}

export function addProjectMember(projectId: string, data: {
  userId: string;
  roles?: string[];
}) {
  return apiRequest<ProjectMemberResponse>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMemberRoles(projectId: string, memberId: string, roles: string[]) {
  return apiRequest<null>(`/projects/${projectId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  });
}

export function removeMember(projectId: string, memberId: string) {
  return apiRequest<null>(`/projects/${projectId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

// ── Project Permissions ────────────────────────────────────

export interface ProjectPermission {
  area: string;
  access: 'full' | 'view' | 'none';
}

// BACKEND TODO:
// GET /projects/{projectId}/my-permissions — возвращает эффективные права текущего пользователя.
// Логика:
//   system.projects.manage = full → все 7 areas = full
//   system.projects.manage = view → все 7 areas = view
//   system.projects.manage = none → берём из проектной роли пользователя
//
// 7 проектных permission areas (добавить в GET /permissions, scope="project"):
//   project.boards    — Управление досками (availableFor: scrum, kanban)
//   project.tasks     — Управление задачами (availableFor: scrum, kanban)
//   project.sprints   — Управление спринтами (availableFor: scrum)
//   project.settings  — Настройки проекта (availableFor: scrum, kanban)
//   project.members   — Управление участниками (availableFor: scrum, kanban)
//   project.roles     — Управление ролями проекта (availableFor: scrum, kanban)
//   project.analytics — Аналитика и прогнозирование (availableFor: scrum, kanban)
//
// Формат ответа: { permissions: [{ area: "project.boards", access: "full" }, ...] }

export function getMyProjectPermissions(projectId: string) {
  return apiRequest<ProjectPermission[]>(`/projects/${projectId}/my-permissions`).then(result =>
    unwrapList<ProjectPermission>(result, ['permissions'])
  );
}
