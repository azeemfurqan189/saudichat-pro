import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Package,
  Users,
  UserCheck,
  Megaphone,
  MessageSquare,
  UserCog,
  BarChart3,
  Settings,
  CreditCard,
  Bot,
  GitBranch,
  Play,
  AlertTriangle,
  CheckSquare,
  Workflow,
  Warehouse,
  UserPlus,
  Star,
  Inbox,
  Sparkles,
  Truck,
  Building2,
  Code2,
  UtensilsCrossed,
  Scissors,
  Stethoscope,
  Store,
  Home,
  BedDouble,
  Bell,
  GraduationCap,
  Wrench,
  CalendarRange,
  Component,
  Gauge,
  Activity,
  Radio,
  LucideIcon,
  HardHat,
  Briefcase,
  ClipboardList,
  MapPin,
  RotateCw,
  Boxes,
  ShoppingCart,
  Factory,
  Shield,
  ShieldCheck,
  PanelLeft,
  CircleDollarSign,
  HelpCircle,
} from "lucide-react";

export type BusinessType =
  | "RESTAURANT"
  | "CAFE"
  | "RETAIL"
  | "SALON"
  | "CLINIC"
  | "GYM"
  | "REAL_ESTATE"
  | "HOTEL"
  | "LOGISTICS"
  | "EDUCATION"
  | "CAR_WORKSHOP"
  | "MANPOWER"
  | "AUTOMOTIVE"
  | "CUSTOM";

export type NavKey =
  | "overview"
  | "aiBot"
  | "orders"
  | "appointments"
  | "catalog"
  | "customers"
  | "pipeline"
  | "tasks"
  | "workflows"
  | "inventory"
  | "leads"
  | "reviews"
  | "inbox"
  | "advisor"
  | "deliveries"
  | "suppliers"
  | "developers"
  | "properties"
  | "hotel"
  | "logistics"
  | "courses"
  | "workshop"
  | "marketing"
  | "conversations"
  | "staff"
  | "workforce"
  | "schedule"
  | "attendance"
  | "hrIntegration"
  | "myWork"
  | "clients"
  | "projects"
  | "workers"
  | "placements"
  | "timesheets"
  | "equipment"
  | "assets"
  | "cmmsHub"
  | "locations"
  | "workRequests"
  | "workOrders"
  | "workPlanner"
  | "projectPlanning"
  | "planningHub"
  | "planningSimulation"
  | "planningRisk"
  | "preventiveMaintenance"
  | "spares"
  | "procurement"
  | "cmmsFinance"
  | "cmmsAiEngine"
  | "notificationCenter"
  | "cmmsSecurity"
  | "assetReliability"
  | "iotMonitoring"
  | "calibration"
  | "subcontractors"
  | "projectAccess"
  | "commandCenter"
  | "manpowerLive"
  | "manpowerPolicy"
  | "analytics"
  | "settings"
  | "billing"
  | "help";

export type IndustryCategory =
  | "food"
  | "service"
  | "retail"
  | "realestate"
  | "hotel"
  | "logistics"
  | "education"
  | "automotive"
  | "manpower"
  | "general";

export type MemberRole = "OWNER" | "MANAGER" | "OFFICE_STAFF" | "FIELD_WORKER";

const FOOD_TYPES: BusinessType[] = ["RESTAURANT", "CAFE"];
const SERVICE_TYPES: BusinessType[] = ["SALON", "CLINIC", "GYM"];
const RETAIL_TYPES: BusinessType[] = ["RETAIL"];

const TYPE_ALIASES: Record<string, BusinessType> = {
  AUTOMOTIVE: "CAR_WORKSHOP",
  CAR_WORKSHOP: "CAR_WORKSHOP",
};

export function normalizeBusinessType(type?: string | null): BusinessType {
  const raw = (type || "RESTAURANT").toUpperCase();
  if (TYPE_ALIASES[raw]) return TYPE_ALIASES[raw];
  return raw as BusinessType;
}

