import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ChatRoom } from './chat-room.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_room_id' })
  chatRoomId: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages)
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'message_type', default: 'text' })
  messageType: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
