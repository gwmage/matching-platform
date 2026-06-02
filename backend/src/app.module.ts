import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';

@Module({
  controllers: [MatchController],
  providers: [PrismaService, MatchService],
})
export class AppModule {}
