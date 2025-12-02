import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';

export enum UserType {
  CUSTOMER = 'customer',
  CONTRACTOR = 'contractor',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.CUSTOMER,
  })
  userType: UserType;

  @Column({ name: 'google_id', unique: true, nullable: true })
  googleId: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
