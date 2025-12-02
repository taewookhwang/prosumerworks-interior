import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { Message } from './entities/message.entity';
import { User, UserType } from '../users/entities/user.entity';
import { Contractor } from '../contractors/entities/contractor.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Contractor)
    private contractorRepository: Repository<Contractor>,
  ) {}

  async createOrGetChatRoom(userId: string, createChatRoomDto: CreateChatRoomDto) {
    const currentUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    let customerId: string;
    let contractorId: string;

    if (currentUser.userType === UserType.CONTRACTOR) {
      // 시공업자가 채팅방 생성 - recipientId는 고객 userId
      const contractor = await this.contractorRepository.findOne({
        where: { userId: userId },
      });
      if (!contractor) {
        throw new NotFoundException('Contractor not found');
      }
      contractorId = contractor.id;
      customerId = createChatRoomDto.recipientId;
    } else {
      // 고객이 채팅방 생성 - recipientId는 contractor의 userId
      customerId = userId;
      const contractor = await this.contractorRepository.findOne({
        where: { userId: createChatRoomDto.recipientId },
      });
      if (!contractor) {
        throw new NotFoundException('Contractor not found');
      }
      contractorId = contractor.id;
    }

    // 기존 채팅방 찾기
    let chatRoom = await this.chatRoomRepository.findOne({
      where: { customerId, contractorId },
      relations: ['customer', 'contractor', 'contractor.user'],
    });

    if (!chatRoom) {
      // 새 채팅방 생성
      chatRoom = this.chatRoomRepository.create({
        customerId,
        contractorId,
        quoteRequestId: createChatRoomDto.quoteId,
      });
      chatRoom = await this.chatRoomRepository.save(chatRoom);
      chatRoom = await this.chatRoomRepository.findOne({
        where: { id: chatRoom.id },
        relations: ['customer', 'contractor', 'contractor.user'],
      });
    }

    return chatRoom;
  }

  async getChatRooms(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let chatRooms: ChatRoom[];

    if (user.userType === UserType.CONTRACTOR) {
      const contractor = await this.contractorRepository.findOne({
        where: { userId: userId },
      });
      if (!contractor) {
        return [];
      }
      chatRooms = await this.chatRoomRepository.find({
        where: { contractorId: contractor.id, isActive: true },
        relations: ['customer', 'contractor', 'contractor.user'],
        order: { lastMessageAt: 'DESC' },
      });
    } else {
      chatRooms = await this.chatRoomRepository.find({
        where: { customerId: userId, isActive: true },
        relations: ['customer', 'contractor', 'contractor.user'],
        order: { lastMessageAt: 'DESC' },
      });
    }

    return chatRooms.map(room => ({
      ...room,
      otherUser: user.userType === UserType.CONTRACTOR
        ? room.customer
        : room.contractor?.user,
      unreadCount: user.userType === UserType.CONTRACTOR
        ? room.contractorUnread
        : room.customerUnread,
    }));
  }

  async getChatRoom(userId: string, roomId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['customer', 'contractor', 'contractor.user'],
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    // 접근 권한 확인
    if (user.userType === UserType.CONTRACTOR) {
      const contractor = await this.contractorRepository.findOne({
        where: { userId: userId },
      });
      if (!contractor || chatRoom.contractorId !== contractor.id) {
        throw new ForbiddenException('Access denied to this chat room');
      }
    } else {
      if (chatRoom.customerId !== userId) {
        throw new ForbiddenException('Access denied to this chat room');
      }
    }

    return chatRoom;
  }

  async getMessages(userId: string, roomId: string, page = 1, limit = 50) {
    await this.getChatRoom(userId, roomId);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { chatRoomId: roomId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 읽음 처리
    await this.markMessagesAsRead(userId, roomId);

    return {
      messages: messages.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(userId: string, roomId: string, sendMessageDto: SendMessageDto) {
    const chatRoom = await this.getChatRoom(userId, roomId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const message = this.messageRepository.create({
      chatRoomId: roomId,
      senderId: userId,
      content: sendMessageDto.content,
    });

    await this.messageRepository.save(message);

    // 채팅방 업데이트
    const isContractor = user?.userType === UserType.CONTRACTOR;
    const updateData: Partial<ChatRoom> = {
      lastMessage: sendMessageDto.content,
      lastMessageAt: new Date(),
    };

    if (isContractor) {
      updateData.customerUnread = (chatRoom.customerUnread || 0) + 1;
    } else {
      updateData.contractorUnread = (chatRoom.contractorUnread || 0) + 1;
    }

    await this.chatRoomRepository.update(roomId, updateData);

    const savedMessage = await this.messageRepository.findOne({
      where: { id: message.id },
      relations: ['sender'],
    });

    return savedMessage;
  }

  async markMessagesAsRead(userId: string, roomId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: roomId },
    });
    if (!chatRoom) return;

    // 상대방 메시지 읽음 처리
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('chat_room_id = :roomId', { roomId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('is_read = false')
      .execute();

    // 읽지 않은 메시지 카운트 리셋
    const isContractor = user.userType === UserType.CONTRACTOR;
    if (isContractor) {
      await this.chatRoomRepository.update(roomId, { contractorUnread: 0 });
    } else {
      await this.chatRoomRepository.update(roomId, { customerUnread: 0 });
    }
  }

  async getTotalUnreadCount(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let result: { total: string } | undefined;

    if (user.userType === UserType.CONTRACTOR) {
      const contractor = await this.contractorRepository.findOne({
        where: { userId: userId },
      });
      if (!contractor) {
        return { unreadCount: 0 };
      }
      result = await this.chatRoomRepository
        .createQueryBuilder('room')
        .select('SUM(room.contractor_unread)', 'total')
        .where('room.contractor_id = :contractorId', { contractorId: contractor.id })
        .andWhere('room.is_active = true')
        .getRawOne();
    } else {
      result = await this.chatRoomRepository
        .createQueryBuilder('room')
        .select('SUM(room.customer_unread)', 'total')
        .where('room.customer_id = :userId', { userId })
        .andWhere('room.is_active = true')
        .getRawOne();
    }

    return { unreadCount: parseInt(result?.total || '0') || 0 };
  }
}