export function getIndustryCategory(type: BusinessType): IndustryCategory {
  const t = normalizeBusinessType(type);
  if (FOOD_TYPES.includes(t)) return "food";
  if (SERVICE_TYPES.includes(t)) return "service";
  if (RETAIL_TYPES.includes(t)) return "retail";
  if (t === "REAL_ESTATE") return "realestate";
  if (t === "HOTEL") return "hotel";
  if (t === "LOGISTICS") return "logistics";
  if (t === "EDUCATION") return "education";
  if (t === "CAR_WORKSHOP") return "automotive";
  if (t === "MANPOWER") return "manpower";
  return "general";
}

export function getIndustryLabel(type: BusinessType, locale: "en" | "ar" = "en"): string {
  const t = normalizeBusinessType(type);
  const labels: Record<string, { en: string; ar: string }> = {
    RESTAURANT: { en: "Restaurant", ar: "مطعم" },
    CAFE: { en: "Café", ar: "مقهى" },
    RETAIL: { en: "Retail Store", ar: "متجر" },
    SALON: { en: "Salon & Beauty", ar: "صالون وتجميل" },
    CLINIC: { en: "Clinic & Healthcare", ar: "عيادة ورعاية صحية" },
    GYM: { en: "Gym & Fitness", ar: "نادي رياضي" },
    REAL_ESTATE: { en: "Real Estate", ar: "عقارات" },
    HOTEL: { en: "Hotel & Hospitality", ar: "فندق وضيافة" },
    LOGISTICS: { en: "Logistics & Shipping", ar: "لوجستيات وشحن" },
    EDUCATION: { en: "Education & Training", ar: "تعليم وتدريب" },
    CAR_WORKSHOP: { en: "Automotive Workshop", ar: "ورشة سيارات" },
    MANPOWER: { en: "Manpower Agency", ar: "وكالة manpower" },
    CUSTOM: { en: "Business", ar: "منشأة" },
  };
  return locale === "ar" ? labels[t]?.ar ?? labels.CUSTOM.ar : labels[t]?.en ?? labels.CUSTOM.en;
}

export function getProfileTabLabel(type: BusinessType, locale: "en" | "ar" = "en"): string {
  const cat = getIndustryCategory(type);
  if (locale === "ar") {
    const ar: Record<IndustryCategory, string> = {
      food: "ملف المطعم",
      service: "ملف الصالون/العيادة",
      retail: "ملف المتجر",
      realestate: "ملف الوكالة العقارية",
      hotel: "ملف الفندق",
      logistics: "ملف شركة الشحن",
      education: "ملف المعهد",
      automotive: "ملف الورشة",
      manpower: "ملف الوكالة",
      general: "ملف المنشأة",
    };
    return ar[cat];
  }
  const en: Record<IndustryCategory, string> = {
    food: "Restaurant Profile",
    service: "Salon / Clinic Profile",
    retail: "Store Profile",
    realestate: "Agency Profile",
    hotel: "Hotel Profile",
    logistics: "Logistics Profile",
    education: "Institute Profile",
    automotive: "Workshop Profile",
    manpower: "Agency Profile",
    general: "Business Profile",
  };
  return en[cat];
}

const CORE_NAV: NavKey[] = [
  "overview", "aiBot", "inbox", "conversations", "customers", "leads",
  "pipeline", "tasks", "workflows", "marketing", "reviews", "advisor",
  "staff", "analytics", "developers", "help", "settings", "billing",
];

