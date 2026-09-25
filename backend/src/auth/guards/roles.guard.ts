import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SELF_SERVICE_KEY } from '../decorators/self-service.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Autenticação necessária');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          'Seu perfil não tem permissão para esta operação',
        );
      }
      return true;
    }

    const isSelfService = this.reflector.getAllAndOverride<boolean>(
      SELF_SERVICE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isSelfService) {
      return true;
    }

    if (
      user.role === UserRole.VIEWER &&
      !READ_ONLY_METHODS.has(request.method)
    ) {
      throw new ForbiddenException(
        'Perfil somente leitura: não é possível criar, alterar ou remover registros',
      );
    }

    return true;
  }
}
