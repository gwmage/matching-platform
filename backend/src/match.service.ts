import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { geminiJson, geminiText } from './gemini';
import { searchCandidates, scoreMatch, checkAvailability, toArr } from './tools';

@Injectable()
export class MatchService {
  constructor(private readonly prisma: PrismaService) {}

  // 에이전트: 자연어 요청 → 의도 추출 → 도구(검색·점수) → 추천 이유 생성
  async match(query: string) {
    const log: any[] = [];

    // ① Gemini로 요청 의도 추출
    const intent = await geminiJson<{ neededSkills: string[]; preferred: string[]; style: string }>(
      `다음 요청에서 매칭 조건을 뽑아 JSON으로만 답해줘.
요청: "${query}"
형식: {"neededSkills":["전문분야 영문/한글 태그"],"preferred":["sat-am","sat-pm","sun-am","sun-pm","weekday" 중 해당"],"style":"formal|casual|any"}`,
    ).catch(() => ({ neededSkills: [], preferred: [], style: 'any' }));
    log.push({ step: '의도추출', intent });

    // ② 도구: 후보 검색
    const cands = await searchCandidates(this.prisma, intent.neededSkills);
    log.push({ step: 'searchCandidates', found: cands.length });

    // ③ 도구: 일정 통과 + 점수 계산
    const scored = cands
      .map((c) => {
        const s = scoreMatch(intent, c as any);
        return { cand: c, ...s, availableOk: checkAvailability((c as any).available, intent.preferred) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    log.push({ step: 'scoreMatch', top: scored.map((s) => s.score) });

    // ④ Gemini로 추천 이유 생성 (실제 점수 근거 기반, 개인정보 가림)
    const results = [];
    for (const s of scored) {
      const c: any = s.cand;
      const reason = await geminiText(
        `너는 전문가 매칭 도우미다. 아래 근거에 기반해, 이 후보를 추천하는 이유를 2~3문장 한국어로 써줘. 실명/연락처는 절대 쓰지 말고 "OOO 전문가"처럼만 지칭해. 점수 근거에 없는 칭찬은 하지 마.
요청: "${query}"
후보 전문분야: ${c.expertise}
가능 일정 겹침: ${s.availableOk ? '있음' : '없음'}
만족도: ${c.rating}/5
항목별 점수(100점 만점): 전문분야 ${s.breakdown.expertise}, 일정 ${s.breakdown.schedule}, 만족도 ${s.breakdown.rating}, 소통 ${s.breakdown.style}
소개: ${c.bio}`,
      ).catch(() => '점수 근거에 따라 추천된 후보입니다.');

      results.push({
        maskedName: `${(c.name || 'OOO')[0]}OO 전문가`,
        expertise: toArr(c.expertise),
        score: s.score,
        breakdown: s.breakdown,
        reason,
      });
    }
    return { query, intent, matches: results, log };
  }
}