/** Sidebar items visible per industry */
export function getNavItemsForType(type: BusinessType): NavKey[] {
  const cat = getIndustryCategory(type);

  if (cat === "food" || cat === "retail") {
    return [
      "overview", "aiBot", "inbox", "orders", "deliveries", "catalog", "inventory",
      "suppliers", "customers", "leads", "pipeline", "tasks", "workflows",
      "conversations", "marketing", "reviews", "advisor", "staff", "analytics",
      "developers", "help", "settings", "billing",
    ];
  }
  if (cat === "service") {
    return [
      "overview", "aiBot", "inbox", "appointments", "catalog", "customers", "leads",
      "pipeline", "tasks", "workflows", "conversations", "marketing", "reviews",
      "advisor", "staff", "analytics", "help", "settings", "billing",
    ];
  }
  if (cat === "realestate") {
    return ["overview", "aiBot", "inbox", "properties", "catalog", ...CORE_NAV.filter((k) => k !== "developers"), "developers"];
  }
  if (cat === "hotel") {
    return ["overview", "aiBot", "inbox", "hotel", "catalog", ...CORE_NAV];
  }
  if (cat === "logistics") {
    return ["overview", "aiBot", "inbox", "logistics", "deliveries", ...CORE_NAV];
  }
  if (cat === "education") {
    return ["overview", "aiBot", "inbox", "courses", "catalog", ...CORE_NAV.filter((k) => k !== "staff"), "staff"];
  }
  if (cat === "automotive") {
    return ["overview", "aiBot", "inbox", "workshop", "catalog", "inventory", ...CORE_NAV];
  }
  if (cat === "manpower") {
    return [
      "overview",
      "commandCenter",
      "myWork",
      "clients",
      "projects",
      "equipment",
      "assets",
      "cmmsHub",
      "locations",
      "workRequests",
      "workOrders",
      "workPlanner",
      "preventiveMaintenance",
      "assetReliability",
      "iotMonitoring",
      "calibration",
      "planningHub",
      "projectPlanning",
      "planningSimulation",
      "planningRisk",
      "spares",
      "procurement",
      "cmmsFinance",
      "cmmsAiEngine",
      "notificationCenter",
      "cmmsSecurity",
      "subcontractors",
      "suppliers",
      "workers",
      "placements",
      "timesheets",
      "manpowerLive",
      "schedule",
      "attendance",
      "hrIntegration",
      "projectAccess",
      "manpowerPolicy",
      "inbox",
      "tasks",
      "staff",
      "help",
      "settings",
      "billing",
    ];
  }

  return ["overview", "aiBot", "inbox", "conversations", "customers", "leads", "pipeline", "tasks", "workflows", "catalog", "marketing", "reviews", "advisor", "analytics", "help", "settings", "staff", "billing"];
}

const WORKFORCE_NAV: NavKey[] = ["workforce", "schedule", "attendance", "myWork"];

export function getNavItemsForRole(role: MemberRole, type: BusinessType): NavKey[] {
  const industryNav = getNavItemsForType(type);
  const cat = getIndustryCategory(normalizeBusinessType(type));
  const withWorkforce =
    cat === "manpower"
      ? industryNav
      : Array.from(new Set([...industryNav, ...WORKFORCE_NAV]));

  if (role === "OWNER") {
    return withWorkforce;
  }
  if (role === "MANAGER") {
    return withWorkforce.filter((k) => k !== "billing" && k !== "developers" && k !== "projectAccess" && k !== "manpowerPolicy");
  }
  if (role === "OFFICE_STAFF") {
    if (cat === "manpower") {
      return [
        "myWork",
        "workRequests",
        "workOrders",
        "workPlanner",
        "preventiveMaintenance",
        "assets",
        "locations",
        "equipment",
        "spares",
        "projects",
        "timesheets",
        "inbox",
        "tasks",
        "help",
      ];
    }
    return ["myWork", "projects", "inbox", "conversations", "tasks", "schedule", "attendance", "timesheets", "customers", "leads", "help"];
  }
  if (cat === "manpower") {
    return ["myWork", "workRequests", "workOrders", "assets", "equipment", "projects", "timesheets", "tasks", "help"];
  }
  return ["myWork", "deliveries", "schedule", "attendance", "tasks", "help"];
}

export function getDefaultDashboardPath(role: MemberRole, businessId: string): string {
  if (role === "OFFICE_STAFF" || role === "FIELD_WORKER") {
    return `/dashboard/${businessId}/my-work`;
  }
  return `/dashboard/${businessId}`;
}

