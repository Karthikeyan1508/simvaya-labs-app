import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../db/repo';

export const ROLES_KEY = 'roles';

// Put on a controller or handler. RolesGuard lets only these roles through.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
