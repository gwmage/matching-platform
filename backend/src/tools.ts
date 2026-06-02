// 매칭 에이전트가 쓰는 도구들. 가중치(40/25/20/15)가 이 서비스의 '정체성'.
import { PrismaService } from './prisma.service';

export const WEIGHTS = { expertise: 0.4, schedule: 0.25, rating: 0.2, style: 0.15 };

export const toArr = (s?: string): string[] =>
  (s || '').split(',').map((x) => x.trim()).filter(Boolean);

// 도구1: 전문분야로 후보 검색 (점수 계산은 하지 않는다)
export async function searchCandidates(prisma: PrismaService, skills: string[]) {
  const all = await prisma.profile.findMany({ take: 100 });
  if (!skills?.length) return all;
  const hit = all.filter((c) => {
    const exp = toArr((c as any).expertise);
    return skills.some((s) =>
      exp.some((e) => e.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(e.toLowerCase())),
    );
  });
  return hit.length ? hit : all; // 부족하면 조건 완화
}

// 도구2: 일정 겹침 확인
export function checkAvailability(available: string, preferred: string[]): boolean {
  if (!preferred?.length) return true;
  return toArr(available).some((s) => preferred.includes(s));
}

function overlapRatio(needed: string[], have: string[]): number {
  if (!needed?.length) return 0.5;
  const hit = needed.filter((s) =>
    (have || []).some((h) => h.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(h.toLowerCase())),
  ).length;
  return hit / needed.length;
}

function styleAffinity(want: string, has: string): number {
  if (!want || want === 'any' || has === 'any') return 0.5;
  return want === has ? 1 : 0;
}

// 도구3: 적합도 점수 (0~100) + 항목별 분해
export function scoreMatch(
  req: { neededSkills: string[]; preferred: string[]; style: string },
  cand: { expertise: string; available: string; rating: number; styleTag: string },
) {
  const expertise = overlapRatio(req.neededSkills, toArr(cand.expertise));
  const schedule = checkAvailability(cand.available, req.preferred) ? 1 : 0;
  const rating = Math.min(1, (cand.rating || 0) / 5);
  const style = styleAffinity(req.style, cand.styleTag);
  const total =
    expertise * WEIGHTS.expertise + schedule * WEIGHTS.schedule + rating * WEIGHTS.rating + style * WEIGHTS.style;
  return {
    score: Math.round(total * 100),
    breakdown: {
      expertise: Math.round(expertise * 100),
      schedule: Math.round(schedule * 100),
      rating: Math.round(rating * 100),
      style: Math.round(style * 100),
    },
  };
}
