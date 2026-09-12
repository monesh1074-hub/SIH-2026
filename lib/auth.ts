import { User, UserRole, PermissionKey } from '@/types';
import { ALL_PERMISSIONS, INITIAL_ROLES } from './mock-data';

// Map of route paths to required permissions
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  '/settings': 'SYSTEM_SETTINGS',
  '/users': 'USER_VIEW',
  '/roles': 'ROLE_VIEW',
  '/permissions': 'ROLE_VIEW',
  '/audit': 'AUDIT_VIEW',
  '/verification': 'VERIFICATION_VIEW',
  '/documents/upload': 'DOCUMENT_UPLOAD',
  '/analytics': 'ANALYTICS_VIEW',
  '/gis': 'GIS_VIEW',
  '/maps': 'GIS_VIEW',
  '/records': 'RECORD_VIEW',
};

/**
 * Returns whether a user has a specific permission.
 * Super Admins automatically have all permissions.
 */
export function hasPermission(user: User | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  // If user has permissions array directly
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }

  // Fallback to role definition permissions
  const roleObj = INITIAL_ROLES.find(r => r.code === user.role);
  if (roleObj) {
    return roleObj.permissions.includes(permission);
  }

  return false;
}

/**
 * Checks if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * Checks if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

/**
 * Validates whether a user can access a specific application route path
 */
export function canAccessRoute(user: User | null | undefined, pathname: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  // Check exact or prefix route permission
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return hasPermission(user, perm);
    }
  }

  // Public/shared authenticated pages like /dashboard, /profile, /notifications
  return true;
}

/**
 * Get the list of all permissions granted to a given role
 */
export function getPermissionsForRole(role: UserRole): PermissionKey[] {
  if (role === 'SUPER_ADMIN') {
    return ALL_PERMISSIONS.map(p => p.key);
  }
  const roleObj = INITIAL_ROLES.find(r => r.code === role);
  return roleObj ? [...roleObj.permissions] : [];
}
