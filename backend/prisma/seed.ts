import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const profiles = [
  { name: '김도현', expertise: 'Nest.js,backend,TypeScript', available: 'sat-am,sun-pm', rating: 4.8, styleTag: 'formal', bio: '백엔드 10년차. Nest.js 기반 대규모 API 설계와 멘토링 경험 다수.' },
  { name: '이서연', expertise: 'Nest.js,PostgreSQL,backend', available: 'sat-pm', rating: 4.5, styleTag: 'casual', bio: '주말마다 백엔드 스터디를 운영하는 친근한 멘토.' },
  { name: '박준영', expertise: 'React,frontend,Next.js', available: 'sun-am,sun-pm', rating: 4.2, styleTag: 'any', bio: '프론트엔드 전문. 디자인 시스템과 컴포넌트 설계가 강점.' },
  { name: '최민지', expertise: 'Nest.js,AWS,backend,DevOps', available: 'sat-am', rating: 4.9, styleTag: 'formal', bio: '백엔드+인프라. 배포와 운영 자동화 컨설팅 경험.' },
  { name: '정우성', expertise: 'Python,AI,backend', available: 'weekday', rating: 4.0, styleTag: 'casual', bio: 'AI 서비스 백엔드. RAG/에이전트 구축 다수.' },
  { name: '한지민', expertise: 'Nest.js,GraphQL,backend', available: 'sat-am,sat-pm,sun-am', rating: 4.6, styleTag: 'casual', bio: '주말 풀타임 가능. Nest.js와 GraphQL 실무 멘토.' },
];

(async () => {
  await prisma.profile.deleteMany();
  for (const p of profiles) await prisma.profile.create({ data: p });
  console.log('seeded profiles:', await prisma.profile.count());
  await prisma.$disconnect();
})();
