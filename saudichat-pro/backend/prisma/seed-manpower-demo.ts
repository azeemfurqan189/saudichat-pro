import { PrismaClient, BusinessType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedManpowerDemo } from '../src/services/manpowerDemoSeed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Manpower demo (5 projects)...');

  const businessId = process.env.BUSINESS_ID;
  let targetBusinessId = businessId;

  if (!targetBusinessId) {
    const manpower = await prisma.business.findFirst({
      where: { type: BusinessType.MANPOWER },
      orderBy: { createdAt: 'desc' },
    });

    if (manpower) {
      targetBusinessId = manpower.id;
      console.log(`Using MANPOWER business: ${manpower.name} (${manpower.id})`);
    } else {
      const password = await bcrypt.hash('password123', 12);
      const user = await prisma.user.upsert({
        where: { email: 'manpower@saudichat.pro' },
        update: {},
        create: {
          name: 'Gulf Workforce Agency',
          email: 'manpower@saudichat.pro',
          phone: '+966509999999',
          password,
        },
      });

      const agency = await prisma.business.upsert({
        where: { slug: 'gulf-workforce-demo' },
        update: { type: BusinessType.MANPOWER },
        create: {
          userId: user.id,
          name: 'Gulf Workforce Agency',
          nameAr: 'وكالة القوى العاملة الخليجية',
          type: BusinessType.MANPOWER,
          slug: 'gulf-workforce-demo',
          description: 'Oil & Gas manpower supply — demo agency',
          whatsappNumber: '+966509999999',
          subscriptionPlan: 'BUSINESS',
          subscriptionStatus: 'ACTIVE',
          settings: { city: 'Dammam', industryType: 'MANPOWER' },
        },
      });

      targetBusinessId = agency.id;
      console.log(`Created demo agency: ${agency.slug}`);
      console.log('Login: manpower@saudichat.pro / +966509999999 / password123');
    }
  }

  const result = await seedManpowerDemo(targetBusinessId!, true);
  console.log('✅', result.message);
  console.log(`   Clients: ${result.clients} | Workers: ${result.workers}`);
  console.log(`   Projects: ${result.projects} | Placements: ${result.placements} | Timesheets: ${result.timesheets}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.disconnect());
