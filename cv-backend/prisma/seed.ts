import { PrismaClient, Role, AttributeCategory, AttributeType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cvapp.com' },
    update: {},
    create: {
      email: 'admin@cvapp.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      emailVerified: true,
      profile: { create: { firstName: 'System', lastName: 'Admin' } },
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Recruiter user
  const recruiterHash = await bcrypt.hash('Recruiter123!', 12);
  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@cvapp.com' },
    update: {},
    create: {
      email: 'recruiter@cvapp.com',
      passwordHash: recruiterHash,
      role: Role.RECRUITER,
      emailVerified: true,
      profile: { create: { firstName: 'Jane', lastName: 'Recruiter' } },
    },
  });
  console.log('✅ Recruiter created:', recruiter.email);

  // Candidate user
  const candidateHash = await bcrypt.hash('Candidate123!', 12);
  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@cvapp.com' },
    update: {},
    create: {
      email: 'candidate@cvapp.com',
      passwordHash: candidateHash,
      role: Role.CANDIDATE,
      emailVerified: true,
      profile: { create: { firstName: 'John', lastName: 'Doe', location: 'Tashkent, UZ' } },
    },
  });
  console.log('✅ Candidate created:', candidate.email);

  // Seed attributes
  const attrs = [
    { name: 'English Level', category: AttributeCategory.LANGUAGE, type: AttributeType.ONE_OF_MANY, options: JSON.stringify(['A1','A2','B1','B2','C1','C2']) },
    { name: 'GPA', category: AttributeCategory.EDUCATION, type: AttributeType.NUMERIC, minValue: 0, maxValue: 4 },
    { name: 'Remote Work', category: AttributeCategory.PERSONAL_INFORMATION, type: AttributeType.BOOLEAN },
    { name: 'Presentation Skills', category: AttributeCategory.SOFT_SKILLS, type: AttributeType.ONE_OF_MANY, options: JSON.stringify(['Beginner','Intermediate','Advanced']) },
    { name: 'IELTS Score', category: AttributeCategory.CERTIFICATION, type: AttributeType.NUMERIC, minValue: 0, maxValue: 9 },
    { name: 'GitHub Profile', category: AttributeCategory.PERSONAL_INFORMATION, type: AttributeType.STRING },
    { name: 'LinkedIn', category: AttributeCategory.PERSONAL_INFORMATION, type: AttributeType.STRING },
    { name: 'Cover Letter', category: AttributeCategory.OTHER, type: AttributeType.TEXT },
  ];

  for (const attr of attrs) {
    await prisma.attribute.upsert({
      where: { name: attr.name },
      update: {},
      create: attr as any,
    });
  }
  console.log('✅ Attributes seeded');

  // Seed badges
  const badges = [
    { key: 'first_cv', label: 'First CV', description: 'Created your first CV', threshold: 1 },
    { key: 'five_cvs', label: 'Portfolio Builder', description: 'Created 5 CVs', threshold: 5 },
    { key: 'ten_projects', label: 'Project Hero', description: 'Added 10 projects', threshold: 10 },
    { key: 'twenty_five_likes', label: 'Star Candidate', description: 'Received 25 likes', threshold: 25 },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: {},
      create: badge,
    });
  }
  console.log('✅ Badges seeded');

  console.log('\n🎉 Seed complete!');
  console.log('Admin:     admin@cvapp.com / Admin123!');
  console.log('Recruiter: recruiter@cvapp.com / Recruiter123!');
  console.log('Candidate: candidate@cvapp.com / Candidate123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