export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  overview: LayoutDashboard,
  aiBot: Bot,
  orders: ShoppingBag,
  appointments: Calendar,
  catalog: Package,
  customers: Users,
  pipeline: GitBranch,
  tasks: CheckSquare,
  workflows: Workflow,
  inventory: Warehouse,
  leads: UserPlus,
  reviews: Star,
  inbox: Inbox,
  advisor: Sparkles,
  deliveries: Truck,
  suppliers: Building2,
  developers: Code2,
  properties: Home,
  hotel: BedDouble,
  logistics: Truck,
  courses: GraduationCap,
  workshop: Wrench,
  marketing: Megaphone,
  conversations: MessageSquare,
  staff: UserCog,
  workforce: Users,
  schedule: Calendar,
  attendance: CheckSquare,
  hrIntegration: UserCheck,
  myWork: Briefcase,
  clients: Building2,
  projects: MapPin,
  workers: HardHat,
  placements: GitBranch,
  timesheets: BarChart3,
  equipment: Wrench,
  assets: Component,
  cmmsHub: Factory,
  locations: MapPin,
  workRequests: Wrench,
  workOrders: ClipboardList,
  projectPlanning: GitBranch,
  planningHub: LayoutDashboard,
  planningSimulation: Play,
  planningRisk: AlertTriangle,
  workPlanner: CalendarRange,
  preventiveMaintenance: RotateCw,
  assetReliability: Activity,
  iotMonitoring: Radio,
  calibration: Gauge,
  subcontractors: HardHat,
  spares: Boxes,
  procurement: ShoppingCart,
  cmmsFinance: CircleDollarSign,
  cmmsAiEngine: Sparkles,
  notificationCenter: Bell,
  cmmsSecurity: ShieldCheck,
  projectAccess: Shield,
  commandCenter: PanelLeft,
  manpowerLive: LayoutDashboard,
  manpowerPolicy: Settings,
  analytics: BarChart3,
  settings: Settings,
  billing: CreditCard,
  help: HelpCircle,
};

export const INDUSTRY_ICONS: Partial<Record<BusinessType, LucideIcon>> = {
  RESTAURANT: UtensilsCrossed,
  CAFE: UtensilsCrossed,
  SALON: Scissors,
  CLINIC: Stethoscope,
  RETAIL: Store,
  REAL_ESTATE: Home,
  HOTEL: BedDouble,
  LOGISTICS: Truck,
  EDUCATION: GraduationCap,
  CAR_WORKSHOP: Wrench,
  MANPOWER: HardHat,
};

export interface ProfileField {
  key: string;
  labelEn: string;
  labelAr: string;
  placeholderEn: string;
  placeholderAr: string;
  type?: "text" | "textarea" | "number";
  rows?: number;
}

const COMMON_FIELDS: ProfileField[] = [
  { key: "city", labelEn: "City", labelAr: "المدينة", placeholderEn: "e.g. Riyadh", placeholderAr: "مثال: الرياض" },
  { key: "address", labelEn: "Full Address", labelAr: "العنوان الكامل", placeholderEn: "Street, area, landmark", placeholderAr: "الشارع، الحي، معلم", type: "textarea", rows: 2 },
];

