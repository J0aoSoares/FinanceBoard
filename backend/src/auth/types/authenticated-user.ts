import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AccessTokenPayload {
  sub: string;
}

export interface RequestWithUser {
  user?: AuthenticatedUser;
}
