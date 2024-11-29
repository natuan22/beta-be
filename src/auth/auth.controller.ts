import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CatchException } from '../exceptions/common.exception';
import { AuthGuard } from '../guards/auth.guard';
import { LogoutGuard } from '../guards/logout.guard';
import { RefreshTokenGuard } from '../guards/refresh_token.guard';
import {
  UserResponse,
  UserResponseSwagger,
} from '../user/responses/UserResponse';
import { GetDeviceId, GetUserIdFromToken } from '../utils/utils.decorators';
import { BaseResponse } from '../utils/utils.response';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserIdParamDto } from './dto/userIdParam.dto';
import { VerifyOTPDto } from './dto/verifyOTP.dto';
import { RefreshTokenSwagger } from './responses/RefreshToken.response';
import {
  RegisterResponse,
  RegisterSwagger,
} from './responses/Register.response';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { ChangePasswordGuard } from '../guards/change_password.guard';

@ApiTags('Auth - API')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: RegisterSwagger })
  async register(@Body() body: RegisterDto, @Res() res: Response) {
    try {
      const data: RegisterResponse = await this.authService.register(body);
      return res.status(HttpStatus.CREATED).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseSwagger })
  @Post('login')
  async login(@Req() req: Request, @Body() loginDto: LoginDto, @Headers() headers: Headers, @Res() res: Response) {
    try {
      // const data: UserResponse = await this.authService.login(req, loginDto, headers, res);
      const data: UserResponse = await this.authService.loginV2(loginDto, req, res);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data: data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiResponse({ status: HttpStatus.OK, type: BaseResponse })
  @ApiBearerAuth()
  @UseGuards(LogoutGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      const message = await this.authService.logoutV2(req['sessionId'], res);
      return res.status(HttpStatus.OK).send(new BaseResponse({ message }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Làm mới access token' })
  @ApiResponse({ status: HttpStatus.OK, type: RefreshTokenSwagger })
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    try {
      const data = await this.authService.refreshTokenV2(req, res);
      return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: HttpStatus.OK, type: BaseResponse })
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(ChangePasswordGuard)
  @Post('change-password')
  async changePassword(@Req() req: Request, @Body() body: ChangePasswordDto, @Res() res: Response) {
    try {
      const message: string = await this.authService.changePassword(req, body, res);
      return res.status(HttpStatus.OK).send(new BaseResponse({ message }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Xác thực số điện thoại' })
  @ApiResponse({ status: HttpStatus.OK, type: BaseResponse })
  @Post('verify-otp/:userId')
  async verifyOTP(
    @Param() p: UserIdParamDto,
    @Body() body: VerifyOTPDto,
    @Res() res: Response,
  ) {
    try {
      const message: string = await this.authService.verifyOTP(
        parseInt(p.userId),
        body.verifyOTP,
      );
      return res.status(HttpStatus.OK).send(new BaseResponse({ message }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  @ApiOperation({ summary: 'Yêu cầu gửi lại mã OTP xác thực số điện thoại' })
  @ApiResponse({ status: HttpStatus.OK, type: BaseResponse })
  @Post('get-verify-otp/:userId')
  async getVerifyOTP(@Param() p: UserIdParamDto, @Res() res: Response) {
    try {
      const message: string = await this.authService.getVerifyOTP(
        parseInt(p.userId),
      );
      return res.status(HttpStatus.OK).send(new BaseResponse({ message }));
    } catch (e) {
      throw new CatchException(e);
    }
  }

  //Admin usage only
  // @ApiOperation({ summary: "Lấy các phiên đăng nhập" })
  // @ApiResponse({ status: HttpStatus.OK, type: DeviceSessionSwagger })
  // @ApiBearerAuth()
  // @UseGuards(AdminGuard)
  // @Get("login-device-session")
  // async getHistorySession(@Query() q: UserIdQueryDto, @Res() res: Response) {
  //     try {
  //         const data: DeviceSessionResponse[] = await this.authService.getHistorySession(parseInt(q.userId));
  //         return res.status(HttpStatus.OK).send(new BaseResponse({ data }));
  //     } catch (e) {
  //         throw new CatchException(e);
  //     }
  // };

  // @ApiOperation({ summary: "Thu hồi phiên đăng nhập trên thiết bị chỉ định" })
  // @ApiResponse({ status: HttpStatus.OK, type: BaseResponse })
  // @ApiBearerAuth()
  // @UseGuards(AdminGuard)
  // @Post("remove-login-session")
  // async removeLoginSession(@Param() p: DeviceIdParamDto, @Res() res: Response) {
  //     try {
  //         const message: string = await this.authService.removeLoginSession(p.deviceId);
  //         return res.status(HttpStatus.OK).send(new BaseResponse({ message }));
  //     } catch (e) {
  //         throw new CatchException(e);
  //     }
  // };

  // @Get('test-queue')
  // async testQueue(){
  //     await this.authService.testQueue()
  // }
}
