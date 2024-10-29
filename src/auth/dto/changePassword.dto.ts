import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, Validate, ValidateIf } from 'class-validator';
import { PasswordMatchValidator } from '../../validators/password-match.validator';

export class ChangePasswordDto {
  @IsString({ message: 'password not found' })
  @ApiProperty({
    type: String,
    example: '123beta456',
  })
  oldPassword: string;

  @IsString({ message: 'password not found' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: 'password too weak',
    },
  )
  @ApiProperty({
    type: String,
    example: '123Beta456@',
    description:
      'Mật khẩu phải ít nhất 8 ký tự, trong đó phải có ít nhất 1 chữ cái in hoa, in thường và 1 ký tự đặc biệt',
  })
  newPassword: string;

  @ValidateIf((o) => o.password != undefined)
  @Validate(PasswordMatchValidator)
  @ApiProperty({
    type: String,
    example: '123Beta456@',
  })
  confirm_password: string;
}
