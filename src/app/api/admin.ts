import { apiRequest } from './client';
import type { PasswordPolicy } from './auth';

// ── Permission Catalog ──────────────────────────────────────

export interface PermissionDescriptor {
  key: string;
  description: string;
}

export function getPermissionsCatalog() {
  return apiRequest<PermissionDescriptor[]>('/permissions');
}

// ── Password Policy ──────────────────────────────────────────

export interface AdminPasswordPolicy extends PasswordPolicy {
  updatedAt?: string;
  updatedBy?: string;
}

// ── System Roles ─────────────────────────────────────────────

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export function getSystemRoles() {
  return apiRequest<SystemRole[]>('/admin/roles');
}

export function getSystemRole(roleId: string) {
  return apiRequest<SystemRole>(`/admin/roles/${roleId}`);
}

export function createSystemRole(data: { name: string; description: string; permissions: string[] }) {
  return apiRequest<SystemRole>('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSystemRole(roleId: string, data: { name: string; description: string; permissions: string[] }) {
  return apiRequest<SystemRole>(`/admin/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteSystemRole(roleId: string) {
  return apiRequest<null>(`/admin/roles/${roleId}`, {
    method: 'DELETE',
  });
}

// ── Admin Users ─────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  is_active: boolean;
  roles: { id: string; name: string }[];
  created_at: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  full_name: string;
  position: string;
  password: string;
  is_active: boolean;
  role_ids: string[];
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  full_name?: string;
  position?: string;
  is_active?: boolean;
  role_ids?: string[];
}

export interface AdminUsersResponse {
  total: number;
  users: AdminUser[];
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await apiRequest<AdminUsersResponse>('/admin/users');
  return data.users;
}

export function getAdminUser(userId: string) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`);
}

export function createAdminUser(data: CreateUserPayload) {
  return apiRequest<AdminUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAdminUser(userId: string, data: UpdateUserPayload) {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteAdminUser(userId: string) {
  return apiRequest<null>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

// ── Password Policy ──────────────────────────────────────────

export function getAdminPasswordPolicy() {
  return apiRequest<AdminPasswordPolicy>('/admin/password-policy');
}

export function updateAdminPasswordPolicy(data: Partial<PasswordPolicy>) {
  return apiRequest<AdminPasswordPolicy>('/admin/password-policy', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Project Templates — Types ────────────────────────────────

export interface TemplateReferences {
  columnSystemTypes: { key: string; name: string; description: string; order: number }[];
  taskStatusTypes: { key: string; name: string; description: string; isColumnType: boolean }[];
  fieldTypes: { key: string; name: string }[];
  estimationUnits: { key: string; name: string; availableFor: string[] }[];
  swimlaneGroupOptions: { key: string; name: string; availableFor: string[] }[];
  swimlaneGroupableFieldTypes: string[];
  priorityTypeOptions: { key: string; name: string; availableFor: string[]; defaultValues: string[] }[];
  systemTaskFields: { key: string; name: string; fieldType: string; availableFor: string[]; description?: string }[];
}

export interface TemplateBoardColumn {
  id: string;
  name: string;
  systemType: string;
  wipLimit: number | null;
  order: number;
  isLocked: boolean;
  note: string | null;
}

export interface TemplateBoardSwimlane {
  id: string;
  name: string;
  wipLimit: number | null;
  order: number;
  note: string | null;
}

export interface TemplateBoardPriorityValue {
  id: string;
  value: string;
  order: number;
}

export interface TemplateBoardCustomField {
  id: string;
  name: string;
  fieldType: string;
  isSystem: boolean;
  isRequired: boolean;
  order: number;
  options: string[] | null;
}

export interface TemplateBoard {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  order: number;
  priorityType: string;
  estimationUnit: string;
  swimlaneGroupBy: string | null;
  columns: TemplateBoardColumn[];
  swimlanes: TemplateBoardSwimlane[];
  priorityValues: TemplateBoardPriorityValue[];
  customFields: TemplateBoardCustomField[];
}

export interface ProjectTemplateListItem {
  id: string;
  name: string;
  description: string;
  projectType: string;
  boardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplateDetail {
  id: string;
  name: string;
  description: string;
  projectType: string;
  createdAt: string;
  updatedAt: string;
  boards: TemplateBoard[];
}

// ── Project Templates — API ──────────────────────────────────

export function getTemplateReferences() {
  return apiRequest<TemplateReferences>('/admin/project-templates/references');
}

export function getProjectTemplates() {
  return apiRequest<ProjectTemplateDetail[]>('/admin/project-templates');
}

export function getProjectTemplate(templateId: string) {
  return apiRequest<ProjectTemplateDetail>(`/admin/project-templates/${templateId}`);
}

export function createProjectTemplate(data: { name: string; description?: string; projectType: string }) {
  return apiRequest<ProjectTemplateDetail>('/admin/project-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProjectTemplate(templateId: string, data: { name?: string; description?: string }) {
  return apiRequest<ProjectTemplateDetail>(`/admin/project-templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProjectTemplate(templateId: string) {
  return apiRequest<null>(`/admin/project-templates/${templateId}`, {
    method: 'DELETE',
  });
}

// ── Template Boards ──────────────────────────────────────────

export function createTemplateBoard(templateId: string, data: {
  name: string; description?: string; isDefault?: boolean;
  priorityType: string; estimationUnit: string; swimlaneGroupBy?: string | null;
}) {
  return apiRequest<TemplateBoard>(`/admin/project-templates/${templateId}/boards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTemplateBoard(templateId: string, boardId: string, data: Partial<{
  name: string; description: string; isDefault: boolean; order: number;
  priorityType: string; estimationUnit: string; swimlaneGroupBy: string | null;
}>) {
  return apiRequest<TemplateBoard>(`/admin/project-templates/${templateId}/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTemplateBoard(templateId: string, boardId: string) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}`, {
    method: 'DELETE',
  });
}

export function reorderTemplateBoards(templateId: string, orders: { boardId: string; order: number }[]) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}

// ── Template Board Columns ───────────────────────────────────

export function createTemplateBoardColumn(templateId: string, boardId: string, data: {
  name: string; systemType: string; wipLimit?: number | null; order?: number;
}) {
  return apiRequest<TemplateBoardColumn>(`/admin/project-templates/${templateId}/boards/${boardId}/columns`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTemplateBoardColumn(templateId: string, boardId: string, columnId: string, data: Partial<{
  name: string; systemType: string; wipLimit: number | null;
}>) {
  return apiRequest<TemplateBoardColumn>(`/admin/project-templates/${templateId}/boards/${boardId}/columns/${columnId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTemplateBoardColumn(templateId: string, boardId: string, columnId: string) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}/columns/${columnId}`, {
    method: 'DELETE',
  });
}

export function reorderTemplateBoardColumns(templateId: string, boardId: string, orders: { columnId: string; order: number }[]) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}/columns/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}

// ── Template Board Swimlanes ─────────────────────────────────

export function updateTemplateBoardSwimlane(templateId: string, boardId: string, swimlaneId: string, data: {
  wipLimit?: number | null;
}) {
  return apiRequest<TemplateBoardSwimlane>(`/admin/project-templates/${templateId}/boards/${boardId}/swimlanes/${swimlaneId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTemplateBoardSwimlane(templateId: string, boardId: string, swimlaneId: string) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}/swimlanes/${swimlaneId}`, {
    method: 'DELETE',
  });
}

export function reorderTemplateBoardSwimlanes(templateId: string, boardId: string, orders: { swimlaneId: string; order: number }[]) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}/swimlanes/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}

// ── Template Board Priority Values ───────────────────────────

export function replaceTemplateBoardPriorityValues(templateId: string, boardId: string, values: { value: string; order: number }[]) {
  return apiRequest<TemplateBoardPriorityValue[]>(`/admin/project-templates/${templateId}/boards/${boardId}/priority-values`, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}

// ── Template Board Custom Fields ─────────────────────────────

export function createTemplateBoardCustomField(templateId: string, boardId: string, data: {
  name: string; fieldType: string; isRequired?: boolean; order?: number; options?: string[];
}) {
  return apiRequest<TemplateBoardCustomField>(`/admin/project-templates/${templateId}/boards/${boardId}/custom-fields`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTemplateBoardCustomField(templateId: string, boardId: string, fieldId: string, data: Partial<{
  name: string; isRequired: boolean; options: string[];
}>) {
  return apiRequest<TemplateBoardCustomField>(`/admin/project-templates/${templateId}/boards/${boardId}/custom-fields/${fieldId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTemplateBoardCustomField(templateId: string, boardId: string, fieldId: string) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}/custom-fields/${fieldId}`, {
    method: 'DELETE',
  });
}

export function reorderTemplateBoardCustomFields(templateId: string, boardId: string, orders: { fieldId: string; order: number }[]) {
  return apiRequest<null>(`/admin/project-templates/${templateId}/boards/${boardId}/custom-fields/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}
