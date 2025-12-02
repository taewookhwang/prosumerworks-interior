import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Contractor } from '../../contractors/entities/contractor.entity';
import { Message } from './message.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @ManyToOne(() => Contractor)
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;

  @Column({ name: 'quote_request_id', nullable: true })
  quoteRequestId: string;

  @Column({ name: 'last_message', type: 'text', nullable: true })
  lastMessage: string;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'customer_unread', default: 0 })
  customerUnread: number;

  @Column({ name: 'contractor_unread', default: 0 })
  contractorUnread: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
