import { ApiProperty } from '@nestjs/swagger';
import { ValueSaveSignal } from '../dto/save-signal.dto';

export class SignalWarningUserResponse {
  @ApiProperty({
    type: Number,
    description: 'ID của tín hiệu cảnh báo',
  })
  signal_id: number;

  @ApiProperty({
    type: ValueSaveSignal,
    isArray: true,
    description: 'Danh sách giá trị tín hiệu',
  })
  value: string;

  constructor(data?: Partial<SignalWarningUserResponse>) {
    this.signal_id = data?.signal_id || 0;
    this.value = data?.value ? JSON.parse(data.value) : [];
  }

  static mapToList(data: Partial<SignalWarningUserResponse>[] = []): SignalWarningUserResponse[] {
    return data.map((item) => new SignalWarningUserResponse(item));
  }
}
