import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type UserResponse, type AuthResponse, refreshToken as refreshTokenApi, logout as logoutApi } from '../api/auth';

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  permissions: string[];
  permissionMap: Record<string, string>; // code -> access ("full" | "view")
  hasPermission: (perm: string) => boolean;
  hasFullPermission: (perm: string) => boolean;
  setAuth: (data: AuthResponse) => void;
  updateUser: (user: UserResponse) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractPermissions(roles: AuthResponse['roles']): string[] {
  if (!roles || !Array.isArray(roles)) return [];
  const allPerms = roles.flatMap((r) =>
    (r.permissions || [])
      .filter((p) => p.access !== 'none')
      .map((p) => p.code),
  );
  return [...new Set(allPerms)];
}

function extractPermissionMap(roles: AuthResponse['roles']): Record<string, string> {
  if (!roles || !Array.isArray(roles)) return {};
  const map: Record<string, string> = {};
  for (const role of roles) {
    for (const p of role.permissions || []) {
      if (p.access === 'none') continue;
      // "full" takes priority over "view" if multiple roles
      if (!map[p.code] || p.access === 'full') {
        map[p.code] = p.access;
      }
    }
  }
  return map;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionMap, setPermissionMap] = useState<Record<string, string>>({});

  const setAuth = useCallback((data: AuthResponse) => {
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }
    const perms = extractPermissions(data.roles);
    const permMap = extractPermissionMap(data.roles);
    setPermissions(perms);
    setPermissionMap(permMap);
    localStorage.setItem('permissions', JSON.stringify(perms));
    localStorage.setItem('permissionMap', JSON.stringify(permMap));
  }, []);

  const updateUser = useCallback((updatedUser: UserResponse) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const clearAuth = useCallback(() => {
    const rt = localStorage.getItem('refresh_token');
    if (rt) {
      logoutApi(rt).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('permissionMap');
    setUser(null);
    setPermissions([]);
    setPermissionMap({});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const rt = localStorage.getItem('refresh_token');
    const savedUser = localStorage.getItem('user');
    const cachedPerms = localStorage.getItem('permissions');

    if (cachedPerms) {
      try { setPermissions(JSON.parse(cachedPerms)); } catch { /* ignore */ }
    }
    const cachedPermMap = localStorage.getItem('permissionMap');
    if (cachedPermMap) {
      try { setPermissionMap(JSON.parse(cachedPermMap)); } catch { /* ignore */ }
    }

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearAuth();
      }
      setIsLoading(false);
    } else if (rt) {
      refreshTokenApi(rt)
        .then((data) => {
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          const u = localStorage.getItem('user');
          if (u) {
            try {
              setUser(JSON.parse(u));
            } catch {
              clearAuth();
            }
          } else {
            clearAuth();
          }
        })
        .catch(() => clearAuth())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  // Refresh token periodically (every 10 minutes, token expires in 15)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const rt = localStorage.getItem('refresh_token');
      if (rt) {
        refreshTokenApi(rt)
          .then((data) => {
            localStorage.setItem('access_token', data.accessToken);
            localStorage.setItem('refresh_token', data.refreshToken);
          })
          .catch(() => clearAuth());
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, clearAuth]);

  const isAdmin = permissions.some((p) => p.startsWith('system.'));

  const hasPermission = useCallback(
    (perm: string) => permissions.includes(perm),
    [permissions],
  );

  const hasFullPermission = useCallback(
    (perm: string) => permissionMap[perm] === 'full',
    [permissionMap],
  );

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isAdmin, permissions, permissionMap, hasPermission, hasFullPermission, setAuth, updateUser, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
