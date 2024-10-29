import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { ExceptionResponse } from '../exceptions/common.exception';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    const decode_token = this.jwtService.decode(token);

    const sessionId = decode_token['sessionId'];

    const secret_key = await this.authService.getSecretKeyV2(sessionId);
    if (!secret_key)
      throw new ExceptionResponse(HttpStatus.UNAUTHORIZED, 'DeviceId invalid');

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: secret_key,
      });
      request['user'] = payload;
      request['token'] = token;
    } catch {
      await this.authService.removeLoginSession(sessionId);
      throw new ExceptionResponse(HttpStatus.UNAUTHORIZED, 'Token invalid');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
