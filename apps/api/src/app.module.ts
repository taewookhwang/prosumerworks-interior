import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContractorsModule } from './modules/contractors/contractors.module';
import { PortfoliosModule } from './modules/portfolios/portfolios.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ChatModule } from './modules/chat/chat.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AIQuotesModule } from './modules/ai-quotes/ai-quotes.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { ApsModule } from './modules/aps/aps.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Use migrations in production
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ContractorsModule,
    PortfoliosModule,
    QuotesModule,
    ChatModule,
    UploadsModule,
    AIQuotesModule,
    MaterialsModule,
    SimulationModule,
    ApsModule,
    ApartmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
