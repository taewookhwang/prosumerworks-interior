import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contractor, ContractorStatus } from './entities/contractor.entity';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/entities/user.entity';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';

@Injectable()
export class ContractorsService {
  constructor(
    @InjectRepository(Contractor)
    private readonly contractorRepository: Repository<Contractor>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async findById(id: string): Promise<Contractor> {
    const contractor = await this.contractorRepository.findOne({
      where: { id },
      relations: ['user', 'portfolios', 'portfolios.images'],
    });
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    return contractor;
  }

  async findByUserId(userId: string): Promise<Contractor | null> {
    return this.contractorRepository.findOne({
      where: { userId },
      relations: ['user', 'portfolios', 'portfolios.images'],
    });
  }

  async apply(
    userId: string,
    createContractorDto: CreateContractorDto,
  ): Promise<{ contractor: Contractor; user: any }> {
    // Check if already applied
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('이미 업체 등록 신청을 하셨습니다');
    }

    const contractor = this.contractorRepository.create({
      userId,
      ...createContractorDto,
      status: ContractorStatus.PENDING,
    });

    // Update user type to contractor
    const updatedUser = await this.usersService.updateUserType(userId, UserType.CONTRACTOR);
    const savedContractor = await this.contractorRepository.save(contractor);

    return {
      contractor: savedContractor,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        profileImage: updatedUser.profileImage,
        userType: updatedUser.userType,
        createdAt: updatedUser.createdAt,
      },
    };
  }

  async update(
    id: string,
    updateContractorDto: UpdateContractorDto,
  ): Promise<Contractor> {
    await this.contractorRepository.update(id, updateContractorDto);
    return this.findById(id);
  }

  async approve(id: string): Promise<Contractor> {
    await this.contractorRepository.update(id, {
      status: ContractorStatus.APPROVED,
      approvedAt: new Date(),
    });
    return this.findById(id);
  }

  async reject(id: string, reason: string): Promise<Contractor> {
    await this.contractorRepository.update(id, {
      status: ContractorStatus.REJECTED,
      rejectionReason: reason,
    });
    return this.findById(id);
  }

  async findPending(): Promise<Contractor[]> {
    return this.contractorRepository.find({
      where: { status: ContractorStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
