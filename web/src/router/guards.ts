import type { Role, User } from '../api/types';

export interface AccessMeta {
  /** Reachable without signing in (login, sign-up). */
  guest?: boolean;
  /** Restricts the route to these roles. Unset means any signed-in user. */
  roles?: Role[];
}

export type AccessResult = true | { path: string; query?: Record<string, string> };

export function homeFor(user: User): string {
  return user.role === 'customer' ? '/portal' : '/queue/mine';
}

/** Decides whether a user may open a route, or where to send them instead. */
export function checkAccess(meta: AccessMeta, user: User | null, fullPath: string): AccessResult {
  if (meta.guest) return user ? { path: homeFor(user) } : true;
  if (!user) {
    return fullPath === '/'
      ? { path: '/login' }
      : { path: '/login', query: { redirect: fullPath } };
  }
  if (meta.roles && !meta.roles.includes(user.role)) return { path: homeFor(user) };
  return true;
}
