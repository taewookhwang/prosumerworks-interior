import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Contractor } from '../contractors/entities/contractor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom, Message, User, Contractor])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
