const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  await prisma.matchRequest.deleteMany({});
  await prisma.feedback.deleteMany({});
  const queries = ['Nest.js 멘토', '주말 React 멘토', 'AI 백엔드 멘토', '디자인 시스템 멘토', 'DevOps 멘토'];
  // 5일치, 날짜별 요청 수 다르게
  const perDay = [4, 6, 5, 8, 7];
  const base = new Date('2031-03-02T10:00:00Z');
  for (let d = 0; d < perDay.length; d++) {
    for (let i = 0; i < perDay[d]; i++) {
      const created = new Date(base.getTime() + d * 86400000 + i * 600000);
      const top = [92, 88, 100, 74, 55, 99, 83, 67][(d * 3 + i) % 8]; // 대부분 60+ (성공), 일부 미만
      await prisma.matchRequest.create({
        data: { query: queries[(d + i) % queries.length], results: 3, topScore: top, costUsd: 0.0008, createdAt: created },
      });
    }
  }
  // 만족도 16건 (대부분 4~5, 일부 1~2)
  const scores = [5, 4, 5, 5, 4, 3, 5, 4, 2, 5, 4, 5, 1, 4, 5, 3];
  for (const sc of scores) await prisma.feedback.create({ data: { score: sc } });
  console.log('requests', await prisma.matchRequest.count(), 'feedback', await prisma.feedback.count());
  await prisma.$disconnect();
})();
