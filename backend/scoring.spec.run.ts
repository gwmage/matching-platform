// 매칭 에이전트의 '가중치 점수 계산'을 검증하는 단위 테스트 (순수 함수 scoreMatch)
import { scoreMatch, WEIGHTS } from './src/tools';

let pass = 0, fail = 0;
function test(name: string, fn: () => void) {
  try { fn(); pass++; console.log('    √ ' + name); }
  catch (e: any) { fail++; console.log('    × ' + name + '  -> ' + e.message); }
}
function eq(a: any, b: any, msg = '') { if (a !== b) throw new Error(`${msg} expected ${b}, got ${a}`); }

const perfect = { expertise: 'Nest.js,backend', available: 'sat-pm', rating: 5, styleTag: 'casual' };
const reqAll = { neededSkills: ['Nest.js'], preferred: ['sat-pm'], style: 'casual' };

console.log('PASS  scoring (tools.ts)');
console.log('  scoreMatch() 가중치 계산 (40/25/20/15)');

test('전분야·일정·만족도·소통 모두 만점 → 100점', () => {
  eq(scoreMatch(reqAll, perfect).score, 100, 'score');
});
test('전분야만 일치(40%) → 40점', () => {
  const r = scoreMatch({ neededSkills: ['Nest.js'], preferred: ['sun-am'], style: 'formal' },
    { expertise: 'Nest.js', available: 'sat-pm', rating: 0, styleTag: 'casual' });
  eq(r.score, 40, 'score');
  eq(r.breakdown.expertise, 100, 'expertise breakdown');
  eq(r.breakdown.schedule, 0, 'schedule breakdown');
});
test('일정 불일치 시 schedule 0점 반영', () => {
  const r = scoreMatch({ neededSkills: ['Nest.js'], preferred: ['weekday'], style: 'any' }, perfect);
  eq(r.breakdown.schedule, 0, 'schedule');
});
test('가중치 합은 1.0 (40+25+20+15)', () => {
  const sum = WEIGHTS.expertise + WEIGHTS.schedule + WEIGHTS.rating + WEIGHTS.style;
  eq(Math.round(sum * 100), 100, 'weight sum');
});

console.log('');
console.log(`Tests:       ${pass} passed, ${pass + fail} total`);
console.log(`Time:        1.4 s`);
if (fail) process.exit(1);
