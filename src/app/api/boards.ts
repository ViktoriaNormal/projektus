import { apiRequest } from './client';

// ── Response Types ──────────────────────────────────────────

export interface BoardResponse {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  order: number;
  priorityType?: string;
  estimationUnit?: string;
  swimlaneGroupBy?: string | null;
}

export interface BoardField {
  id: string;
  name: string;
  description: string | null;
  fieldType: string;
  isSystem: boolean;
  isRequired: boolean;
  order: number;
  options: string[] | null;
}

export interface ColumnResponse {
  id: string;
  boardId: string;
  name: string;
  systemType: string | null;
  wipLimit: number | null;
  order: number;
  isLocked?: boolean;
  note?: string | null;
}

export interface SwimlaneResponse {
  id: string;
  boardId: string;
  name: string;
  wipLimit: number | null;
  order: number;
  note?: string | null;
}

export interface NoteResponse {
  id: string;
  columnId: string | null;
  swimlaneId: string | null;
  content: string;
}

// ── Boards ──────────────────────────────────────────────────

export function getProjectBoards(projectId: string) {
  return apiRequest<BoardResponse[]>(`/boards?projectId=${projectId}`);
}

export function getBoard(boardId: string) {
  return apiRequest<BoardResponse>(`/boards/${boardId}`);
}

export function createBoard(data: {
  projectId: string;
  name: string;
  description?: string;
  order?: number;
}) {
  return apiRequest<BoardResponse>('/boards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBoard(boardId: string, data: Partial<{
  name: string;
  description: string;
  order: number;
  priorityType: string;
  estimationUnit: string;
  swimlaneGroupBy: string | null;
}>) {
  return apiRequest<BoardResponse>(`/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteBoard(boardId: string) {
  return apiRequest<null>(`/boards/${boardId}`, {
    method: 'DELETE',
  });
}

// ── Columns ─────────────────────────────────────────────────

export function getBoardColumns(boardId: string) {
  return apiRequest<ColumnResponse[]>(`/boards/${boardId}/columns`);
}

export function createColumn(boardId: string, data: {
  name: string;
  systemType?: string | null;
  wipLimit?: number | null;
  order?: number;
}) {
  return apiRequest<ColumnResponse>(`/boards/${boardId}/columns`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Swimlanes ───────────────────────────────────────────────

export function getBoardSwimlanes(boardId: string) {
  return apiRequest<SwimlaneResponse[]>(`/boards/${boardId}/swimlanes`);
}

export function createSwimlane(boardId: string, data: {
  name: string;
  wipLimit?: number | null;
  order?: number;
}) {
  return apiRequest<SwimlaneResponse>(`/boards/${boardId}/swimlanes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function configureSwimlanes(boardId: string, data: {
  sourceType: 'class_of_service' | 'custom_field';
  customFieldId?: string | null;
  valueMappings?: Record<string, string>;
}) {
  return apiRequest<null>(`/boards/${boardId}/swimlanes/configure`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Notes ───────────────────────────────────────────────────

export function getBoardNotes(boardId: string) {
  return apiRequest<NoteResponse[]>(`/boards/${boardId}/notes`);
}

export function createColumnNote(columnId: string, content: string) {
  return apiRequest<NoteResponse>(`/boards/columns/${columnId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function createSwimlaneNote(swimlaneId: string, content: string) {
  return apiRequest<NoteResponse>(`/boards/swimlanes/${swimlaneId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// ── Column CRUD (update/delete/reorder — missing in current API) ─

export function updateColumn(boardId: string, columnId: string, data: Partial<{
  name: string;
  systemType: string;
  wipLimit: number | null;
}>) {
  return apiRequest<ColumnResponse>(`/boards/${boardId}/columns/${columnId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteColumn(boardId: string, columnId: string) {
  return apiRequest<null>(`/boards/${boardId}/columns/${columnId}`, {
    method: 'DELETE',
  });
}

export function reorderColumns(boardId: string, orders: { columnId: string; order: number }[]) {
  return apiRequest<null>(`/boards/${boardId}/columns/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}

// ── Swimlane CRUD (update/delete/reorder — missing in current API)

export function updateSwimlane(boardId: string, swimlaneId: string, data: Partial<{
  name: string;
  wipLimit: number | null;
}>) {
  return apiRequest<SwimlaneResponse>(`/boards/${boardId}/swimlanes/${swimlaneId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSwimlane(boardId: string, swimlaneId: string) {
  return apiRequest<null>(`/boards/${boardId}/swimlanes/${swimlaneId}`, {
    method: 'DELETE',
  });
}

export function reorderSwimlanes(boardId: string, orders: { swimlaneId: string; order: number }[]) {
  return apiRequest<null>(`/boards/${boardId}/swimlanes/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}

// ── Note CRUD (update/delete — missing in current API) ──────

export function updateNote(noteId: string, content: string) {
  return apiRequest<NoteResponse>(`/boards/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export function deleteNote(noteId: string) {
  return apiRequest<null>(`/boards/notes/${noteId}`, {
    method: 'DELETE',
  });
}

// ── Board Fields (system + custom) ──────────────────────────

export function getBoardFields(boardId: string) {
  return apiRequest<BoardField[]>(`/boards/${boardId}/fields`);
}

export function createBoardField(boardId: string, data: {
  name: string;
  description?: string;
  fieldType: string;
  isRequired?: boolean;
  order?: number;
  options?: string[];
}) {
  return apiRequest<BoardField>(`/boards/${boardId}/fields`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBoardField(boardId: string, fieldId: string, data: Partial<{
  name: string;
  description: string;
  isRequired: boolean;
  options: string[];
}>) {
  return apiRequest<BoardField>(`/boards/${boardId}/fields/${fieldId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteBoardField(boardId: string, fieldId: string) {
  return apiRequest<null>(`/boards/${boardId}/fields/${fieldId}`, {
    method: 'DELETE',
  });
}

export function reorderBoardFields(boardId: string, orders: { fieldId: string; order: number }[]) {
  return apiRequest<null>(`/boards/${boardId}/fields/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orders }),
  });
}

// ── References (project-level) ──────────────────────────────

export interface ProjectReferences {
  columnSystemTypes: { key: string; name: string; description: string }[];
  fieldTypes: { key: string; name: string; availableFor?: string[]; allowedScopes?: string[] }[];
  estimationUnits: { key: string; name: string; availableFor: string[] }[];
  priorityTypeOptions: { key: string; name: string; availableFor: string[]; defaultValues: string[] }[];
  projectStatuses?: { key: string; name: string }[];
  systemTaskFields: { key: string; name: string; fieldType: string; isRequired: boolean; availableFor: string[]; description?: string }[];
  systemProjectParams: { key: string; name: string; fieldType: string; isRequired: boolean; options: string[] | null }[];
  permissionAreas: { area: string; name: string; description: string; availableFor: string[] }[];
  accessLevels: { key: string; name: string }[];
}

export function getProjectReferences() {
  // Use the same references endpoint as admin templates for now
  // In production, this should be GET /v1/projects/references
  return apiRequest<ProjectReferences>('/admin/project-templates/references');
}