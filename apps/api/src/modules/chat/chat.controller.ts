import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { SendMessageDto } from './dto/send-message.dto';

interface RequestWithUser {
  user: { id: string };
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  async createOrGetChatRoom(
    @Request() req: RequestWithUser,
    @Body() createChatRoomDto: CreateChatRoomDto,
  ) {
    return this.chatService.createOrGetChatRoom(req.user.id, createChatRoomDto);
  }

  @Get('rooms')
  async getChatRooms(@Request() req: RequestWithUser) {
    return this.chatService.getChatRooms(req.user.id);
  }

  @Get('rooms/:roomId')
  async getChatRoom(@Request() req: RequestWithUser, @Param('roomId') roomId: string) {
    return this.chatService.getChatRoom(req.user.id, roomId);
  }

  @Get('rooms/:roomId/messages')
  async getMessages(
    @Request() req: RequestWithUser,
    @Param('roomId') roomId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      req.user.id,
      roomId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Request() req: RequestWithUser,
    @Param('roomId') roomId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, roomId, sendMessageDto);
  }

  @Post('rooms/:roomId/read')
  async markAsRead(@Request() req: RequestWithUser, @Param('roomId') roomId: string) {
    await this.chatService.markMessagesAsRead(req.user.id, roomId);
    return { success: true };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: RequestWithUser) {
    return this.chatService.getTotalUnreadCount(req.user.id);
  }
}
