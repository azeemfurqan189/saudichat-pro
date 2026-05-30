import { PrismaClient, BusinessType, OrderStatus, AppointmentStatus, ConversationStatus, SenderType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SaudiChat Pro database...');

  const password = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@saudichat.pro' },
    update: {},
    create: {
      name: 'Ahmed Al-Rashid',
      email: 'demo@saudichat.pro',
      phone: '+966501234567',
      password,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
    },
  });

  const restaurant = await prisma.business.upsert({
    where: { slug: 'al-baik-demo' },
    update: {},
    create: {
      userId: user.id,
      name: 'Al Baik Demo Restaurant',
      nameAr: 'مطعم البيك تجريبي',
      type: BusinessType.RESTAURANT,
      slug: 'al-baik-demo',
      description: 'Famous Saudi fried chicken restaurant',
      descriptionAr: 'مطعم دجاج مقلي سعودي مشهور',
      whatsappNumber: '+966501111111',
      subscriptionPlan: 'BUSINESS',
      subscriptionStatus: 'ACTIVE',
      settings: {
        workingHours: '10:00 AM - 12:00 AM',
        language: 'both',
        currency: 'SAR',
        city: 'Riyadh',
      },
    },
  });

  const salon = await prisma.business.upsert({
    where: { slug: 'glamour-salon' },
    update: {},
    create: {
      userId: user.id,
      name: 'Glamour Salon',
      nameAr: 'صالون جلامور',
      type: BusinessType.SALON,
      slug: 'glamour-salon',
      description: 'Premium ladies salon in Jeddah',
      descriptionAr: 'صالون نسائي فاخر في جeddah',
      whatsappNumber: '+966502222222',
      subscriptionPlan: 'STARTER',
      subscriptionStatus: 'ACTIVE',
      settings: { workingHours: '9:00 AM - 9:00 PM', city: 'Jeddah' },
    },
  });

  const clinic = await prisma.business.upsert({
    where: { slug: 'care-clinic' },
    update: {},
    create: {
      userId: user.id,
      name: 'Care Medical Clinic',
      nameAr: 'عيادة كير الطبية',
      type: BusinessType.CLINIC,
      slug: 'care-clinic',
      description: 'Multi-specialty clinic',
      descriptionAr: 'عيادة متعددة التخصصات',
      whatsappNumber: '+966503333333',
      subscriptionPlan: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      settings: { workingHours: '8:00 AM - 10:00 PM', city: 'Dammam' },
    },
  });

  // Restaurant catalog
  const menuCatalog = await prisma.catalog.create({
    data: { businessId: restaurant.id, name: 'Main Menu', nameAr: 'القائمة الرئيسية', type: 'MENU' },
  });

  const menuItems = [
    { nameAr: 'دجاج مقلي', nameEn: 'Fried Chicken', price: 18, category: 'Main', image: 'https://images.unsplash.com/photo-1626082927389-6fd086691054?w=200' },
    { nameAr: 'برجر دجاج', nameEn: 'Chicken Burger', price: 22, category: 'Main', image: 'https://images.unsplash.com/photo-1606755962773-d324e166a853?w=200' },
    { nameAr: 'بطاطس', nameEn: 'French Fries', price: 8, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200' },
    { nameAr: 'كولا', nameEn: 'Cola', price: 5, category: 'Drinks', image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200' },
    { nameAr: 'وجبة عائلية', nameEn: 'Family Meal', price: 65, category: 'Main', isFeatured: true, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=200' },
  ];

  for (let i = 0; i < menuItems.length; i++) {
    await prisma.catalogItem.create({
      data: { catalogId: menuCatalog.id, businessId: restaurant.id, ...menuItems[i], sortOrder: i, isAvailable: true },
    });
  }

  // Salon catalog
  const salonCatalog = await prisma.catalog.create({
    data: { businessId: salon.id, name: 'Services', nameAr: 'الخدمات', type: 'SERVICES' },
  });

  const salonServices = [
    { nameAr: 'قص شعر', nameEn: 'Haircut', price: 80, duration: 45, category: 'Hair' },
    { nameAr: 'صبغة', nameEn: 'Hair Color', price: 200, duration: 120, category: 'Hair' },
    { nameAr: 'مانيكير', nameEn: 'Manicure', price: 60, duration: 30, category: 'Nails' },
    { nameAr: 'مكياج', nameEn: 'Makeup', price: 150, duration: 60, category: 'Beauty' },
  ];

  for (let i = 0; i < salonServices.length; i++) {
    await prisma.catalogItem.create({
      data: { catalogId: salonCatalog.id, businessId: salon.id, ...salonServices[i], sortOrder: i },
    });
  }

  // Customers
  const customers = [];
  const customerData = [
    { name: 'Fatima Al-Zahrani', phone: '+966551111111', totalOrders: 12, totalSpent: 450, loyaltyPoints: 450, tags: ['VIP', 'Regular'] },
    { name: 'Mohammed Al-Qahtani', phone: '+966552222222', totalOrders: 5, totalSpent: 180, loyaltyPoints: 180, tags: ['Regular'] },
    { name: 'Sara Al-Otaibi', phone: '+966553333333', totalOrders: 25, totalSpent: 1200, loyaltyPoints: 1200, tags: ['VIP'] },
    { name: 'Khalid Al-Dosari', phone: '+966554444444', totalOrders: 2, totalSpent: 65, loyaltyPoints: 65, tags: ['New'] },
    { name: 'Noura Al-Harbi', phone: '+966555555555', totalOrders: 8, totalSpent: 320, loyaltyPoints: 320, tags: ['Regular'] },
  ];

  for (const c of customerData) {
    const customer = await prisma.customer.create({
      data: { businessId: restaurant.id, ...c, lastInteraction: new Date() },
    });
    customers.push(customer);
  }

  // Staff
  const staff1 = await prisma.staff.create({
    data: { businessId: salon.id, name: 'Layla Hassan', role: 'Senior Stylist', phone: '+966561111111', email: 'layla@glamour.sa', isActive: true },
  });
  await prisma.staff.create({
    data: { businessId: salon.id, name: 'Reem Al-Farsi', role: 'Nail Technician', phone: '+966562222222', isActive: true },
  });
  await prisma.staff.create({
    data: { businessId: clinic.id, name: 'Dr. Omar Al-Shehri', role: 'General Physician', phone: '+966563333333', email: 'dr.omar@careclinic.sa', isActive: true },
  });

  // Orders
  const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];
  for (let i = 0; i < 15; i++) {
    const customer = customers[i % customers.length];
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    await prisma.order.create({
      data: {
        businessId: restaurant.id,
        customerId: customer.id,
        orderNumber: `ORD-${date.toISOString().slice(2, 10).replace(/-/g, '')}-${String(i).padStart(4, '0')}`,
        items: [
          { id: '1', name: 'Fried Chicken', quantity: 2, price: 18 },
          { id: '2', name: 'Cola', quantity: 1, price: 5 },
        ],
        subtotal: 41,
        tax: 6.15,
        deliveryFee: 10,
        total: 57.15,
        status: statuses[i % statuses.length],
        paymentMethod: i % 2 === 0 ? 'Mada' : 'STC Pay',
        paymentStatus: i < 10 ? 'PAID' : 'PENDING',
        createdAt: date,
      },
    });
  }

  // Appointments
  const apptStatuses: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];
  for (let i = 0; i < 10; i++) {
    const date = new Date();
    date.setDate(date.getDate() + (i % 5));
    await prisma.appointment.create({
      data: {
        businessId: salon.id,
        customerId: customers[i % customers.length].id,
        staffId: staff1.id,
        serviceName: salonServices[i % salonServices.length].nameEn,
        date,
        startTime: `${9 + (i % 8)}:00`,
        endTime: `${10 + (i % 8)}:00`,
        status: apptStatuses[i % apptStatuses.length],
      },
    });
  }

  // Conversations & Messages
  for (let i = 0; i < 5; i++) {
    const conv = await prisma.conversation.create({
      data: {
        businessId: restaurant.id,
        customerId: customers[i].id,
        status: ConversationStatus.ACTIVE,
        isBotHandling: i % 2 === 0,
      },
    });

    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, senderType: SenderType.CUSTOMER, messageType: 'TEXT', content: 'السلام عليكم، أبي أطلب', createdAt: new Date(Date.now() - 3600000) },
        { conversationId: conv.id, senderType: SenderType.BOT, messageType: 'TEXT', content: 'مرحباً! كيف يمكنني مساعدتك؟', metadata: { auto: true }, createdAt: new Date(Date.now() - 3500000) },
        { conversationId: conv.id, senderType: SenderType.CUSTOMER, messageType: 'TEXT', content: 'أبي دجاج مقلي', createdAt: new Date(Date.now() - 3400000) },
      ],
    });
  }

  // Auto replies
  await prisma.autoReply.createMany({
    data: [
      { businessId: restaurant.id, triggerKeywords: ['menu', 'قائمة', 'منيو'], triggerType: 'CONTAINS', responseAr: 'إليك قائمتنا! اكتب رقم الوجبة للطلب.', responseEn: 'Here is our menu! Type item number to order.', priority: 1 },
      { businessId: restaurant.id, triggerKeywords: ['hours', 'ساعات', 'مواعيد'], triggerType: 'CONTAINS', responseAr: 'نحن مفتوحون من 10 صباحاً إلى 12 منتصف الليل.', responseEn: 'We are open from 10 AM to 12 AM.', priority: 2 },
    ],
  });

  // Campaigns
  await prisma.campaign.create({
    data: {
      businessId: restaurant.id,
      name: 'Ramadan Special',
      type: 'Seasonal',
      message: 'خصم 20% على جميع الوجبات في رمضان! 🌙',
      status: 'COMPLETED',
      stats: { sent: 500, delivered: 480, read: 350 },
      sentAt: new Date(),
    },
  });

  // Promo codes
  await prisma.promoCode.create({
    data: { businessId: restaurant.id, code: 'WELCOME20', discountType: 'PERCENTAGE', discountValue: 20, maxUses: 100, usedCount: 23 },
  });

  // Loyalty rewards
  await prisma.loyaltyReward.createMany({
    data: [
      { businessId: restaurant.id, name: 'Free Drink', nameAr: 'مشروب مجاني', pointsRequired: 100, description: 'Get a free cola with any order' },
      { businessId: restaurant.id, name: '20% Off', nameAr: 'خصم 20%', pointsRequired: 500, description: '20% discount on next order' },
    ],
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { businessId: restaurant.id, userId: user.id, type: 'ORDER', title: 'New Order', message: 'Order #ORD-001 received from Fatima' },
      { businessId: restaurant.id, userId: user.id, type: 'MESSAGE', title: 'New Message', message: 'Mohammed sent a message' },
    ],
  });

  console.log('✅ Seed completed!');
  console.log('📧 Demo login: demo@saudichat.pro / +966501234567 / password123');
  console.log('🏢 Businesses: al-baik-demo, glamour-salon, care-clinic');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