export function getProfileFields(type: BusinessType): ProfileField[] {
  const cat = getIndustryCategory(type);

  if (cat === "food") {
    return [
      ...COMMON_FIELDS,
      { key: "cuisineType", labelEn: "Cuisine / Food Type", labelAr: "نوع المطبخ", placeholderEn: "Pizza, BBQ, Fast food", placeholderAr: "بيتزا، مشاوي" },
      { key: "deliveryTime", labelEn: "Delivery Time", labelAr: "مدة التوصيل", placeholderEn: "45–60 minutes", placeholderAr: "45–60 دقيقة" },
      { key: "deliveryAreas", labelEn: "Delivery Areas", labelAr: "مناطق التوصيل", placeholderEn: "Areas covered", placeholderAr: "الأحياء", type: "textarea", rows: 2 },
      { key: "minOrder", labelEn: "Minimum Order", labelAr: "الحد الأدنى", placeholderEn: "500", placeholderAr: "500", type: "number" },
      { key: "paymentMethods", labelEn: "Payment Methods", labelAr: "طرق الدفع", placeholderEn: "Cash, card, COD", placeholderAr: "نقد، بطاقة" },
    ];
  }
  if (cat === "service") {
    return [
      ...COMMON_FIELDS,
      { key: "servicesSummary", labelEn: "Services Offered", labelAr: "الخدمات", placeholderEn: "Haircut, facial...", placeholderAr: "قص شعر، عناية...", type: "textarea", rows: 3 },
      { key: "appointmentDuration", labelEn: "Typical Duration", labelAr: "مدة الموعد", placeholderEn: "30–60 min", placeholderAr: "30–60 دقيقة" },
      { key: "cancellationPolicy", labelEn: "Cancellation Policy", labelAr: "سياسة الإلغاء", placeholderEn: "2 hours before", placeholderAr: "قبل ساعتين", type: "textarea", rows: 2 },
    ];
  }
  if (cat === "retail") {
    return [
      ...COMMON_FIELDS,
      { key: "deliveryTime", labelEn: "Shipping Time", labelAr: "مدة التوصيل", placeholderEn: "1–3 days", placeholderAr: "1–3 أيام" },
      { key: "returnPolicy", labelEn: "Return Policy", labelAr: "سياسة الإرجاع", placeholderEn: "7-day returns", placeholderAr: "إرجاع 7 أيام", type: "textarea", rows: 2 },
    ];
  }
  if (cat === "realestate") {
    return [
      ...COMMON_FIELDS,
      { key: "licenseNumber", labelEn: "REGA License #", labelAr: "رقم ترخيص الهيئة", placeholderEn: "FAL-XXXX", placeholderAr: "FAL-XXXX" },
      { key: "specialization", labelEn: "Specialization", labelAr: "التخصص", placeholderEn: "Residential, Commercial, Villas", placeholderAr: "سكني، تجاري، فلل" },
      { key: "serviceAreas", labelEn: "Service Areas", labelAr: "المناطق", placeholderEn: "North Riyadh, Jeddah...", placeholderAr: "شمال الرياض...", type: "textarea", rows: 2 },
      { key: "commissionRate", labelEn: "Commission %", labelAr: "نسبة العمولة", placeholderEn: "2.5", placeholderAr: "2.5", type: "number" },
    ];
  }
  if (cat === "hotel") {
    return [
      ...COMMON_FIELDS,
      { key: "starRating", labelEn: "Star Rating", labelAr: "تصنيف النجوم", placeholderEn: "4", placeholderAr: "4", type: "number" },
      { key: "checkInTime", labelEn: "Check-in Time", labelAr: "وقت الوصول", placeholderEn: "14:00", placeholderAr: "14:00" },
      { key: "checkOutTime", labelEn: "Check-out Time", labelAr: "وقت المغادرة", placeholderEn: "12:00", placeholderAr: "12:00" },
      { key: "amenities", labelEn: "Hotel Amenities", labelAr: "المرافق", placeholderEn: "Pool, Spa, Restaurant, WiFi", placeholderAr: "مسبح، سبا، مطعم", type: "textarea", rows: 2 },
    ];
  }
  if (cat === "logistics") {
    return [
      ...COMMON_FIELDS,
      { key: "coverageAreas", labelEn: "Coverage Areas", labelAr: "مناطق التغطية", placeholderEn: "Riyadh, Jeddah, Dammam", placeholderAr: "الرياض، جدة، الدمام", type: "textarea", rows: 2 },
      { key: "fleetSize", labelEn: "Fleet Size", labelAr: "حجم الأسطول", placeholderEn: "25 vehicles", placeholderAr: "25 مركبة" },
      { key: "avgDeliveryTime", labelEn: "Avg Delivery Time", labelAr: "متوسط التوصيل", placeholderEn: "24–48 hours", placeholderAr: "24–48 ساعة" },
      { key: "trackingProvider", labelEn: "Tracking System", labelAr: "نظام التتبع", placeholderEn: "Internal / 3PL", placeholderAr: "داخلي / طرف ثالث" },
    ];
  }
  if (cat === "education") {
    return [
      ...COMMON_FIELDS,
      { key: "accreditation", labelEn: "Accreditation", labelAr: "الاعتماد", placeholderEn: "TVTC, Ministry of Education", placeholderAr: "المؤسسة العامة للتدريب" },
      { key: "programsOffered", labelEn: "Programs Offered", labelAr: "البرامج", placeholderEn: "English, IT, Quran...", placeholderAr: "إنجليزي، تقنية...", type: "textarea", rows: 3 },
      { key: "classSchedule", labelEn: "Class Schedule", labelAr: "جدول الحصص", placeholderEn: "Sun–Thu, 4–8 PM", placeholderAr: "أحد–خميس" },
      { key: "enrollmentFee", labelEn: "Enrollment Fee", labelAr: "رسوم التسجيل", placeholderEn: "500 SAR", placeholderAr: "500 ريال" },
    ];
  }
  if (cat === "automotive") {
    return [
      ...COMMON_FIELDS,
      { key: "servicesOffered", labelEn: "Services Offered", labelAr: "الخدمات", placeholderEn: "Oil change, brakes, AC repair", placeholderAr: "زيت، فرامل، تكييف", type: "textarea", rows: 2 },
      { key: "warrantyPolicy", labelEn: "Warranty Policy", labelAr: "سياسة الضمان", placeholderEn: "30-day parts warranty", placeholderAr: "ضمان 30 يوم" },
      { key: "avgRepairTime", labelEn: "Avg Repair Time", labelAr: "متوسط الإصلاح", placeholderEn: "2–3 days", placeholderAr: "2–3 أيام" },
      { key: "brandsSupported", labelEn: "Brands Supported", labelAr: "الماركات", placeholderEn: "Toyota, Hyundai, BMW", placeholderAr: "تويوتا، هيونداي" },
    ];
  }

  return [
    ...COMMON_FIELDS,
    { key: "servicesSummary", labelEn: "What You Offer", labelAr: "ماذا تقدمون", placeholderEn: "Products/services", placeholderAr: "المنتجات/الخدمات", type: "textarea", rows: 3 },
  ];
}

