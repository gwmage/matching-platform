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
preferred에는 오직 이 값들만 사용한다: "sat-am","sat-pm","sun-am","sun-pm","weekday". ("any" 같은 다른 값 금지)
요일/시간 변환 규칙:
- "토요일"→["sat-am","sat-pm"], "일요일"→["sun-am","sun-pm"], "주말"→["sat-am","sat-pm","sun-am","sun-pm"], "평일"→["weekday"]
- "오전"이 함께 있으면 -am만, "오후"가 함께 있으면 -pm만 남긴다.
- 일정 언급이 없으면 preferred는 [].
예시:
요청 "토요일 오전 Nest.js 멘토" → {"neededSkills":["Nest.js"],"preferred":["sat-am"],"style":"any"}
요청 "주말에 친근한 React 멘토" → {"neededSkills":["React"],"preferred":["sat-am","sat-pm","sun-am","sun-pm"],"style":"casual"}
요청 "평일에 가능한 AI 멘토" → {"neededSkills":["AI"],"preferred":["weekday"],"style":"any"}

요청: "${query}"
형식: {"neededSkills":[...],"preferred":[...],"style":"formal|casual|any"}`,
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
    // 운영 통계용 로그: 요청 1건 = 의도추출 1회 + 추천이유 N회 Gemini 호출(대략 비용)
    const costUsd = +(((1 + results.length) * 0.0002)).toFixed(4);
    await this.prisma.matchRequest.create({
      data: { query, results: results.length, topScore: results[0]?.score ?? 0, costUsd },
    }).catch(() => {});

    return { query, intent, matches: results, log };
  }

  // 만족도 피드백 저장
  async saveFeedback(score: number) {
    return this.prisma.feedback.create({ data: { score: Math.max(1, Math.min(5, Math.round(score))) } });
  }

  // 운영 통계: 요청 수·성공률(1위 60점 이상)·AI 비용·불만족 건수
  async stats() {
    const reqs = await this.prisma.matchRequest.findMany();
    const fbs = await this.prisma.feedback.findMany();
    const n = reqs.length || 1;
    const success = reqs.filter((r) => r.topScore >= 60).length;
    const cost = reqs.reduce((a, r) => a + r.costUsd, 0);
    // 날짜별 요청 수
    const byDay: Record<string, number> = {};
    for (const r of reqs) {
      const d = r.createdAt.toISOString().slice(5, 10);
      byDay[d] = (byDay[d] || 0) + 1;
    }
    const dissatisfied = fbs.filter((f) => f.score <= 2).length;
    const avgScore = fbs.length ? +(fbs.reduce((a, f) => a + f.score, 0) / fbs.length).toFixed(1) : 0;
    return {
      totalRequests: reqs.length,
      successRate: Math.round((success / n) * 100),
      estCostUsd: +cost.toFixed(4),
      estCostKrw: Math.round(cost * 1400),
      feedbackCount: fbs.length,
      avgScore,
      dissatisfied,
      byDay: Object.entries(byDay).map(([day, count]) => ({ day, count })),
    };
  }
}
