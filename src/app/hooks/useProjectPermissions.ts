import { useState, useEffect, useCallback } from 'react';
import { getMyProjectPermissions, type ProjectPermission } from '../api/projects';
import { useAuth } from '../contexts/AuthContext';

export function useProjectPermissions(projectId: string | undefined) {
  const { permissionMap } = useAuth();
  const [permissions, setPermissions] = useState<Map<string, 'full' | 'view' | 'none'>>(new Map());
  const [loading, setLoading] = useState(true);

  const systemAccess = (permissionMap['system.projects.manage'] || 'none') as 'full' | 'view' | 'none';

  useEffect(() => {
    if (!projectId) {
      setPermissions(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyProjectPermissions(projectId)
      .then((data: ProjectPermission[]) => {
        const map = new Map<string, 'full' | 'view' | 'none'>();
        data.forEach(p => map.set(p.area, p.access));
        setPermissions(map);
      })
      .catch(() => setPermissions(new Map()))
      .finally(() => setLoading(false));
  }, [projectId]);

  const getAccess = useCallback(
    (area: string): 'full' | 'view' | 'none' => {
      const projectAccess = permissions.get(area);
      if (projectAccess !== undefined) return projectAccess;
      // Fallback: if API returned nothing (user not a member), use system access
      if (permissions.size === 0 && systemAccess !== 'none') return systemAccess;
      return 'none';
    },
    [permissions, systemAccess],
  );

  /** User can see (full or view). Returns true while loading to avoid hiding tabs. */
  const can = useCallback(
    (area: string) => {
      if (loading) return true;
      const access = getAccess(area);
      return access === 'full' || access === 'view';
    },
    [getAccess, loading],
  );

  /** User can edit (full only). Returns false while loading. */
  const canEdit = useCallback(
    (area: string) => {
      if (loading) return false;
      return getAccess(area) === 'full';
    },
    [getAccess, loading],
  );

  return { permissions, can, canEdit, loading };
}