export function getKnowledgeSuggestions(type: BusinessType, locale: "en" | "ar" = "en"): string[] {
  const cat = getIndustryCategory(type);
  if (locale === "ar") {
    const ar: Partial<Record<IndustryCategory, string[]>> = {
      food: ["سياسة التوصيل", "طرق الدفع", "الحساسية", "العروض", "الإلغاء"],
      service: ["الخدمات والأسعار", "سياسة المواعيد", "الإلغاء", "العروض"],
      realestate: ["أنواع العقارات", "مناطق الخدمة", "إجراءات الشراء", "العمولة", "التمويل"],
      hotel: ["أنواع الغرف", "سياسة الحجز", "الإلغاء", "المرافق", "الأسعار"],
      logistics: ["مناطق التغطية", "أوقات التوصيل", "تتبع الشحنة", "الأسعار"],
      education: ["الدورات المتاحة", "الجدول", "الرسوم", "الشهادات"],
      automotive: ["الخدمات", "الأسعار", "الضمان", "أوقات العمل"],
    };
    return ar[cat] ?? ["الأسئلة الشائعة", "ساعات العمل", "التواصل"];
  }
  const en: Partial<Record<IndustryCategory, string[]>> = {
    food: ["Delivery policy", "Payment methods", "Allergens", "Daily specials"],
    service: ["Services & pricing", "Booking policy", "Cancellation"],
    realestate: ["Property types", "Service areas", "Buying process", "Commission", "Financing"],
    hotel: ["Room types", "Booking policy", "Cancellation", "Amenities", "Rates"],
    logistics: ["Coverage areas", "Delivery times", "Tracking", "Pricing"],
    education: ["Available courses", "Schedule", "Fees", "Certificates"],
    automotive: ["Services", "Pricing", "Warranty", "Working hours"],
  };
  return en[cat] ?? ["FAQs", "Working hours", "Contact info"];
}

