import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from './entities/user.entity';
import { ContractorsService } from '../contractors/contractors.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => ContractorsService))
    private readonly contractorsService: ContractorsService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, userData);
    return this.findById(id);
  }

  async updateUserType(id: string, userType: UserType): Promise<User> {
    await this.userRepository.update(id, { userType });
    return this.findById(id);
  }

  async getMeWithContractorInfo(id: string): Promise<any> {
    const user = await this.findById(id);
    const contractor = await this.contractorsService.findByUserId(id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      userType: user.userType,
      phone: user.phone,
      createdAt: user.createdAt,
      hasContractor: !!contractor,
      contractor: contractor
        ? {
            id: contractor.id,
            companyName: contractor.companyName,
            status: contractor.status,
          }
        : null,
    };
  }

  async switchUserType(id: string, targetType: 'customer' | 'contractor'): Promise<any> {
    // Verify user exists
    await this.findById(id);

    if (targetType === 'contractor') {
      // Check if user has a contractor profile
      const contractor = await this.contractorsService.findByUserId(id);
      if (!contractor) {
        throw new NotFoundException('업체 등록이 필요합니다. 먼저 업체 등록을 완료해주세요.');
      }
    }

    const newUserType = targetType === 'contractor' ? UserType.CONTRACTOR : UserType.CUSTOMER;
    await this.userRepository.update(id, { userType: newUserType });

    return this.getMeWithContractorInfo(id);
  }

  async deleteAccount(id: string): Promise<void> {
    // Verify user exists
    await this.findById(id);

    // Soft delete by marking as inactive and anonymizing data
    await this.userRepository.update(id, {
      isActive: false,
      email: `deleted_${id}@deleted.com`,
      name: '탈퇴한 사용자',
      profileImage: undefined,
      googleId: undefined,
      phone: undefined,
    });

    // Note: Related data (contractor, portfolios, etc.) will remain
    // but will be orphaned. For full GDPR compliance, you may need
    // to cascade delete or anonymize related data as well.
  }
}
