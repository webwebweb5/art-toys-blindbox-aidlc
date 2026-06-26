import { PrismaClient, Role, MembershipTier, SeriesStatus, RarityTier, BranchStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arttoys.com' },
    update: {},
    create: {
      email: 'admin@arttoys.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      role: Role.ADMIN,
      tier: MembershipTier.PLATINUM,
      tierProgress: 100,
      emailVerified: true,
      referralCode: 'ADMIN001',
    },
  });

  // Create staff user
  const staffPasswordHash = await bcrypt.hash('staff123456', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@arttoys.com' },
    update: {},
    create: {
      email: 'staff@arttoys.com',
      passwordHash: staffPasswordHash,
      name: 'Branch Staff',
      role: Role.STAFF,
      tier: MembershipTier.BRONZE,
      tierProgress: 0,
      emailVerified: true,
      referralCode: 'STAFF001',
    },
  });

  // Create customer user
  const customerPasswordHash = await bcrypt.hash('customer123456', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: customerPasswordHash,
      name: 'Test Customer',
      role: Role.CUSTOMER,
      tier: MembershipTier.SILVER,
      tierProgress: 25,
      emailVerified: true,
      referralCode: 'CUST001',
    },
  });

  // Create a Series
  const series = await prisma.series.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Urban Warriors Series 1',
      artist: 'ArtistX',
      description: 'A collection of 6 urban warrior figures with unique designs.',
      pricePerBox: 9.99,
      figureCount: 6,
      coverImage: 'https://placeholder.com/series/urban-warriors.jpg',
      status: SeriesStatus.PUBLISHED,
      pityThreshold: 50,
      pityMultiplier: 2.0,
      publishedAt: new Date(),
    },
  });

  // Create Figures for the series
  const figures = [
    { name: 'Shadow Ninja', rarity: RarityTier.COMMON, probability: 30.0, sortOrder: 1 },
    { name: 'Storm Rider', rarity: RarityTier.COMMON, probability: 30.0, sortOrder: 2 },
    { name: 'Flame Knight', rarity: RarityTier.UNCOMMON, probability: 20.0, sortOrder: 3 },
    { name: 'Ice Mage', rarity: RarityTier.UNCOMMON, probability: 12.0, sortOrder: 4 },
    { name: 'Thunder Lord', rarity: RarityTier.RARE, probability: 6.0, sortOrder: 5 },
    { name: 'Dragon Emperor', rarity: RarityTier.SECRET, probability: 2.0, sortOrder: 6 },
  ];

  for (const fig of figures) {
    await prisma.figure.upsert({
      where: { id: `00000000-0000-0000-0000-00000000000${fig.sortOrder}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-00000000000${fig.sortOrder}`,
        seriesId: series.id,
        name: fig.name,
        image: `https://placeholder.com/figures/${fig.name.toLowerCase().replace(' ', '-')}.jpg`,
        rarity: fig.rarity,
        probability: fig.probability,
        sortOrder: fig.sortOrder,
      },
    });
  }

  // Create Branches
  const branches = [
    {
      id: '00000000-0000-0000-0001-000000000001',
      name: 'Central Mall Branch',
      address: '123 Central Mall, Floor 2, Downtown',
      latitude: 13.7563,
      longitude: 100.5018,
      operatingHours: { mon: { open: '10:00', close: '21:00' }, tue: { open: '10:00', close: '21:00' }, wed: { open: '10:00', close: '21:00' }, thu: { open: '10:00', close: '21:00' }, fri: { open: '10:00', close: '22:00' }, sat: { open: '10:00', close: '22:00' }, sun: { open: '11:00', close: '20:00' } },
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      name: 'Eastside Plaza Branch',
      address: '456 Eastside Plaza, Ground Floor',
      latitude: 13.7469,
      longitude: 100.5349,
      operatingHours: { mon: { open: '10:00', close: '20:00' }, tue: { open: '10:00', close: '20:00' }, wed: { open: '10:00', close: '20:00' }, thu: { open: '10:00', close: '20:00' }, fri: { open: '10:00', close: '21:00' }, sat: { open: '10:00', close: '21:00' }, sun: { open: '11:00', close: '19:00' } },
    },
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: {},
      create: {
        ...branch,
        status: BranchStatus.ACTIVE,
      },
    });
  }

  console.log('✅ Seed completed!');
  console.log(`  - Admin: admin@arttoys.com / admin123456`);
  console.log(`  - Staff: staff@arttoys.com / staff123456`);
  console.log(`  - Customer: customer@example.com / customer123456`);
  console.log(`  - Series: Urban Warriors (6 figures)`);
  console.log(`  - Branches: 2 locations`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
