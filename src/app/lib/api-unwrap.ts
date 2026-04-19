export function unwrapList<T>(result: unknown, keys: string[] = []): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    const obj = result as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (Array.isArray(value)) return value as T[];
    }
    // Common fallback keys
    for (const key of ["items", "data", "results", "list"]) {
      const value = obj[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}
