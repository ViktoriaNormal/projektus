import { apiRequest } from './client';

export interface ProjectResponse {
  id: string;
  key: string;
  name: string;
  description: string;
  project_type: 'scrum' | 'kanban';
  owner_id: string;
  status: 'active' | 'archived' | 'paused';
  created_at: string;
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
  project_type: 'scrum' | 'kanban';
  owner_id: string;
}

export function createProject(data: CreateProjectData) {
  return apiRequest<ProjectResponse>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
