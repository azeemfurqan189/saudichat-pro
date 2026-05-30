const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      throw error instanceof Error ? error : new Error("Network error");
    }
  }

  // Auth
  login(phone: string, password: string) {
    return this.request<{ token: string; user: User; businesses: Business[] }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ phone, password }) }
    );
  }

  signup(data: { name: string; email: string; phone: string; password: string }) {
    return this.request("/auth/signup", { method: "POST", body: JSON.stringify(data) });
  }

  verifyOtp(data: { phone: string; otp: string; name?: string; email?: string; password?: string }) {
    return this.request<{ token: string; user: User; businesses: Business[] }>(
      "/auth/verify-otp",
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  forgotPassword(phone: string) {
    return this.request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ phone }) });
  }

  resetPassword(data: { phone: string; otp: string; password: string }) {
    return this.request("/auth/reset-password", { method: "POST", body: JSON.stringify(data) });
  }

  getMe() {
    return this.request<{ user: User; businesses: Business[] }>("/auth/me");
  }

  // Business
  createBusiness(data: Partial<Business>) {
    return this.request<Business>("/businesses", { method: "POST", body: JSON.stringify(data) });
  }

  getBusiness(businessId: string) {
    return this.request<Business>(`/businesses/${businessId}`);
  }

  updateBusiness(businessId: string, data: Partial<Business>) {
    return this.request<Business>(`/businesses/${businessId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  getDashboard(businessId: string) {
    return this.request<DashboardData>(`/businesses/${businessId}/dashboard`);
  }

  testWhatsApp(businessId: string, phoneId: string, token: string) {
    return this.request(`/businesses/${businessId}/whatsapp/test`, {
      method: "POST",
      body: JSON.stringify({ phoneId, token }),
    });
  }

  // Orders
  getOrders(businessId: string, params?: Record<string, string>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<Order[]>(`/businesses/${businessId}/orders${query}`);
  }

  getOrder(businessId: string, orderId: string) {
    return this.request<Order>(`/businesses/${businessId}/orders/${orderId}`);
  }

  updateOrderStatus(businessId: string, orderId: string, status: string) {
    return this.request<Order>(`/businesses/${businessId}/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Appointments
  getAppointments(businessId: string, params?: Record<string, string>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<Appointment[]>(`/businesses/${businessId}/appointments${query}`);
  }

  updateAppointment(businessId: string, appointmentId: string, data: Partial<Appointment>) {
    return this.request<Appointment>(`/businesses/${businessId}/appointments/${appointmentId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Customers
  getCustomers(businessId: string, params?: Record<string, string>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<Customer[]>(`/businesses/${businessId}/customers${query}`);
  }

  getCustomer(businessId: string, customerId: string) {
    return this.request<CustomerDetail>(`/businesses/${businessId}/customers/${customerId}`);
  }

  updateCustomer(businessId: string, customerId: string, data: Partial<Customer>) {
    return this.request<Customer>(`/businesses/${businessId}/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Catalog
  getCatalog(businessId: string) {
    return this.request<Catalog[]>(`/businesses/${businessId}/catalog`);
  }

  createCatalogItem(businessId: string, data: Partial<CatalogItem>) {
    return this.request<CatalogItem>(`/businesses/${businessId}/catalog/items`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateCatalogItem(businessId: string, itemId: string, data: Partial<CatalogItem>) {
    return this.request<CatalogItem>(`/businesses/${businessId}/catalog/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteCatalogItem(businessId: string, itemId: string) {
    return this.request(`/businesses/${businessId}/catalog/items/${itemId}`, { method: "DELETE" });
  }

  // Conversations
  getConversations(businessId: string, params?: Record<string, string>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.request<Conversation[]>(`/businesses/${businessId}/conversations${query}`);
  }

  getMessages(businessId: string, conversationId: string) {
    return this.request<Message[]>(`/businesses/${businessId}/conversations/${conversationId}/messages`);
  }

  sendMessage(businessId: string, conversationId: string, content: string) {
    return this.request<Message>(`/businesses/${businessId}/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  toggleBot(businessId: string, conversationId: string) {
    return this.request(`/businesses/${businessId}/conversations/${conversationId}/bot`, { method: "PATCH" });
  }

  // Marketing
  getCampaigns(businessId: string) {
    return this.request<Campaign[]>(`/businesses/${businessId}/campaigns`);
  }

  createCampaign(businessId: string, data: Partial<Campaign>) {
    return this.request<Campaign>(`/businesses/${businessId}/campaigns`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getPromoCodes(businessId: string) {
    return this.request<PromoCode[]>(`/businesses/${businessId}/promo-codes`);
  }

  createPromoCode(businessId: string, data: Partial<PromoCode>) {
    return this.request<PromoCode>(`/businesses/${businessId}/promo-codes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getLoyaltyRewards(businessId: string) {
    return this.request<LoyaltyReward[]>(`/businesses/${businessId}/loyalty-rewards`);
  }

  // Analytics
  getAnalytics(businessId: string, range?: string) {
    const query = range ? `?range=${range}` : "";
    return this.request<AnalyticsData>(`/businesses/${businessId}/analytics${query}`);
  }

  // Settings
  getAutoReplies(businessId: string) {
    return this.request<AutoReply[]>(`/businesses/${businessId}/auto-replies`);
  }

  createAutoReply(businessId: string, data: Partial<AutoReply>) {
    return this.request<AutoReply>(`/businesses/${businessId}/auto-replies`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteAutoReply(businessId: string, ruleId: string) {
    return this.request(`/businesses/${businessId}/auto-replies/${ruleId}`, { method: "DELETE" });
  }

  getStaff(businessId: string) {
    return this.request<Staff[]>(`/businesses/${businessId}/staff`);
  }

  createStaff(businessId: string, data: Partial<Staff>) {
    return this.request<Staff>(`/businesses/${businessId}/staff`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getNotifications(businessId: string) {
    return this.request<Notification[]>(`/businesses/${businessId}/notifications`);
  }

  markNotificationRead(businessId: string, notificationId: string) {
    return this.request(`/businesses/${businessId}/notifications/${notificationId}/read`, { method: "PATCH" });
  }
}

export const api = new ApiClient();

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

export interface Business {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  slug: string;
  logo?: string;
  description?: string;
  whatsappNumber?: string;
  whatsappPhoneId?: string;
  whatsappToken?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  settings?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  tags: string[];
  notes?: string;
  lastInteraction?: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  orders: Order[];
  appointments: Appointment[];
  conversations: Conversation[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  items: Array<{ id: string; name: string; quantity: number; price: number; image?: string }>;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentStatus: string;
  deliveryAddress?: Record<string, unknown>;
  specialInstructions?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customer?: Customer;
  staffId?: string;
  staff?: Staff;
  serviceName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
}

export interface Catalog {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  items: CatalogItem[];
}

export interface CatalogItem {
  id: string;
  catalogId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  discountPrice?: number;
  image?: string;
  category?: string;
  duration?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface Conversation {
  id: string;
  customerId: string;
  customer?: Customer;
  status: string;
  isBotHandling: boolean;
  lastMessageAt: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: string;
  messageType: string;
  content: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  message: string;
  status: string;
  stats?: Record<string, number>;
  scheduledAt?: string;
  sentAt?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  nameAr?: string;
  pointsRequired: number;
  description?: string;
  isActive: boolean;
}

export interface AutoReply {
  id: string;
  triggerKeywords: string[];
  triggerType: string;
  responseAr: string;
  responseEn: string;
  priority: number;
  isActive: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  avatar?: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  type: string;
  stats: Record<string, number>;
  recentOrders?: Order[];
  recentConversations?: Conversation[];
  upcomingAppointments?: Appointment[];
}

export interface AnalyticsData {
  totalOrders: number;
  newCustomers: number;
  totalRevenue: number;
  totalConversations: number;
  ordersByDay: Record<string, number>;
  revenueByDay: Record<string, number>;
  statusDistribution: Record<string, number>;
  avgOrderValue: number;
}
