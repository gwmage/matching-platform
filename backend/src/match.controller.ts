import { Body, Controller, ForbiddenException, Get, HttpException, Post, Query } from '@nestjs/common';
import { IsInt, IsString, Min, Max, MinLength } from 'class-validator';
import { MatchService } from './match.service';

// 데모용 인메모리 요청 기록(레이트리밋 시연)
let _hits: number[] = [];

class MatchDto {
  @IsString()
  @MinLength(2)
  query: string;
}
class FeedbackDto {
  @IsInt() @Min(1) @Max(5) score: number;
}

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  match(@Body() dto: MatchDto) {
    return this.matchService.match(dto.query);
  }

  @Get('stats')
  stats() {
    return this.matchService.stats();
  }

  @Post('feedback')
  feedback(@Body() dto: FeedbackDto) {
    return this.matchService.saveFeedback(dto.score);
  }

  // [보안 데모] 권한 검사: 내 것이 아니면 403 차단
  @Get('demo/owner')
  owner(@Query('me') me: string, @Query('target') target: string) {
    if (me !== target) throw new ForbiddenException('다른 사용자의 데이터에 접근할 수 없습니다.');
    return { ok: true, message: '본인 데이터 접근 허용' };
  }

  // [보안 데모] 레이트리밋: 10초에 5회 초과 시 429
  @Get('demo/ratelimit')
  ratelimit() {
    const now = Date.now();
    _hits = _hits.filter((t) => now - t < 10000);
    _hits.push(now);
    if (_hits.length > 5) throw new HttpException('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);
    return { ok: true, count: _hits.length };
  }
}
