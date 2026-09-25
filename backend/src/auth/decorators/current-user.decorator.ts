import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import {
  AuthenticatedUser,
  RequestWithUser,
} from '../types/authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user as AuthenticatedUser;
  },
);
