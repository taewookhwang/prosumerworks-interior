import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User, UserType } from '../modules/users/entities/user.entity';
import { Contractor, ContractorStatus } from '../modules/contractors/entities/contractor.entity';
import { Portfolio, PortfolioImage } from '../modules/portfolios/entities/portfolio.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const userRepo = dataSource.getRepository(User);
  const contractorRepo = dataSource.getRepository(Contractor);
  const portfolioRepo = dataSource.getRepository(Portfolio);
  const imageRepo = dataSource.getRepository(PortfolioImage);

  console.log('🌱 Seeding database...');

  // Create test contractors
  const contractors = [
    {
      email: 'contractor1@test.com',
      name: '김인테리어',
      companyName: '모던하우스 인테리어',
      description: '20년 경력의 전문 인테리어 업체입니다. 고객 만족을 최우선으로 생각합니다.',
      specialties: ['전체 인테리어', '부분 인테리어'],
    },
    {
      email: 'contractor2@test.com',
      name: '이시공',
      companyName: '럭셔리홈 디자인',
      description: '프리미엄 인테리어 전문. 고급스러운 마감과 섬세한 시공을 약속드립니다.',
      specialties: ['전체 인테리어', '주방', '욕실'],
    },
    {
      email: 'contractor3@test.com',
      name: '박디자인',
      companyName: '심플리빙 인테리어',
      description: '미니멀하고 실용적인 공간을 만듭니다. 합리적인 가격, 최고의 퀄리티.',
      specialties: ['부분 인테리어', '도배/장판', '페인트'],
    },
  ];

  for (const data of contractors) {
    let user = await userRepo.findOne({ where: { email: data.email } });
    if (!user) {
      user = userRepo.create({
        email: data.email,
        name: data.name,
        userType: UserType.CONTRACTOR,
        googleId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
      user = await userRepo.save(user);
    }

    let contractor = await contractorRepo.findOne({ where: { userId: user.id } });
    if (!contractor) {
      contractor = contractorRepo.create({
        userId: user.id,
        companyName: data.companyName,
        businessNumber: `123-45-${Math.floor(Math.random() * 90000) + 10000}`,
        description: data.description,
        specialties: data.specialties,
        serviceAreas: ['서울', '경기'],
        status: ContractorStatus.APPROVED,
      });
      contractor = await contractorRepo.save(contractor);
    }

    console.log(`✅ Created contractor: ${data.companyName}`);
  }

  // Create portfolios with images
  const allContractors = await contractorRepo.find();
  const portfolioData = [
    {
      title: '강남 30평대 아파트 전체 리모델링',
      description: '오래된 아파트를 모던한 공간으로 탈바꿈했습니다. 화이트톤 베이스에 우드 포인트를 더해 따뜻하면서도 세련된 분위기를 연출했습니다.',
      category: '전체 인테리어',
      locationCity: '서울',
      locationDistrict: '강남구',
      areaSize: 32,
      durationDays: 45,
      costMin: 5000,
      costMax: 7000,
    },
    {
      title: '분당 신축 아파트 인테리어',
      description: '신혼부부를 위한 로맨틱한 공간을 만들었습니다. 핑크와 그레이 컬러 조합으로 따뜻하고 아늑한 느낌을 살렸습니다.',
      category: '전체 인테리어',
      locationCity: '경기',
      locationDistrict: '분당구',
      areaSize: 28,
      durationDays: 30,
      costMin: 4000,
      costMax: 5500,
    },
    {
      title: '마포 빌라 주방 리모델링',
      description: '좁은 주방을 효율적으로 리모델링했습니다. 아일랜드 식탁을 추가하고 수납공간을 최대화했습니다.',
      category: '주방',
      locationCity: '서울',
      locationDistrict: '마포구',
      areaSize: 8,
      durationDays: 14,
      costMin: 1500,
      costMax: 2000,
    },
    {
      title: '송파 아파트 욕실 인테리어',
      description: '호텔식 욕실로 완벽하게 변신! 레인샤워기와 월풀욕조를 설치하고, 대리석 타일로 고급스럽게 마감했습니다.',
      category: '욕실',
      locationCity: '서울',
      locationDistrict: '송파구',
      areaSize: 5,
      durationDays: 10,
      costMin: 1200,
      costMax: 1800,
    },
    {
      title: '용산 오피스텔 미니멀 인테리어',
      description: '1인 가구를 위한 미니멀하고 실용적인 공간. 화이트와 그레이 톤으로 깔끔하게 마감했습니다.',
      category: '전체 인테리어',
      locationCity: '서울',
      locationDistrict: '용산구',
      areaSize: 15,
      durationDays: 20,
      costMin: 2000,
      costMax: 3000,
    },
    {
      title: '일산 아파트 도배/장판 교체',
      description: '10년 된 아파트의 도배와 장판을 전면 교체했습니다. 친환경 자재를 사용하여 건강한 주거환경을 만들었습니다.',
      category: '도배/장판',
      locationCity: '경기',
      locationDistrict: '일산서구',
      areaSize: 35,
      durationDays: 5,
      costMin: 800,
      costMax: 1200,
    },
  ];

  for (let i = 0; i < portfolioData.length; i++) {
    const data = portfolioData[i];
    const contractor = allContractors[i % allContractors.length];

    const existingPortfolio = await portfolioRepo.findOne({
      where: { title: data.title, contractorId: contractor.id },
    });

    if (!existingPortfolio) {
      const portfolio = portfolioRepo.create({
        ...data,
        contractorId: contractor.id,
        isPublished: true,
        likeCount: Math.floor(Math.random() * 100),
        saveCount: Math.floor(Math.random() * 50),
        viewCount: Math.floor(Math.random() * 500),
      });
      const savedPortfolio = await portfolioRepo.save(portfolio);

      // Add sample images
      const imageCount = 3 + Math.floor(Math.random() * 3); // 3-5 images
      for (let j = 0; j < imageCount; j++) {
        const image = imageRepo.create({
          portfolioId: savedPortfolio.id,
          imageUrl: `https://picsum.photos/800/600?random=${savedPortfolio.id}-${j}`,
          thumbnailUrl: `https://picsum.photos/400/300?random=${savedPortfolio.id}-${j}`,
          imageType: j === 0 ? 'after' : ['before', 'after', 'progress'][j % 3],
          displayOrder: j,
        });
        await imageRepo.save(image);
      }

      console.log(`✅ Created portfolio: ${data.title}`);
    }
  }

  console.log('🎉 Seed completed!');
  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
