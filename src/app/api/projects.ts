import { apiRequest } from './client';

export interface ProjectResponse {
  id: string;
  key: string;
  name: string;
  description: string;
  projectType: 'scrum' | 'kanban';
  ownerId: string;
  status: 'active' | 'archived' | 'paused';
  createdAt: string;
}

export function getProjects() {
  return apiRequest<ProjectResponse[]>('/projects').then((result) => {
    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && 'projects' in result) {
      const arr = (result as unknown as { projects: ProjectResponse[] }).projects;
      if (Array.isArray(arr)) return arr;
    }
    return [];
  });
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
  description: string;
  status: 'active' | 'archived' | 'paused';
}>) {
  return apiRequest<ProjectResponse>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProject(projectId: string) {
  return apiRequest<null>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}

// ── Project Members ─────────────────────────────────────────

export interface ProjectMemberResponse {
  id: string;
  projectId: string;
  userId: string;
  roles: string[];
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