export function getCatalogLabel(type: BusinessType, locale: "en" | "ar" = "en"): string {
  const cat = getIndustryCategory(type);
  if (locale === "ar") {
    if (cat === "service") return "الخدمات";
    if (cat === "food") return "القائمة";
    if (cat === "realestate") return "العقارات / القوائم";
    if (cat === "hotel") return "باقات الغرف";
    if (cat === "education") return "البرامج";
    return "المنتجات";
  }
  if (cat === "service") return "Services";
  if (cat === "food") return "Menu & Items";
  if (cat === "realestate") return "Listings";
  if (cat === "hotel") return "Room Packages";
  if (cat === "education") return "Programs";
  return "Products";
}

export function getAutoReplySuggestions(
  type: BusinessType
): Array<{ keywords: string; en: string; ar: string }> {
  const cat = getIndustryCategory(type);
  if (cat === "food") {
    return [
      { keywords: "menu, order, قائمة, طلب", en: "Type MENU to see our menu and order.", ar: "اكتب «قائمة» لعرض القائمة والطلب." },
      { keywords: "delivery, توصيل", en: "Delivery info in our profile — ask any question!", ar: "معلومات التوصيل متوفرة." },
    ];
  }
  if (cat === "service") {
    return [
      { keywords: "book, booking, حجز", en: "Type BOOKING to schedule.", ar: "اكتب «حجز» لحجز موعد." },
      { keywords: "services, خدمات", en: "Type MENU to see services.", ar: "اكتب «قائمة» لعرض الخدمات." },
    ];
  }
  if (cat === "realestate") {
    return [
      { keywords: "property, listing, عقار, شقة", en: "Browse our listings — tell me your budget & area!", ar: "أخبرني ميزانيتك والمنطقة لعرض العقارات." },
      { keywords: "viewing, visit, معاينة", en: "I can schedule a property viewing for you.", ar: "يمكنني حجز معاينة عقار لك." },
      { keywords: "rent, sale, إيجار, بيع", en: "We have properties for sale and rent.", ar: "لدينا عقارات للبيع والإيجار." },
    ];
  }
  if (cat === "hotel") {
    return [
      { keywords: "book, reservation, حجز", en: "Tell me your dates and I'll check availability.", ar: "أخبرني بالتواريخ وسأتحقق من التوفر." },
      { keywords: "room, غرفة", en: "We have Standard, Deluxe & Suite rooms.", ar: "لدينا غرف عادية وديلوكس وأجنحة." },
      { keywords: "price, rate, سعر", en: "Room rates start from our catalog — ask me!", ar: "أسعار الغرف في الكتالوج — اسألني!" },
    ];
  }
  if (cat === "logistics") {
    return [
      { keywords: "track, tracking, تتبع", en: "Send your tracking number to check status.", ar: "أرسل رقم التتبع للتحقق من الحالة." },
      { keywords: "ship, delivery, شحن, توصيل", en: "Tell me origin & destination for a quote.", ar: "أخبرني بنقطة الإرسال والاستلام للتسعير." },
    ];
  }
  if (cat === "education") {
    return [
      { keywords: "course, class, دورة, حصة", en: "Browse our courses — which subject interests you?", ar: "أي مادة تهمك؟ سأعرض الدورات المتاحة." },
      { keywords: "enroll, register, تسجيل", en: "I can help you enroll — share your name & phone.", ar: "شاركني اسمك ورقمك للتسجيل." },
    ];
  }
  if (cat === "automotive") {
    return [
      { keywords: "repair, fix, إصلاح, صيانة", en: "Describe the issue — we'll schedule your vehicle.", ar: "صف المشكلة وسنجدول سيارتك." },
      { keywords: "status, حالة", en: "Send your plate number to check repair status.", ar: "أرسل رقم اللوحة للتحقق من حالة الإصلاح." },
    ];
  }
  return [{ keywords: "help, مساعدة", en: "How can I help you today?", ar: "كيف يمكنني مساعدتك؟" }];
}
