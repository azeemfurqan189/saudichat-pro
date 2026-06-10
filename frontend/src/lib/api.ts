import { getApiUrl } from "./api-config";

const API_URL = getApiUrl();

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
    options: RequestInit = {},
    retries = 2
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const text = await res.text();
        let data: ApiResponse<T>;
        try {
          data = JSON.parse(text) as ApiResponse<T>;
        } catch {
          throw new Error(res.ok ? "Invalid server response" : `Server error (${res.status})`);
        }

        if (!res.ok) {
          const msg =
            data.message ||
            (Array.isArray(data.errors) ? data.errors.join(', ') : null) ||
            'Request failed';
          throw new Error(msg);
        }

        return data;
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        const isNetwork = error instanceof TypeError;
        lastError =
          isTimeout
            ? new Error(
                attempt < retries
                  ? "Server waking up — retrying..."
                  : `Server slow or waking up. Wait 1 min and try again. API: ${API_URL}`
              )
            : isNetwork
              ? new Error(`Network error — API: ${API_URL}`)
              : error instanceof Error
                ? error
                : new Error("Network error");

        if ((isTimeout || isNetwork) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Request failed");
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

  getBotSetupStatus(businessId: string) {
    return this.request<BotSetupStatus>(`/businesses/${businessId}/bot-setup`);
  }

  testWhatsApp(businessId: string, phoneId: string, token: string) {
    return this.request(`/businesses/${businessId}/whatsapp/test`, {
      method: "POST",
      body: JSON.stringify({ phoneId, token }),
    });
  }

  getWebsiteImportStatus(businessId: string) {
    return this.request<WebsiteImportStatus>(`/businesses/${businessId}/website/status`);
  }

  previewWebsiteImport(businessId: string, url: string) {
    return this.request<WebsitePreviewResult>(`/businesses/${businessId}/website/preview`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  importWebsite(
    businessId: string,
    data: { url: string; applyProfile?: boolean; applyCatalog?: boolean; items?: WebsitePreviewItem[] }
  ) {
    return this.request<WebsiteImportResult>(`/businesses/${businessId}/website/import`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  syncWebsite(businessId: string) {
    return this.request<WebsiteSyncResult>(`/businesses/${businessId}/website/sync`, { method: "POST" });
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
    return this.request<Campaign & { sendResult?: { sent: number; failed: number; total: number } }>(
      `/businesses/${businessId}/campaigns`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  sendCampaign(businessId: string, campaignId: string) {
    return this.request<Campaign & { sendResult?: { sent: number; failed: number; total: number } }>(
      `/businesses/${businessId}/campaigns/${campaignId}/send`,
      { method: "POST" }
    );
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

  updatePromoCode(businessId: string, promoId: string, data: Partial<PromoCode>) {
    return this.request<PromoCode>(`/businesses/${businessId}/promo-codes/${promoId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deletePromoCode(businessId: string, promoId: string) {
    return this.request(`/businesses/${businessId}/promo-codes/${promoId}`, { method: "DELETE" });
  }

  getLoyaltyRewards(businessId: string) {
    return this.request<LoyaltyReward[]>(`/businesses/${businessId}/loyalty-rewards`);
  }

  createLoyaltyReward(businessId: string, data: Partial<LoyaltyReward>) {
    return this.request<LoyaltyReward>(`/businesses/${businessId}/loyalty-rewards`, {
      method: "POST",
      body: JSON.stringify(data),
    });
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

  updateStaff(businessId: string, staffId: string, data: Partial<Staff>) {
    return this.request<Staff>(`/businesses/${businessId}/staff/${staffId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteStaff(businessId: string, staffId: string) {
    return this.request(`/businesses/${businessId}/staff/${staffId}`, { method: "DELETE" });
  }

  getNotifications(businessId: string) {
    return this.request<Notification[]>(`/businesses/${businessId}/notifications`);
  }

  markNotificationRead(businessId: string, notificationId: string) {
    return this.request(`/businesses/${businessId}/notifications/${notificationId}/read`, { method: "PATCH" });
  }

  // AI Bot
  getAiSettings(businessId: string) {
    return this.request<AiSettings>(`/businesses/${businessId}/ai/settings`);
  }

  updateAiSettings(businessId: string, data: Partial<AiSettings>) {
    return this.request(`/businesses/${businessId}/ai/settings`, { method: "PATCH", body: JSON.stringify(data) });
  }

  clearBotCache(businessId: string) {
    return this.request<{ message?: string }>(`/businesses/${businessId}/ai/clear-cache`, { method: "POST" });
  }

  testBot(businessId: string, message: string) {
    return this.request<BotTestResult>(`/businesses/${businessId}/ai/test`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  getBotAnalytics(businessId: string, days = 30) {
    return this.request<BotAnalytics>(`/businesses/${businessId}/ai/analytics?days=${days}`);
  }

  getIntelligence(businessId: string) {
    return this.request<IntelligenceSummary>(`/businesses/${businessId}/ai/intelligence`);
  }

  getKnowledgeDocuments(businessId: string) {
    return this.request<KnowledgeDocument[]>(`/businesses/${businessId}/ai/knowledge`);
  }

  createKnowledgeDocument(businessId: string, data: { title: string; content: string }) {
    return this.request<KnowledgeDocument>(`/businesses/${businessId}/ai/knowledge`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteKnowledgeDocument(businessId: string, docId: string) {
    return this.request(`/businesses/${businessId}/ai/knowledge/${docId}`, { method: "DELETE" });
  }

  getFaqCandidates(businessId: string) {
    return this.request<FaqCandidate[]>(`/businesses/${businessId}/ai/faq-candidates`);
  }

  approveFaqCandidate(businessId: string, candidateId: string, answer: string) {
    return this.request(`/businesses/${businessId}/ai/faq-candidates/${candidateId}/approve`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
  }

  runFaqLearning(businessId: string) {
    return this.request<{ newCandidates: number }>(`/businesses/${businessId}/ai/faq-learning`, { method: "POST" });
  }

  triggerWinBack(businessId: string) {
    return this.request<{ customersTargeted: number }>(`/businesses/${businessId}/ai/winback`, { method: "POST" });
  }

  getWorkflowLogs(businessId: string) {
    return this.request<WorkflowLog[]>(`/businesses/${businessId}/ai/workflows`);
  }

  // Sales Pipeline
  getDeals(businessId: string) {
    return this.request<Deal[]>(`/businesses/${businessId}/deals`);
  }
  createDeal(businessId: string, data: Partial<Deal>) {
    return this.request<Deal>(`/businesses/${businessId}/deals`, { method: "POST", body: JSON.stringify(data) });
  }
  updateDeal(businessId: string, dealId: string, data: Partial<Deal>) {
    return this.request<Deal>(`/businesses/${businessId}/deals/${dealId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  deleteDeal(businessId: string, dealId: string) {
    return this.request(`/businesses/${businessId}/deals/${dealId}`, { method: "DELETE" });
  }

  // Tasks
  getTasks(businessId: string, status?: string) {
    const q = status ? `?status=${status}` : "";
    return this.request<Task[]>(`/businesses/${businessId}/tasks${q}`);
  }
  createTask(businessId: string, data: Partial<Task>) {
    return this.request<Task>(`/businesses/${businessId}/tasks`, { method: "POST", body: JSON.stringify(data) });
  }
  updateTask(businessId: string, taskId: string, data: Partial<Task>) {
    return this.request<Task>(`/businesses/${businessId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  deleteTask(businessId: string, taskId: string) {
    return this.request(`/businesses/${businessId}/tasks/${taskId}`, { method: "DELETE" });
  }

  // Inventory
  getInventory(businessId: string) {
    return this.request<InventoryData>(`/businesses/${businessId}/inventory`);
  }
  updateInventory(businessId: string, itemId: string, data: { stockQty?: number; lowStockThreshold?: number; sku?: string }) {
    return this.request<CatalogItem>(`/businesses/${businessId}/inventory/${itemId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Automation Workflows
  getAutomationWorkflows(businessId: string) {
    return this.request<AutomationWorkflow[]>(`/businesses/${businessId}/automation-workflows`);
  }
  updateAutomationWorkflow(businessId: string, workflowId: string, data: Partial<AutomationWorkflow>) {
    return this.request<AutomationWorkflow>(`/businesses/${businessId}/automation-workflows/${workflowId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Compliance
  getComplianceStatus(businessId: string) {
    return this.request<ComplianceStatus>(`/businesses/${businessId}/compliance`);
  }
  updateComplianceSettings(businessId: string, data: Record<string, unknown>) {
    return this.request(`/businesses/${businessId}/compliance`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Executive Dashboard
  getExecutiveDashboard(businessId: string, days = 30) {
    return this.request<ExecutiveSummary>(`/businesses/${businessId}/executive?days=${days}`);
  }

  getReportPdfUrl(businessId: string, days = 30) {
    const base = getApiUrl();
    return `${base}/businesses/${businessId}/reports/pdf?days=${days}`;
  }

  // Omnichannel
  getChannels(businessId: string) {
    return this.request<Record<string, { isEnabled: boolean; config: Record<string, unknown> }>>(
      `/businesses/${businessId}/channels`
    );
  }
  updateChannel(businessId: string, channel: string, data: { isEnabled?: boolean; config?: Record<string, unknown> }) {
    return this.request(`/businesses/${businessId}/channels/${channel}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  getUnifiedInbox(businessId: string) {
    return this.request<UnifiedInboxItem[]>(`/businesses/${businessId}/inbox/unified`);
  }

  // Leads
  getLeads(businessId: string) {
    return this.request<Lead[]>(`/businesses/${businessId}/leads`);
  }
  createLead(businessId: string, data: Partial<Lead>) {
    return this.request<Lead>(`/businesses/${businessId}/leads`, { method: "POST", body: JSON.stringify(data) });
  }
  updateLead(businessId: string, leadId: string, data: Partial<Lead>) {
    return this.request<Lead>(`/businesses/${businessId}/leads/${leadId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Referrals
  getReferrals(businessId: string) {
    return this.request<Referral[]>(`/businesses/${businessId}/referrals`);
  }
  createReferral(businessId: string, data: Partial<Referral>) {
    return this.request<Referral>(`/businesses/${businessId}/referrals`, { method: "POST", body: JSON.stringify(data) });
  }

  // Reviews & Feedback
  getReviews(businessId: string) {
    return this.request<{ reviews: Review[]; avgRating: number; total: number }>(`/businesses/${businessId}/reviews`);
  }
  createReview(businessId: string, data: Partial<Review>) {
    return this.request<Review>(`/businesses/${businessId}/reviews`, { method: "POST", body: JSON.stringify(data) });
  }
  getFeedbacks(businessId: string) {
    return this.request<CustomerFeedback[]>(`/businesses/${businessId}/feedbacks`);
  }

  // API Keys
  getApiKeys(businessId: string) {
    return this.request<ApiKeyRecord[]>(`/businesses/${businessId}/api-keys`);
  }
  createApiKey(businessId: string, name: string) {
    return this.request<ApiKeyRecord & { key?: string }>(`/businesses/${businessId}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }
  revokeApiKey(businessId: string, keyId: string) {
    return this.request(`/businesses/${businessId}/api-keys/${keyId}`, { method: "DELETE" });
  }

  // AI Advisor
  getAiAdvisor(businessId: string) {
    return this.request<AiAdvisorData>(`/businesses/${businessId}/ai/advisor`);
  }

  // Deliveries
  getDeliveries(businessId: string) {
    return this.request<Delivery[]>(`/businesses/${businessId}/deliveries`);
  }
  createDelivery(businessId: string, data: Partial<Delivery>) {
    return this.request<Delivery>(`/businesses/${businessId}/deliveries`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  updateDelivery(businessId: string, deliveryId: string, data: Partial<Delivery>) {
    return this.request<Delivery>(`/businesses/${businessId}/deliveries/${deliveryId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Suppliers
  getSuppliers(businessId: string) {
    return this.request<Supplier[]>(`/businesses/${businessId}/suppliers`);
  }
  createSupplier(businessId: string, data: Partial<Supplier>) {
    return this.request<Supplier>(`/businesses/${businessId}/suppliers`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Industry Stats
  getIndustryStats(businessId: string) {
    return this.request<IndustryStats>(`/businesses/${businessId}/industry/stats`);
  }

  // Real Estate
  getProperties(businessId: string) {
    return this.request<PropertyListing[]>(`/businesses/${businessId}/properties`);
  }
  createProperty(businessId: string, data: Partial<PropertyListing>) {
    return this.request<PropertyListing>(`/businesses/${businessId}/properties`, { method: "POST", body: JSON.stringify(data) });
  }
  updateProperty(businessId: string, propertyId: string, data: Partial<PropertyListing>) {
    return this.request<PropertyListing>(`/businesses/${businessId}/properties/${propertyId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  getPropertyViewings(businessId: string) {
    return this.request<PropertyViewing[]>(`/businesses/${businessId}/property-viewings`);
  }
  createPropertyViewing(businessId: string, data: Partial<PropertyViewing>) {
    return this.request<PropertyViewing>(`/businesses/${businessId}/property-viewings`, { method: "POST", body: JSON.stringify(data) });
  }
  updatePropertyViewing(businessId: string, viewingId: string, data: Partial<PropertyViewing>) {
    return this.request<PropertyViewing>(`/businesses/${businessId}/property-viewings/${viewingId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Hotel
  getHotelRooms(businessId: string) {
    return this.request<HotelRoom[]>(`/businesses/${businessId}/hotel-rooms`);
  }
  createHotelRoom(businessId: string, data: Partial<HotelRoom>) {
    return this.request<HotelRoom>(`/businesses/${businessId}/hotel-rooms`, { method: "POST", body: JSON.stringify(data) });
  }
  updateHotelRoom(businessId: string, roomId: string, data: Partial<HotelRoom>) {
    return this.request<HotelRoom>(`/businesses/${businessId}/hotel-rooms/${roomId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  getHotelReservations(businessId: string) {
    return this.request<HotelReservation[]>(`/businesses/${businessId}/hotel-reservations`);
  }
  createHotelReservation(businessId: string, data: Partial<HotelReservation>) {
    return this.request<HotelReservation>(`/businesses/${businessId}/hotel-reservations`, { method: "POST", body: JSON.stringify(data) });
  }
  updateHotelReservation(businessId: string, reservationId: string, data: Partial<HotelReservation>) {
    return this.request<HotelReservation>(`/businesses/${businessId}/hotel-reservations/${reservationId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Logistics
  getShipments(businessId: string) {
    return this.request<Shipment[]>(`/businesses/${businessId}/shipments`);
  }
  createShipment(businessId: string, data: Partial<Shipment>) {
    return this.request<Shipment>(`/businesses/${businessId}/shipments`, { method: "POST", body: JSON.stringify(data) });
  }
  updateShipment(businessId: string, shipmentId: string, data: Partial<Shipment>) {
    return this.request<Shipment>(`/businesses/${businessId}/shipments/${shipmentId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  getFleetVehicles(businessId: string) {
    return this.request<FleetVehicle[]>(`/businesses/${businessId}/fleet`);
  }
  createFleetVehicle(businessId: string, data: Partial<FleetVehicle>) {
    return this.request<FleetVehicle>(`/businesses/${businessId}/fleet`, { method: "POST", body: JSON.stringify(data) });
  }
  updateFleetVehicle(businessId: string, vehicleId: string, data: Partial<FleetVehicle>) {
    return this.request<FleetVehicle>(`/businesses/${businessId}/fleet/${vehicleId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  // Education
  getCourses(businessId: string) {
    return this.request<Course[]>(`/businesses/${businessId}/courses`);
  }
  createCourse(businessId: string, data: Partial<Course>) {
    return this.request<Course>(`/businesses/${businessId}/courses`, { method: "POST", body: JSON.stringify(data) });
  }
  updateCourse(businessId: string, courseId: string, data: Partial<Course>) {
    return this.request<Course>(`/businesses/${businessId}/courses/${courseId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  getEnrollments(businessId: string) {
    return this.request<Enrollment[]>(`/businesses/${businessId}/enrollments`);
  }
  createEnrollment(businessId: string, data: Partial<Enrollment>) {
    return this.request<Enrollment>(`/businesses/${businessId}/enrollments`, { method: "POST", body: JSON.stringify(data) });
  }

  // Automotive
  getVehicleJobs(businessId: string) {
    return this.request<VehicleJob[]>(`/businesses/${businessId}/vehicle-jobs`);
  }
  createVehicleJob(businessId: string, data: Partial<VehicleJob>) {
    return this.request<VehicleJob>(`/businesses/${businessId}/vehicle-jobs`, { method: "POST", body: JSON.stringify(data) });
  }
  updateVehicleJob(businessId: string, jobId: string, data: Partial<VehicleJob>) {
    return this.request<VehicleJob>(`/businesses/${businessId}/vehicle-jobs/${jobId}`, { method: "PATCH", body: JSON.stringify(data) });
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
  stockQty?: number | null;
  lowStockThreshold?: number;
  sku?: string;
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
  bot?: BotAnalytics;
}

export interface AiSettings {
  aiPersona?: { tone?: string; language?: string; instructions?: string };
  aiPaused?: boolean;
  refundPolicy?: string;
  quotas?: Record<string, number>;
  usage?: { tokensThisMonth: number };
}

export interface BotSetupStatus {
  businessId: string;
  businessName: string;
  readyForChat: boolean;
  readyForOrders: boolean;
  checks: {
    whatsappConnected: boolean;
    catalogItems: number;
    hasMenu: boolean;
    knowledgeDocs: number;
    autoReplies: number;
    aiPaused: boolean;
    aiConfigured: boolean;
    openaiConfigured?: boolean;
    businessDescription: boolean;
    hasProfile: boolean;
  };
  setupSteps: string[];
}

export interface BotTestResult {
  intent: string;
  agent: string;
  knowledgeMatches: string[];
  wouldUseCache: boolean;
}

export interface BotAnalytics {
  periodDays: number;
  chatsStarted: number;
  ordersCreated: number;
  conversionRate: number;
  handoffRate: number;
  aiReplies: number;
  topIntents: Array<{ intent: string; count: number }>;
  revenue: number;
  intelligence?: IntelligenceSummary;
  workflowStepsRun?: number;
}

export interface IntelligenceSummary {
  hotLeads: number;
  churnRiskCustomers: number;
  avgLeadScore: number;
  topLeads: Array<{ id: string; name: string; phone: string; leadScore: number; churnRisk: string; tags: string[] }>;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  sourceType: string;
  isActive: boolean;
  createdAt: string;
  _count?: { chunks: number };
}

export interface FaqCandidate {
  id: string;
  question: string;
  suggestedAnswer?: string;
  frequency: number;
  status: string;
}

export interface WorkflowLog {
  id: string;
  entityType: string;
  entityId: string;
  step: string;
  status: string;
  messageSent?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  source?: string;
  notes?: string;
  customerId?: string;
  customer?: Customer;
  expectedCloseDate?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  customerId?: string;
  dealId?: string;
  customer?: Customer;
  deal?: Deal;
}

export interface InventoryData {
  items: CatalogItem[];
  lowStock: CatalogItem[];
  totalTracked: number;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  steps: Array<Record<string, unknown>>;
  isActive: boolean;
  runsCount: number;
  lastRunAt?: string;
}

export interface ComplianceStatus {
  consentRecords: number;
  totalCustomers: number;
  consentCoverage: number;
  pdplEnabled: boolean;
  dataRetentionDays: number;
  checklist: Array<{ id: string; label: string; done: boolean }>;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source: string;
  status: string;
  leadScore: number;
  notes?: string;
  customer?: Customer;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerName: string;
  referrerPhone?: string;
  referredPhone: string;
  code: string;
  rewardPoints: number;
  status: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  source: string;
  customer?: Customer;
  createdAt: string;
}

export interface CustomerFeedback {
  id: string;
  rating?: number;
  category?: string;
  message: string;
  status: string;
  customer?: Customer;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  key?: string;
}

export interface UnifiedInboxItem {
  id: string;
  channel: string;
  customerName?: string;
  phone?: string;
  lastMessage?: string;
  lastMessageAt: string;
  isBotHandling?: boolean;
  type: "conversation" | "livechat";
}

export interface AiAdvisorData {
  healthScore: number;
  narrative: string;
  recommendations: Array<{ id: string; title: string; impact: string; action: string; expectedRoi: string }>;
  metrics: ExecutiveSummary;
}

export interface Delivery {
  id: string;
  orderId?: string;
  driverName?: string;
  driverPhone?: string;
  status: string;
  address?: string;
  estimatedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface IndustryStats {
  businessType: string;
  availableListings?: number;
  upcomingViewings?: number;
  closedDeals?: number;
  totalRooms?: number;
  occupiedRooms?: number;
  upcomingReservations?: number;
  activeShipments?: number;
  deliveredShipments?: number;
  availableVehicles?: number;
  totalCourses?: number;
  enrolledStudents?: number;
  activeCourses?: number;
  openJobs?: number;
  readyForPickup?: number;
  totalRevenue?: number;
}

export interface PropertyListing {
  id: string;
  title: string;
  titleAr?: string;
  listingType: string;
  price: number;
  currency: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  location?: string;
  city?: string;
  status: string;
  description?: string;
  createdAt: string;
}

export interface PropertyViewing {
  id: string;
  propertyId: string;
  clientName: string;
  clientPhone?: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  property?: PropertyListing;
}

export interface HotelRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  pricePerNight: number;
  maxGuests: number;
  isAvailable: boolean;
}

export interface HotelReservation {
  id: string;
  roomId: string;
  guestName: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: string;
  totalAmount?: number;
  room?: HotelRoom;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  senderName: string;
  recipientName: string;
  origin: string;
  destination: string;
  weightKg?: number;
  status: string;
  carrier?: string;
  createdAt: string;
}

export interface FleetVehicle {
  id: string;
  plateNumber: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType: string;
  status: string;
}

export interface Course {
  id: string;
  name: string;
  nameAr?: string;
  instructor?: string;
  schedule?: string;
  duration?: string;
  price?: number;
  maxStudents?: number;
  enrolledCount: number;
  status: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentName: string;
  studentPhone?: string;
  studentEmail?: string;
  status: string;
  enrolledAt: string;
  course?: Course;
}

export interface VehicleJob {
  id: string;
  vehiclePlate: string;
  vehicleMake?: string;
  vehicleModel?: string;
  issueDescription: string;
  status: string;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  notes?: string;
  createdAt: string;
}

export interface ExecutiveSummary {
  periodDays: number;
  revenue: number;
  revenueGrowth: number;
  orders: number;
  newCustomers: number;
  avgOrderValue: number;
  avgClv: number;
  hotLeads: number;
  churnRiskCustomers: number;
  openTasks: number;
  businessHealthScore: number;
  aiInsight: string;
  pipeline: Array<{ stage: string; count: number; value: number }>;
  lowStockCount: number;
}

export interface WebsiteImportStatus {
  websiteUrl: string;
  websiteImportEnabled: boolean;
  websiteLastSyncAt: string | null;
  websiteSyncIntervalHours: number;
}

export interface WebsitePreviewItem {
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number;
  discountPrice?: number;
  category?: string;
  image?: string;
}

export interface WebsitePreviewResult {
  url: string;
  pagesScanned?: number;
  businessInfo?: {
    name?: string;
    address?: string;
    hours?: string;
    about?: string;
  };
  categories: string[];
  items: WebsitePreviewItem[];
  source: "cheerio" | "ai" | "mixed";
}

export interface WebsiteImportResult {
  itemsCreated: number;
  itemsUpdated: number;
  profileUpdated: boolean;
  categories: number;
  totalItems: number;
}

export interface WebsiteSyncResult {
  itemsCreated: number;
  itemsUpdated: number;
  categories: number;
  totalItems: number;
}
