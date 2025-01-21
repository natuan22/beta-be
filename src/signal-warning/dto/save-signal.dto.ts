import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValueSaveSignal {
  @ApiProperty({ type: String })
  key: string;

  @ApiProperty({ type: String, isArray: true })
  codes: string[];

  @ApiProperty({ type: String })
  liquidity: string;

  @ApiProperty({ type: String })
  marketCap: string;

  @ApiProperty({ type: String, isArray: true })
  scope: string[];

  @ApiProperty({ type: String })
  value: string;
}

export class SaveSignalDto {
  @IsNotEmpty()
  @ApiProperty({
    type: ValueSaveSignal,
    isArray: true,
    description: 'Mảng các key...',
  })
  value: ValueSaveSignal[];
}
