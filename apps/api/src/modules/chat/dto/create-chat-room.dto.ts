import { IsUUID, IsOptional } from 'class-validator';

export class CreateChatRoomDto {
  @IsUUID()
  recipientId: string;

  @IsUUID()
  @IsOptional()
  quoteId?: string;
}
