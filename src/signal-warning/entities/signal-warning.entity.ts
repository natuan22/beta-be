import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../../models/base.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Entity({ name: 'signal_warning_user', database: 'AUTH' })
export class SignalWarningUserEntity extends BaseModel {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  signal_id: number;

  @ManyToOne(() => UserEntity, (user) => user.user_id)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'nvarchar', length: 'max' })
  value: string;
}