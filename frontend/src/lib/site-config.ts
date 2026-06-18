import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  Bot,
  ShoppingCart,
  Calendar,
  BarChart3,
  Megaphone,
  Plug,
  UtensilsCrossed,
  Scissors,
  Stethoscope,
  ShoppingBag,
  Dumbbell,
  Building2,
  BookOpen,
  FileText,
  HelpCircle,
  Users,
  Briefcase,
  Mail,
  Shield,
  Scale,
} from "lucide-react";

export type Localized = { en: string; ar: string };

export type NavItem = {
  href: string;
  title: Localized;
  description: Localized;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export type NavGroup = {
  label: Localized;
  items: NavItem[];
};

export type NavMenu = {
  id: string;
  label: Localized;
  href?: string;
  groups?: NavGroup[];
  items?: NavItem[];
};

export type PageContent = {
  slug: string;
  href: string;
  icon: LucideIcon;
  title: Localized;
  subtitle: Localized;
  description: Localized;
  benefits: { title: Localized; description: Localized }[];
  features: { title: Localized; description: Localized; imageSide?: "left" | "right" }[];
  steps: { title: Localized; description: Localized }[];
};

export const siteConfig = {
  name: "SaudiChat Pro",
  tagline: {
    en: "WhatsApp automation for Saudi SMEs",
    ar: "أتمتة واتساب للمنشآت السعودية",
  },
  email: "support@saudichat.pro",
  location: { en: "Riyadh, Saudi Arabia", ar: "الرياض، المملكة العربية السعودية" },
};

export const productChannels: NavGroup = {
  label: { en: "Channels", ar: "القنوات" },
  items: [
    {
      href: "/products/whatsapp",
      title: { en: "WhatsApp", ar: "واتساب" },
      description: {
        en: "Engage on the world's most-used messaging app",
        ar: "تواصل عبر أكثر تطبيق مراسلة استخداماً",
      },
      icon: MessageSquare,
    },
  ],
};

export const productApplications: NavGroup = {
  label: { en: "Applications", ar: "التطبيقات" },
  items: [
    {
      href: "/products/ai-bot",
      title: { en: "AI Chatbot", ar: "بوت ذكي" },
      description: { en: "Automate chats with AI-powered bots", ar: "أتمتة المحادثات ببوتات ذكية" },
      icon: Bot,
    },
    {
      href: "/products/orders",
      title: { en: "Orders", ar: "الطلبات" },
      description: { en: "Manage orders seamlessly via chat", ar: "إدارة الطلبات عبر المحادثة" },
      icon: ShoppingCart,
    },
    {
      href: "/products/appointments",
      title: { en: "Appointments", ar: "المواعيد" },
      description: { en: "Book and schedule services 24/7", ar: "حجز وجدولة الخدمات على مدار الساعة" },
      icon: Calendar,
    },
    {
      href: "/products/analytics",
      title: { en: "Analytics", ar: "التحليلات" },
      description: { en: "Real-time dashboard and reports", ar: "لوحة تحكم وتقارير فورية" },
      icon: BarChart3,
    },
    {
      href: "/products/marketing",
      title: { en: "Marketing", ar: "التسويق" },
      description: { en: "Launch and track WhatsApp campaigns", ar: "إطلاق وتتبع حملات واتساب" },
      icon: Megaphone,
    },
    {
      href: "/products/integrations",
      title: { en: "Integrations", ar: "التكاملات" },
      description: { en: "Connect SaudiChat to your tech stack", ar: "اربط SaudiChat بأنظمتك" },
      icon: Plug,
    },
  ],
};

export const solutionItems: NavItem[] = [
  {
    href: "/solutions/restaurant",
    title: { en: "Restaurant", ar: "مطعم" },
    description: { en: "Take orders and reservations via WhatsApp", ar: "استقبال الطلبات والحجوزات عبر واتساب" },
    icon: UtensilsCrossed,
  },
  {
    href: "/solutions/salon",
    title: { en: "Salon & Spa", ar: "صالون وسبا" },
    description: { en: "Automate bookings and reminders", ar: "أتمتة الحجوزات والتذكيرات" },
    icon: Scissors,
  },
  {
    href: "/solutions/clinic",
    title: { en: "Clinic", ar: "عيادة" },
    description: { en: "Patient scheduling and follow-ups", ar: "جدولة المرضى والمتابعات" },
    icon: Stethoscope,
  },
  {
    href: "/solutions/retail",
    title: { en: "Retail", ar: "تجزئة" },
    description: { en: "Sell products through WhatsApp catalog", ar: "بيع المنتجات عبر كتalog واتساب" },
    icon: ShoppingBag,
  },
  {
    href: "/solutions/manpower",
    title: { en: "Manpower & Workforce", ar: "القوى العاملة" },
    description: { en: "Owner, manager & staff in one window", ar: "المالك والمدير والموظفين في نافذة واحدة" },
    icon: Users,
  },
  {
    href: "/solutions/gym",
    title: { en: "Gym & Fitness", ar: "نادي رياضي" },
    description: { en: "Membership and class bookings", ar: "حجز العضويات والحصص" },
    icon: Dumbbell,
  },
  {
    href: "/solutions/real-estate",
    title: { en: "Real Estate", ar: "عقارات" },
    description: { en: "Lead capture and property inquiries", ar: "جمع العملاء المحتملين واستفسارات العقارات" },
    icon: Building2,
  },
];

export const resourceItems: NavItem[] = [
  {
    href: "/resources/docs",
    title: { en: "Documentation", ar: "التوثيق" },
    description: { en: "Getting started guides and tutorials", ar: "أدلة البدء والشروحات" },
    icon: BookOpen,
  },
  {
    href: "/resources/blog",
    title: { en: "Blog", ar: "المدونة" },
    description: { en: "Tips, updates, and best practices", ar: "نصائح وتحديثات وأفضل الممارسات" },
    icon: FileText,
  },
  {
    href: "/support",
    title: { en: "Help Center", ar: "مركز المساعدة" },
    description: { en: "FAQs and troubleshooting", ar: "الأسئلة الشائعة وحل المشكلات" },
    icon: HelpCircle,
  },
];

export const aboutItems: NavItem[] = [
  {
    href: "/about",
    title: { en: "About Us", ar: "من نحن" },
    description: { en: "Our mission and story", ar: "مهمتنا وقصتنا" },
    icon: Users,
  },
  {
    href: "/contact",
    title: { en: "Contact", ar: "تواصل معنا" },
    description: { en: "Get in touch with our team", ar: "تواصل مع فريقنا" },
    icon: Mail,
  },
  {
    href: "/demo",
    title: { en: "Book a Demo", ar: "احجز عرضاً" },
    description: { en: "See SaudiChat Pro in action", ar: "شاهد SaudiChat Pro عملياً" },
    icon: Briefcase,
  },
];

export const navMenus: NavMenu[] = [
  {
    id: "product",
    label: { en: "Product", ar: "المنتج" },
    groups: [productChannels, productApplications],
  },
  {
    id: "use-cases",
    label: { en: "Use Cases", ar: "حالات الاستخدام" },
    items: solutionItems,
  },
  {
    id: "templates",
    label: { en: "Templates", ar: "القوالب" },
    href: "/resources/blog",
  },
  {
    id: "pricing",
    label: { en: "Pricing", ar: "الأسعار" },
    href: "/pricing",
  },
  {
    id: "docs",
    label: { en: "Docs", ar: "التوثيق" },
    href: "/resources/docs",
  },
];

export const footerColumns = [
  {
    title: { en: "Products", ar: "المنتجات" },
    links: [
      ...productChannels.items,
      ...productApplications.items,
    ],
  },
  {
    title: { en: "Solutions", ar: "الحلول" },
    links: solutionItems,
  },
  {
    title: { en: "Resources", ar: "الموارد" },
    links: [
      ...resourceItems,
      {
        href: "/pricing",
        title: { en: "Pricing", ar: "الأسعار" },
        description: { en: "", ar: "" },
        icon: BarChart3,
      },
    ],
  },
  {
    title: { en: "Company", ar: "الشركة" },
    links: [
      ...aboutItems,
      {
        href: "/privacy",
        title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
        description: { en: "", ar: "" },
        icon: Shield,
      },
      {
        href: "/terms",
        title: { en: "Terms of Service", ar: "شروط الخدمة" },
        description: { en: "", ar: "" },
        icon: Scale,
      },
    ],
  },
];

export const pricingPlans = [
  {
    name: { en: "Starter", ar: "المبتدئ" },
    price: 299,
    popular: false,
    features: {
      en: ["1 WhatsApp Number", "1,000 Messages/mo", "Basic Bot", "Order Management"],
      ar: ["رقم واتساب واحد", "1000 رسالة/شهر", "بوت أساسي", "إدارة الطلبات"],
    },
  },
  {
    name: { en: "Business", ar: "الأعمال" },
    price: 599,
    popular: true,
    features: {
      en: ["3 WhatsApp Numbers", "10,000 Messages/mo", "AI Bot + GPT-4", "Analytics & Marketing"],
      ar: ["3 أرقام واتساب", "10000 رسالة/شهر", "بوت AI", "تحليلات وتسويق"],
    },
  },
  {
    name: { en: "Enterprise", ar: "المؤسسات" },
    price: 1499,
    popular: false,
    features: {
      en: ["Unlimited Numbers", "Unlimited Messages", "Custom AI", "Dedicated Support"],
      ar: ["أرقام غير محدودة", "رسائل غير محدودة", "AI مخصص", "دعم مخصص"],
    },
  },
];

export const productPages: PageContent[] = [
  {
    slug: "whatsapp",
    href: "/products/whatsapp",
    icon: MessageSquare,
    title: { en: "WhatsApp Business API", ar: "واجهة واتساب للأعمال" },
    subtitle: { en: "Official Meta WhatsApp integration for Saudi businesses", ar: "تكامل واتساب الرسمي من ميتا للمنشآت السعودية" },
    description: {
      en: "Connect your business number to Meta's official WhatsApp Business API. Send messages, receive orders, and automate customer conversations at scale.",
      ar: "اربط رقم منشأتك بواجهة واتساب للأعمال الرسمية من ميتا. أرسل الرسائل واستقبل الطلبات وأتمت محادثات العملاء.",
    },
    benefits: [
      { title: { en: "Official API", ar: "واجهة رسمية" }, description: { en: "Meta-verified WhatsApp Business API", ar: "واجهة واتساب للأعمال المعتمدة من ميتا" } },
      { title: { en: "Green Tick Ready", ar: "جاهز للعلامة الخضراء" }, description: { en: "Build trust with verified business profile", ar: "ابنِ الثقة بملف منشأة موثق" } },
      { title: { en: "High Deliverability", ar: "تسليم موثوق" }, description: { en: "Reliable message delivery at scale", ar: "تسليم رسائل موثوق على نطاق واسع" } },
    ],
    features: [
      { title: { en: "Two-Way Conversations", ar: "محادثات ثنائية" }, description: { en: "Customers message you on WhatsApp and your bot responds instantly with menus, catalogs, and order confirmations.", ar: "يراسل العملاء عبر واتساب ويرد البوت فوراً بالقوائم والكتalog وتأكيدات الطلب." }, imageSide: "right" },
      { title: { en: "Rich Media Messages", ar: "رسائل وسائط غنية" }, description: { en: "Send images, documents, buttons, and interactive lists to create engaging customer experiences.", ar: "أرسل الصور والمستندات والأزرار والقوائم التفاعلية لتجربة عملاء مميزة." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Connect Number", ar: "اربط الرقم" }, description: { en: "Link your WhatsApp Business number via Meta", ar: "اربط رقم واتساب للأعمال عبر ميتا" } },
      { title: { en: "Configure Webhook", ar: "إعداد Webhook" }, description: { en: "We handle the technical setup automatically", ar: "نتولى الإعداد التقني تلقائياً" } },
      { title: { en: "Go Live", ar: "انطلق" }, description: { en: "Start receiving messages in minutes", ar: "ابدأ استقبال الرسائل في دقائق" } },
    ],
  },
  {
    slug: "ai-bot",
    href: "/products/ai-bot",
    icon: Bot,
    title: { en: "AI Chatbot", ar: "بوت ذكي بالذكاء الاصطناعي" },
    subtitle: { en: "GPT-4 powered conversations in Arabic and English", ar: "محادثات GPT-4 بالعربية والإنجليزية" },
    description: {
      en: "Deploy an intelligent chatbot that understands natural language, handles orders, answers FAQs, and escalates to humans when needed.",
      ar: "انشر بوتاً ذكياً يفهم اللغة الطبيعية ويدير الطلبات ويجيب على الأسئلة ويحوّل للبشر عند الحاجة.",
    },
    benefits: [
      { title: { en: "Bilingual AI", ar: "ذكاء ثنائي اللغة" }, description: { en: "Fluent Arabic and English responses", ar: "ردود طلقة بالعربية والإنجليزية" } },
      { title: { en: "Context Aware", ar: "يفهم السياق" }, description: { en: "Remembers conversation history", ar: "يتذكر سياق المحادثة" } },
      { title: { en: "Custom Training", ar: "تدريب مخصص" }, description: { en: "Train on your menu, services, and policies", ar: "درّب على قائمتك وخدماتك وسياساتك" } },
    ],
    features: [
      { title: { en: "Natural Conversations", ar: "محادثات طبيعية" }, description: { en: "Customers chat naturally — no rigid command menus. The AI understands intent and responds appropriately.", ar: "يتواصل العملاء بشكل طبيعي دون قوائم أوامر جامدة. الذكاء الاصطناعي يفهم النية ويرد بشكل مناسب." }, imageSide: "right" },
      { title: { en: "Smart Handoff", ar: "تحويل ذكي" }, description: { en: "Automatically escalate complex queries to your staff with full conversation context.", ar: "حوّل الاستفسارات المعقدة تلقائياً لفريقك مع سياق المحادثة الكامل." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Define Persona", ar: "حدد شخصية البوت" }, description: { en: "Set tone, language, and business rules", ar: "حدد النبرة واللغة وقواعد العمل" } },
      { title: { en: "Upload Knowledge", ar: "ارفع المعرفة" }, description: { en: "Add menu, FAQ, and service details", ar: "أضف القائمة والأسئلة الشائعة" } },
      { title: { en: "Test & Launch", ar: "اختبر وانطلق" }, description: { en: "Preview conversations before going live", ar: "معاينة المحادثات قبل الإطلاق" } },
    ],
  },
  {
    slug: "orders",
    href: "/products/orders",
    icon: ShoppingCart,
    title: { en: "Order Management", ar: "إدارة الطلبات" },
    subtitle: { en: "Take and track orders directly in WhatsApp", ar: "استقبل وتتبع الطلبات مباشرة في واتساب" },
    description: {
      en: "Let customers browse your catalog, add items to cart, and confirm orders — all within WhatsApp chat. Real-time order tracking in your dashboard.",
      ar: "دع العملاء يتصفحون الكتalog ويضيفون للسلة ويؤكدون الطلب — كل ذلك في واتساب. تتبع فوري في لوحة التحكم.",
    },
    benefits: [
      { title: { en: "In-Chat Ordering", ar: "طلب داخل المحادثة" }, description: { en: "No app download required", ar: "بدون تحميل تطبيق" } },
      { title: { en: "Live Dashboard", ar: "لوحة مباشرة" }, description: { en: "See orders as they come in", ar: "شاهد الطلبات فور وصولها" } },
      { title: { en: "Status Updates", ar: "تحديثات الحالة" }, description: { en: "Auto-notify customers on order progress", ar: "إشعار العملاء بتقدم الطلب تلقائياً" } },
    ],
    features: [
      { title: { en: "WhatsApp Catalog", ar: "كتalog واتساب" }, description: { en: "Display products with images, prices, and descriptions. Customers tap to order.", ar: "اعرض المنتجات بالصور والأسعار. العملاء يضغطون للطلب." }, imageSide: "right" },
      { title: { en: "Order Workflow", ar: "سير عمل الطلب" }, description: { en: "Pending → Preparing → Ready → Delivered. Each step triggers a WhatsApp notification.", ar: "معلق → قيد التحضير → جاهز → تم التسليم. كل خطوة ترسل إشعار واتساب." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Build Catalog", ar: "أنشئ الكتalog" }, description: { en: "Add products with photos and prices", ar: "أضف المنتجات بالصور والأسعار" } },
      { title: { en: "Configure Flow", ar: "إعداد التدفق" }, description: { en: "Set delivery zones and payment options", ar: "حدد مناطق التوصيل وطرق الدفع" } },
      { title: { en: "Receive Orders", ar: "استقبل الطلبات" }, description: { en: "Manage from dashboard or mobile", ar: "أدر من اللوحة أو الجوال" } },
    ],
  },
  {
    slug: "appointments",
    href: "/products/appointments",
    icon: Calendar,
    title: { en: "Appointments & Booking", ar: "المواعيد والحجز" },
    subtitle: { en: "Automated scheduling for service businesses", ar: "جدولة آلية لمنشآت الخدمات" },
    description: {
      en: "Enable customers to book appointments, select services, choose staff, and receive reminders — all through WhatsApp.",
      ar: "مكّن العملاء من حجز المواعيد واختيار الخدمات والمو Staff واستلام التذكيرات — عبر واتساب.",
    },
    benefits: [
      { title: { en: "24/7 Booking", ar: "حجز 24/7" }, description: { en: "Customers book anytime", ar: "العملاء يحجزون في أي وقت" } },
      { title: { en: "Auto Reminders", ar: "تذكيرات تلقائية" }, description: { en: "Reduce no-shows with WhatsApp reminders", ar: "قلل الغياب بتذكيرات واتساب" } },
      { title: { en: "Staff Scheduling", ar: "جدولة المو Staff" }, description: { en: "Assign bookings to team members", ar: "عيّن الحجوزات لأعضاء الفريق" } },
    ],
    features: [
      { title: { en: "Service Selection", ar: "اختيار الخدمة" }, description: { en: "Customers pick services, date, time, and preferred staff member in a guided chat flow.", ar: "يختار العملاء الخدمة والتاريخ والوقت والمو Staff المفضل في محادثة موجهة." }, imageSide: "right" },
      { title: { en: "Calendar Sync", ar: "مزامنة التقويم" }, description: { en: "View all appointments in dashboard calendar with conflict detection.", ar: "اعرض جميع المواعيد في تقويم اللوحة مع كشف التعارض." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Add Services", ar: "أضف الخدمات" }, description: { en: "Define services, duration, and pricing", ar: "حدد الخدمات والمدة والأسعار" } },
      { title: { en: "Set Availability", ar: "حدد التوفر" }, description: { en: "Configure working hours and staff", ar: "اضبط ساعات العمل والمو Staff" } },
      { title: { en: "Accept Bookings", ar: "استقبل الحجوزات" }, description: { en: "Customers book via WhatsApp automatically", ar: "العملاء يحجزون عبر واتساب تلقائياً" } },
    ],
  },
  {
    slug: "analytics",
    href: "/products/analytics",
    icon: BarChart3,
    title: { en: "Analytics & Reports", ar: "التحليلات والتقارير" },
    subtitle: { en: "Data-driven insights for your WhatsApp business", ar: "رؤى مبنية على البيانات لأعمال واتساب" },
    description: {
      en: "Track messages, orders, revenue, customer satisfaction, and bot performance with real-time dashboards and exportable reports.",
      ar: "تتبع الرسائل والطلبات والإيرادات ورضا العملاء وأداء البوت بلوحات فورية وتقارير قابلة للتصدير.",
    },
    benefits: [
      { title: { en: "Real-Time Data", ar: "بيانات فورية" }, description: { en: "Live metrics as they happen", ar: "مقاييس مباشرة لحظة بلحظة" } },
      { title: { en: "Revenue Tracking", ar: "تتبع الإيرادات" }, description: { en: "See daily, weekly, monthly revenue", ar: "إيرادات يومية وأسبوعية وشهرية" } },
      { title: { en: "Export Reports", ar: "تصدير التقارير" }, description: { en: "Download CSV and PDF reports", ar: "تحميل تقارير CSV و PDF" } },
    ],
    features: [
      { title: { en: "Business Dashboard", ar: "لوحة الأعمال" }, description: { en: "Overview of orders, messages, customers, and revenue with trend charts.", ar: "نظرة على الطلبات والرسائل والعملاء والإيرادات مع رسوم الاتجاه." }, imageSide: "right" },
      { title: { en: "Bot Analytics", ar: "تحليلات البوت" }, description: { en: "Track bot resolution rate, handoff rate, and popular queries.", ar: "تتبع معدل حل البوت والتحويل والاستفسارات الشائعة." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Connect Data", ar: "اربط البيانات" }, description: { en: "Analytics start automatically", ar: "التحليلات تبدأ تلقائياً" } },
      { title: { en: "View Dashboard", ar: "اعرض اللوحة" }, description: { en: "Explore metrics and trends", ar: "استكشف المقاييس والاتجاهات" } },
      { title: { en: "Export & Share", ar: "صدّر وشارك" }, description: { en: "Download reports for your team", ar: "حمّل التقارير لفريقك" } },
    ],
  },
  {
    slug: "marketing",
    href: "/products/marketing",
    icon: Megaphone,
    title: { en: "Marketing Campaigns", ar: "حملات تسويقية" },
    subtitle: { en: "Reach customers with WhatsApp broadcasts", ar: "تواصل مع العملاء عبر بث واتساب" },
    description: {
      en: "Send promotional messages, offers, and updates to your customer base with segmentation, scheduling, and delivery tracking.",
      ar: "أرسل رسائل ترويجية وعروض وتحديثات لقاعدة عملائك مع التقسيم والجدولة وتتبع التسليم.",
    },
    benefits: [
      { title: { en: "Broadcast Messages", ar: "رسائل جماعية" }, description: { en: "Reach thousands at once", ar: "تواصل مع آلاف دفعة واحدة" } },
      { title: { en: "Segmentation", ar: "تقسيم العملاء" }, description: { en: "Target by behavior and history", ar: "استهدف حسب السلوك والسجل" } },
      { title: { en: "Template Messages", ar: "قوالب رسائل" }, description: { en: "Meta-approved message templates", ar: "قوالب معتمدة من ميتا" } },
    ],
    features: [
      { title: { en: "Campaign Builder", ar: "منشئ الحملات" }, description: { en: "Create campaigns with templates, audience selection, and scheduled delivery.", ar: "أنشئ حملات بقوالب واختيار الجمهور وجدولة الإرسال." }, imageSide: "right" },
      { title: { en: "Delivery Analytics", ar: "تحليلات التسليم" }, description: { en: "Track sent, delivered, read, and replied rates for every campaign.", ar: "تتبع الإرسال والتسليم والقراءة والرد لكل حملة." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Build Audience", ar: "ابنِ الجمهور" }, description: { en: "Import or segment customers", ar: "استورد أو قسّم العملاء" } },
      { title: { en: "Create Campaign", ar: "أنشئ الحملة" }, description: { en: "Design message with template", ar: "صمم الرسالة بقالب" } },
      { title: { en: "Send & Track", ar: "أرسل وتتبع" }, description: { en: "Schedule and monitor results", ar: "جدول وراقب النتائج" } },
    ],
  },
  {
    slug: "integrations",
    href: "/products/integrations",
    icon: Plug,
    title: { en: "Integrations", ar: "التكاملات" },
    subtitle: { en: "Connect SaudiChat to your existing tools", ar: "اربط SaudiChat بأدواتك الحالية" },
    description: {
      en: "Integrate with payment gateways, CRM systems, inventory tools, and custom APIs to build a complete business workflow.",
      ar: "تكامل مع بوابات الدفع وأنظمة CRM وأدوات المخزون وواجهات API مخصصة لبناء سير عمل متكامل.",
    },
    benefits: [
      { title: { en: "REST API", ar: "REST API" }, description: { en: "Full API access for developers", ar: "وصول API كامل للمطورين" } },
      { title: { en: "Webhooks", ar: "Webhooks" }, description: { en: "Real-time event notifications", ar: "إشعارات أحداث فورية" } },
      { title: { en: "Payment Gateways", ar: "بوابات الدفع" }, description: { en: "Moyasar, Stripe, and more", ar: "Moyasar و Stripe والمزيد" } },
    ],
    features: [
      { title: { en: "Developer API", ar: "API للمطورين" }, description: { en: "Documented REST API with authentication, rate limits, and webhook support.", ar: "REST API موثق مع مصادقة وحدود معدل ودعم Webhooks." }, imageSide: "right" },
      { title: { en: "Third-Party Connectors", ar: "موصلات خارجية" }, description: { en: "Connect to popular Saudi and global business tools.", ar: "اربط بأدوات الأعمال السعودية والعالمية." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Get API Keys", ar: "احصل على مفاتيح API" }, description: { en: "Generate from dashboard settings", ar: "أنشئ من إعدادات اللوحة" } },
      { title: { en: "Configure Webhooks", ar: "إعداد Webhooks" }, description: { en: "Set up event endpoints", ar: "اضبط نقاط نهاية الأحداث" } },
      { title: { en: "Go Production", ar: "انطلق للإنتاج" }, description: { en: "Test in sandbox then deploy", ar: "اختبر في Sandbox ثم انشر" } },
    ],
  },
];

export const solutionPages: PageContent[] = [
  {
    slug: "restaurant",
    href: "/solutions/restaurant",
    icon: UtensilsCrossed,
    title: { en: "WhatsApp for Restaurants", ar: "واتساب للمطاعم" },
    subtitle: { en: "Take orders, reservations, and delivery via WhatsApp", ar: "استقبل الطلبات والحجوزات والتوصيل عبر واتساب" },
    description: {
      en: "Let customers browse your menu, place orders, track delivery, and make reservations — all through WhatsApp without downloading any app.",
      ar: "دع العملاء يتصفحون القائمة ويطلبون ويتتبعون التوصيل ويحجزون — عبر واتساب بدون تحميل أي تطبيق.",
    },
    benefits: [
      { title: { en: "Digital Menu", ar: "قائمة رقمية" }, description: { en: "Interactive menu with photos", ar: "قائمة تفاعلية بالصور" } },
      { title: { en: "Delivery Tracking", ar: "تتبع التوصيل" }, description: { en: "Real-time order status updates", ar: "تحديثات حالة الطلب فورية" } },
      { title: { en: "Table Booking", ar: "حجز طاولات" }, description: { en: "Automated reservation system", ar: "نظام حجز آلي" } },
    ],
    features: [
      { title: { en: "Order Flow", ar: "تدفق الطلب" }, description: { en: "Customer selects items, confirms address, pays, and receives live updates until delivery.", ar: "يختار العميل الأصناف ويؤكد العنوان ويدفع ويستلم تحديثات حتى التوصيل." }, imageSide: "right" },
      { title: { en: "Kitchen Dashboard", ar: "لوحة المطبخ" }, description: { en: "Staff see incoming orders in real-time with preparation timers.", ar: "يرى المو Staff الطلبات الواردة فوراً مع مؤقتات التحضير." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Upload Menu", ar: "ارفع القائمة" }, description: { en: "Add dishes with photos and prices", ar: "أضف الأطباق بالصور والأسعار" } },
      { title: { en: "Set Delivery", ar: "حدد التوصيل" }, description: { en: "Configure zones and fees", ar: "اضبط المناطق والرسوم" } },
      { title: { en: "Start Taking Orders", ar: "ابدأ استقبال الطلبات" }, description: { en: "Share WhatsApp link with customers", ar: "شارك رابط واتساب مع العملاء" } },
    ],
  },
  {
    slug: "salon",
    href: "/solutions/salon",
    icon: Scissors,
    title: { en: "WhatsApp for Salons & Spas", ar: "واتساب للصالونات والسبا" },
    subtitle: { en: "Automate bookings and client communication", ar: "أتمتة الحجوزات والتواصل مع العملاء" },
    description: {
      en: "Enable clients to book services, choose stylists, and receive appointment reminders through WhatsApp.",
      ar: "مكّن العملاء من حجز الخدمات واختيار المصففين واستلام تذكيرات المواعيد عبر واتساب.",
    },
    benefits: [
      { title: { en: "Online Booking", ar: "حجز أونلاين" }, description: { en: "24/7 appointment scheduling", ar: "جدولة مواعيد 24/7" } },
      { title: { en: "Stylist Selection", ar: "اختيار المصفف" }, description: { en: "Clients pick their preferred stylist", ar: "العملاء يختارون المصفف المفضل" } },
      { title: { en: "Reminder Messages", ar: "رسائل تذكير" }, description: { en: "Reduce no-shows automatically", ar: "قلل الغياب تلقائياً" } },
    ],
    features: [
      { title: { en: "Service Menu", ar: "قائمة الخدمات" }, description: { en: "Display services with duration, price, and available stylists.", ar: "اعرض الخدمات بالمدة والسعر والمصففين المتاحين." }, imageSide: "right" },
      { title: { en: "Client History", ar: "سجل العميل" }, description: { en: "Track past visits, preferences, and notes for personalized service.", ar: "تتبع الزيارات السابقة والتفضيلات للخدمة المخصصة." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Add Services", ar: "أضف الخدمات" }, description: { en: "Define treatments and pricing", ar: "حدد العلاجات والأسعار" } },
      { title: { en: "Set Schedule", ar: "حدد الجدول" }, description: { en: "Configure stylist availability", ar: "اضبط توفر المصففين" } },
      { title: { en: "Share Booking Link", ar: "شارك رابط الحجز" }, description: { en: "Clients book via WhatsApp", ar: "العملاء يحجزون عبر واتساب" } },
    ],
  },
  {
    slug: "clinic",
    href: "/solutions/clinic",
    icon: Stethoscope,
    title: { en: "WhatsApp for Clinics", ar: "واتساب للعيادات" },
    subtitle: { en: "Patient scheduling and follow-up automation", ar: "جدولة المرضى وأتمتة المتابعة" },
    description: {
      en: "Streamline patient appointments, send reminders, share test results, and handle inquiries through secure WhatsApp communication.",
      ar: "بسّط مواعيد المرضى وأرسل التذكيرات وشارك النتائج وعالج الاستفسارات عبر واتساب آمن.",
    },
    benefits: [
      { title: { en: "Appointment Booking", ar: "حجز المواعيد" }, description: { en: "Patients book online anytime", ar: "المرضى يحجزون في أي وقت" } },
      { title: { en: "Follow-Up Messages", ar: "رسائل متابعة" }, description: { en: "Automated post-visit check-ins", ar: "متابعة آلية بعد الزيارة" } },
      { title: { en: "FAQ Bot", ar: "بوت أسئلة شائعة" }, description: { en: "Answer common health queries", ar: "أجب على الاستفسارات الصحية الشائعة" } },
    ],
    features: [
      { title: { en: "Doctor Scheduling", ar: "جدولة الأطباء" }, description: { en: "Manage multiple doctors with individual calendars and specialties.", ar: "أدر أطباء متعددين بتقويمات وتخصصات فردية." }, imageSide: "right" },
      { title: { en: "Patient Records", ar: "سجل المرضى" }, description: { en: "Track visit history and communication in one dashboard.", ar: "تتبع سجل الزيارات والتواصل في لوحة واحدة." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Setup Doctors", ar: "إعداد الأطباء" }, description: { en: "Add doctors and specialties", ar: "أضف الأطباء والتخصصات" } },
      { title: { en: "Configure Bot", ar: "إعداد البوت" }, description: { en: "Set FAQ and booking flow", ar: "حدد الأسئلة الشائعة وتدفق الحجز" } },
      { title: { en: "Go Live", ar: "انطلق" }, description: { en: "Patients book via WhatsApp", ar: "المرضى يحجزون عبر واتساب" } },
    ],
  },
  {
    slug: "retail",
    href: "/solutions/retail",
    icon: ShoppingBag,
    title: { en: "WhatsApp for Retail", ar: "واتساب للتجزئة" },
    subtitle: { en: "Sell products through WhatsApp catalog", ar: "بيع المنتجات عبر كتalog واتساب" },
    description: {
      en: "Showcase products, handle inquiries, process orders, and manage inventory — turning WhatsApp into your online storefront.",
      ar: "اعرض المنتجات وعالج الاستفسارات ونفّذ الطلبات وأدر المخزون — حوّل واتساب إلى متجرك الإلكتروني.",
    },
    benefits: [
      { title: { en: "Product Catalog", ar: "كتalog منتجات" }, description: { en: "Beautiful product showcase", ar: "عرض منتجات جذاب" } },
      { title: { en: "Instant Checkout", ar: "دفع فوري" }, description: { en: "Order in chat, pay via link", ar: "اطلب في المحادثة وادفع عبر رابط" } },
      { title: { en: "Stock Alerts", ar: "تنبيهات المخزون" }, description: { en: "Low stock notifications", ar: "إشعارات نقص المخزون" } },
    ],
    features: [
      { title: { en: "Catalog Browsing", ar: "تصفح الكتalog" }, description: { en: "Customers browse categories, view details, and add to cart in WhatsApp.", ar: "يتصفح العملاء الفئات ويعرضون التفاصيل ويضيفون للسلة." }, imageSide: "right" },
      { title: { en: "Order Management", ar: "إدارة الطلبات" }, description: { en: "Track orders from placement to delivery with status notifications.", ar: "تتبع الطلبات من الطلب إلى التسليم مع إشعارات الحالة." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Upload Products", ar: "ارفع المنتجات" }, description: { en: "Add inventory with photos", ar: "أضف المخزون بالصور" } },
      { title: { en: "Configure Store", ar: "إعداد المتجر" }, description: { en: "Set categories and shipping", ar: "حدد الفئات والشحن" } },
      { title: { en: "Share Store Link", ar: "شارك رابط المتجر" }, description: { en: "Customers shop via WhatsApp", ar: "العملاء يتسوقون عبر واتساب" } },
    ],
  },
  {
    slug: "gym",
    href: "/solutions/gym",
    icon: Dumbbell,
    title: { en: "WhatsApp for Gyms", ar: "واتساب للنوادي الرياضية" },
    subtitle: { en: "Membership management and class bookings", ar: "إدارة العضويات وحجز الحصص" },
    description: {
      en: "Manage memberships, class schedules, personal training bookings, and member communication through WhatsApp automation.",
      ar: "أدر العضويات وجداول الحصص وحجوزات التدريب الشخصي وتواصل الأعضاء عبر أتمتة واتساب.",
    },
    benefits: [
      { title: { en: "Class Booking", ar: "حجز الحصص" }, description: { en: "Members book classes via chat", ar: "الأعضاء يحجزون الحصص عبر المحادثة" } },
      { title: { en: "Membership Renewals", ar: "تجديد العضويات" }, description: { en: "Automated renewal reminders", ar: "تذكيرات تجديد آلية" } },
      { title: { en: "Trainer Scheduling", ar: "جدولة المدربين" }, description: { en: "PT session bookings", ar: "حجز جلسات التدريب الشخصي" } },
    ],
    features: [
      { title: { en: "Class Schedule", ar: "جدول الحصص" }, description: { en: "Display available classes with capacity and trainer info.", ar: "اعرض الحصص المتاحة بالسعة ومعلومات المدرب." }, imageSide: "right" },
      { title: { en: "Member Portal", ar: "بوابة الأعضاء" }, description: { en: "Members check membership status, book sessions, and get updates.", ar: "الأعضاء يتحققون من العضوية ويحجزون ويستلمون التحديثات." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Setup Classes", ar: "إعداد الحصص" }, description: { en: "Define schedule and trainers", ar: "حدد الجدول والمدربين" } },
      { title: { en: "Import Members", ar: "استورد الأعضاء" }, description: { en: "Add existing member database", ar: "أضف قاعدة الأعضاء الحالية" } },
      { title: { en: "Launch Bot", ar: "أطلق البوت" }, description: { en: "Members interact via WhatsApp", ar: "الأعضاء يتفاعلون عبر واتساب" } },
    ],
  },
  {
    slug: "real-estate",
    href: "/solutions/real-estate",
    icon: Building2,
    title: { en: "WhatsApp for Real Estate", ar: "واتساب للعقارات" },
    subtitle: { en: "Lead capture and property inquiries", ar: "جمع العملاء المحتملين واستفسارات العقارات" },
    description: {
      en: "Capture leads, share property listings, schedule viewings, and nurture prospects through automated WhatsApp conversations.",
      ar: "اجمع العملاء المحتملين وشارك قوائم العقارات وحدد مواعيد المعاينة وتابع العملاء عبر محادثات واتساب آلية.",
    },
    benefits: [
      { title: { en: "Lead Capture", ar: "جمع العملاء" }, description: { en: "Auto-qualify incoming leads", ar: "تأهيل العملاء الواردين تلقائياً" } },
      { title: { en: "Property Listings", ar: "قوائم العقارات" }, description: { en: "Share listings with photos", ar: "شارك القوائم بالصور" } },
      { title: { en: "Viewing Scheduler", ar: "جدولة المعاينات" }, description: { en: "Book property viewings", ar: "حجز معاينات العقارات" } },
    ],
    features: [
      { title: { en: "Property Search", ar: "بحث العقارات" }, description: { en: "Prospects search by location, type, and budget through guided chat.", ar: "يبحث العملاء حسب الموقع والنوع والميزانية عبر محادثة موجهة." }, imageSide: "right" },
      { title: { en: "Agent Handoff", ar: "تحويل للوكيل" }, description: { en: "Qualified leads are routed to the right agent instantly.", ar: "يُحوَّل العملاء المؤهلون للوكيل المناسب فوراً." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Add Listings", ar: "أضف القوائم" }, description: { en: "Upload properties with details", ar: "ارفع العقارات بالتفاصيل" } },
      { title: { en: "Configure Bot", ar: "إعداد البوت" }, description: { en: "Set qualification questions", ar: "حدد أسئلة التأهيل" } },
      { title: { en: "Capture Leads", ar: "اجمع العملاء" }, description: { en: "Prospects inquire via WhatsApp", ar: "العملاء يستفسرون عبر واتساب" } },
    ],
  },
  {
    slug: "manpower",
    href: "/solutions/manpower",
    icon: Users,
    title: { en: "Workforce & Manpower Hub", ar: "مركز القوى العاملة" },
    subtitle: { en: "Owner, manager & staff — one connected window", ar: "المالك والمدير والموظفين — نافذة واحدة متصلة" },
    description: {
      en: "Manage your entire team from one platform. Invite managers and staff, assign shifts, track attendance, and connect everyone to the owner — with role-based dashboards for each level.",
      ar: "أدر فريقك بالكامل من منصة واحدة. ادعُ المديرين والموظفين، عيّن الورديات، تتبع الحضور، واربط الجميع بالمالك — مع لوحات حسب الدور.",
    },
    benefits: [
      { title: { en: "Team Hierarchy", ar: "هيكل الفريق" }, description: { en: "Owner → Manager → Staff connected", ar: "المالك → المدير → المو Staff متصلون" } },
      { title: { en: "Shift Scheduling", ar: "جدولة الورديات" }, description: { en: "Create and assign work schedules", ar: "أنشئ وعيّن جداول العمل" } },
      { title: { en: "Attendance Tracking", ar: "تتبع الحضور" }, description: { en: "Check-in/out with reports", ar: "تسجيل حضور/انصراف مع تقارير" } },
    ],
    features: [
      { title: { en: "Workforce Hub", ar: "مركز الفريق" }, description: { en: "See your full team tree, departments, and performance in one dashboard.", ar: "شاهد شجرة فريقك الكاملة والأقسام والأداء في لوحة واحدة." }, imageSide: "right" },
      { title: { en: "Role Dashboards", ar: "لوحات حسب الدور" }, description: { en: "Owners see everything, managers see their team, staff see assigned work only.", ar: "المالك يرى الكل، المدير يرى فريقه، المو Staff يرى مهامه فقط." }, imageSide: "left" },
    ],
    steps: [
      { title: { en: "Invite Team", ar: "ادعُ الفريق" }, description: { en: "Add managers and staff with roles", ar: "أضف المديرين والمو Staff بالأدوار" } },
      { title: { en: "Set Schedules", ar: "حدد الجداول" }, description: { en: "Create shifts and assign work", ar: "أنشئ الورديات وعيّن العمل" } },
      { title: { en: "Track & Manage", ar: "تتبع وأدر" }, description: { en: "Monitor attendance and tasks live", ar: "راقب الحضور والمهام مباشرة" } },
    ],
  },
];

export function getProductPage(slug: string) {
  return productPages.find((p) => p.slug === slug);
}

export function getSolutionPage(slug: string) {
  return solutionPages.find((p) => p.slug === slug);
}

export function loc(text: Localized, locale: "en" | "ar") {
  return text[locale];
}
