import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { MatchService } from './match.service';

class MatchDto {
  @IsString()
  @MinLength(2)
  query: string;
}

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  match(@Body() dto: MatchDto) {
    return this.matchService.match(dto.query);
  }
}
