import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExceptionResponse } from '../exceptions/common.exception';
import { Role, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    return requiredRoles.some((role) => user.role == role);
  }
}
