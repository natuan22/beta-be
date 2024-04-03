import { CanActivate, ExecutionContext, HttpStatus, Injectable, } from '@nestjs/common';
import { ExceptionResponse } from '../exceptions/common.exception';
import { MRequest } from '../types/middleware';
import { JwtService } from "@nestjs/jwt";
import { RoleEnum } from "../enums/auth.enum";
import { AuthService } from '../auth/auth.service';
import { DeviceEntity } from '../auth/entities/device.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: MRequest = context.switchToHttp().getRequest();
    const bearer: string = request.headers.authorization;

    const token: string = bearer?.split(' ')[1];

    if (!token || !bearer) {
      throw new ExceptionResponse(HttpStatus.UNAUTHORIZED, 'Token not found!');
    }

    const decoded: any = await this.jwtService.decode(token);
    if (!decoded?.role || decoded.role != RoleEnum.Admin) {
      throw new ExceptionResponse(HttpStatus.FORBIDDEN, 'You are not allowed to do that!')
    }

    // Lấy deviceId từ token và từ request
    const deviceId: string = this.jwtService.decode(token)?.['deviceId'];
    
    // Lấy secret key từ authService và kiểm tra tính hợp lệ của token
    const { secret_key, expired_at }: Awaited<Pick<DeviceEntity, "secret_key" | "expired_at">>
      = await this.authService.getSecretKey(deviceId);

    // Kiểm tra thiết bị còn hợp lệ hay không
    if (expired_at < new Date()) {
      throw new ExceptionResponse(HttpStatus.UNAUTHORIZED, 'device is expired');
    }

    // Kiểm tra tính hợp lệ của token
    return !!this.jwtService.verify(token, { secret: secret_key });

  }
}
