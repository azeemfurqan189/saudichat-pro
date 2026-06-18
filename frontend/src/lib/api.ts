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

  getMemberInvite(token: string) {
    return this.request<MemberInvitePreview>(`/auth/invite/${token}`);
  }

  acceptMemberInvite(token: string, data: { phone: string; password: string }) {
    return this.request<{ token: string; user: User; businesses: Business[] }>(
      `/auth/invite/${token}/accept`,
      { method: "POST", body: JSON.stringify(data) }
    );
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

  // Workforce
  getWorkforceMembers(businessId: string) {
    return this.request<BusinessMember[]>(`/businesses/${businessId}/workforce/members`);
  }

  inviteWorkforceMember(
    businessId: string,
    data: { name: string; email: string; phone: string; role: string; department?: string; password?: string; managerId?: string }
  ) {
    return this.request<InviteWorkforceResult>(`/businesses/${businessId}/workforce/members/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateWorkforceMember(businessId: string, memberId: string, data: Partial<BusinessMember>) {
    return this.request<BusinessMember>(`/businesses/${businessId}/workforce/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  getWorkforceStats(businessId: string) {
    return this.request<WorkforceStats>(`/businesses/${businessId}/workforce/stats`);
  }

  getMyWork(businessId: string) {
    return this.request<MyWorkData>(`/businesses/${businessId}/workforce/my-work`);
  }

  getTeamPulse(businessId: string) {
    return this.request<TeamPulseData>(`/businesses/${businessId}/manpower/team-pulse`);
  }

  getEquipmentBoard(businessId: string) {
    return this.request<EquipmentBoardData>(`/businesses/${businessId}/manpower/equipment`);
  }

  createEquipment(
    businessId: string,
    data: Partial<AgencyEquipmentItem> & { name: string }
  ) {
    return this.request<AgencyEquipmentItem>(`/businesses/${businessId}/manpower/equipment`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateEquipment(businessId: string, equipmentId: string, data: Partial<AgencyEquipmentItem>) {
    return this.request<AgencyEquipmentItem>(
      `/businesses/${businessId}/manpower/equipment/${equipmentId}`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  }

  moveEquipment(
    businessId: string,
    equipmentId: string,
    data: { boardColumn: EquipmentColumn; sortOrder?: number }
  ) {
    return this.request<AgencyEquipmentItem>(
      `/businesses/${businessId}/manpower/equipment/${equipmentId}/move`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  reorderEquipment(businessId: string, data: { boardColumn: EquipmentColumn; orderedIds: string[] }) {
    return this.request<EquipmentBoardData>(`/businesses/${businessId}/manpower/equipment/reorder`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteEquipment(businessId: string, equipmentId: string) {
    return this.request(`/businesses/${businessId}/manpower/equipment/${equipmentId}`, {
      method: "DELETE",
    });
  }

  getReminderNotify(businessId: string, itemKey: string) {
    return this.request<import("@/lib/reminder-notify-types").ReminderNotifyConfig>(
      `/businesses/${businessId}/reminder-notify/${encodeURIComponent(itemKey)}`
    );
  }

  saveReminderNotify(
    businessId: string,
    itemKey: string,
    data: import("@/lib/reminder-notify-types").ReminderNotifyConfig
  ) {
    return this.request<import("@/lib/reminder-notify-types").ReminderNotifyConfig>(
      `/businesses/${businessId}/reminder-notify/${encodeURIComponent(itemKey)}`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  getCmmsAccess(businessId: string) {
    return this.request<CmmsAccessInfo>(`/businesses/${businessId}/cmms/access`);
  }

  getCmmsDashboard(businessId: string) {
    return this.request<CmmsDashboardData>(`/businesses/${businessId}/cmms/dashboard`);
  }

  getCmmsAlerts(businessId: string) {
    return this.request<CmmsAlertsData>(`/businesses/${businessId}/cmms/alerts`);
  }

  seedCmmsDemo(businessId: string) {
    return this.request(`/businesses/${businessId}/cmms/seed-demo`, { method: "POST" });
  }

  getFunctionalLocations(businessId: string) {
    return this.request<FunctionalLocation[]>(`/businesses/${businessId}/cmms/locations`);
  }

  getLocationTree(businessId: string) {
    return this.request<LocationTreeData>(`/businesses/${businessId}/cmms/locations/tree`);
  }

  getFunctionalLocation(businessId: string, locationId: string) {
    return this.request<FunctionalLocationDetail>(`/businesses/${businessId}/cmms/locations/${locationId}`);
  }

  createFunctionalLocation(businessId: string, data: Partial<FunctionalLocation> & { code: string; name: string }) {
    return this.request<FunctionalLocation>(`/businesses/${businessId}/cmms/locations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateFunctionalLocation(businessId: string, locationId: string, data: Partial<FunctionalLocation>) {
    return this.request<FunctionalLocationDetail>(`/businesses/${businessId}/cmms/locations/${locationId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteFunctionalLocation(businessId: string, locationId: string) {
    return this.request<{ id: string }>(`/businesses/${businessId}/cmms/locations/${locationId}`, {
      method: "DELETE",
    });
  }

  seedFunctionalLocations(businessId: string) {
    return this.request(`/businesses/${businessId}/cmms/locations/seed`, { method: "POST" });
  }

  getCmmsAssets(businessId: string) {
    return this.request<CmmsAssetRecord[]>(`/businesses/${businessId}/cmms/assets`);
  }

  getAssetTree(businessId: string) {
    return this.request<AssetTreeData>(`/businesses/${businessId}/cmms/assets/tree`);
  }

  getCmmsAsset(businessId: string, assetId: string) {
    return this.request<CmmsAssetRecord>(`/businesses/${businessId}/cmms/assets/${assetId}`);
  }

  createCmmsAsset(businessId: string, data: Partial<CmmsAssetRecord> & { name: string }) {
    return this.request<CmmsAssetRecord>(`/businesses/${businessId}/cmms/assets`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateCmmsAsset(businessId: string, assetId: string, data: Partial<CmmsAssetRecord>) {
    return this.request<CmmsAssetRecord>(`/businesses/${businessId}/cmms/assets/${assetId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteCmmsAsset(businessId: string, assetId: string) {
    return this.request<{ id: string }>(`/businesses/${businessId}/cmms/assets/${assetId}`, {
      method: "DELETE",
    });
  }

  seedAssetRegistry(businessId: string) {
    return this.request(`/businesses/${businessId}/cmms/assets/seed`, { method: "POST" });
  }

  getWorkRequests(businessId: string, status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<WorkRequestRow[]>(`/businesses/${businessId}/cmms/work-requests${q}`);
  }

  createWorkRequest(businessId: string, data: Partial<WorkRequestRow> & { title: string }) {
    return this.request<WorkRequestRow>(`/businesses/${businessId}/cmms/work-requests`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  patchWorkRequest(businessId: string, requestId: string, data: { action: string; reason?: string }) {
    return this.request<WorkRequestRow>(`/businesses/${businessId}/cmms/work-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  getWorkOrders(businessId: string, status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<WorkOrderRow[]>(`/businesses/${businessId}/cmms/work-orders${q}`);
  }

  patchWorkOrder(businessId: string, workOrderId: string, data: Partial<WorkOrderRow>) {
    return this.request<WorkOrderRow>(`/businesses/${businessId}/cmms/work-orders/${workOrderId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  issuePartToWorkOrder(businessId: string, workOrderId: string, data: { sparePartId: string; qty: number }) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/work-orders/${workOrderId}/issue-part`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getPlannerWorkload(businessId: string, weekStart?: string) {
    const q = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
    return this.request<PlannerWorkloadData>(`/businesses/${businessId}/cmms/planner${q}`);
  }

  scheduleWorkOrder(
    businessId: string,
    workOrderId: string,
    data: { date: string; startTime?: string; endTime?: string; assignedMemberId?: string | null }
  ) {
    return this.request<WorkOrderRow>(`/businesses/${businessId}/cmms/planner/work-orders/${workOrderId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  seedPlannerDemo(businessId: string) {
    return this.request<{ skipped: boolean; created?: number; breakdown?: { monday: number; tuesday: number; wednesday: number } }>(
      `/businesses/${businessId}/cmms/planner/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  getCmmsFinanceSummary(businessId: string, year?: number, month?: number) {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (month) params.set("month", String(month));
    const q = params.toString() ? `?${params}` : "";
    return this.request<CmmsFinanceSummaryData>(`/businesses/${businessId}/cmms/finance${q}`);
  }

  getCmmsFinanceConfig(businessId: string) {
    return this.request<CmmsFinanceConfigRow>(`/businesses/${businessId}/cmms/finance/config`);
  }

  updateCmmsFinanceConfig(businessId: string, data: Partial<CmmsFinanceConfigRow>) {
    return this.request<CmmsFinanceConfigRow>(`/businesses/${businessId}/cmms/finance/config`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  syncCmmsFinanceToErp(businessId: string) {
    return this.request<{ payload: Record<string, unknown> }>(`/businesses/${businessId}/cmms/finance/sync`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  seedCmmsFinanceDemo(businessId: string) {
    return this.request<{ skipped: boolean; workOrdersUpdated?: number }>(
      `/businesses/${businessId}/cmms/finance/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  getHrIntegrationSummary(businessId: string) {
    return this.request<HrIntegrationSummaryData>(`/businesses/${businessId}/manpower/hr`);
  }

  getHrIntegrationConfig(businessId: string) {
    return this.request<HrIntegrationConfigRow>(`/businesses/${businessId}/manpower/hr/config`);
  }

  updateHrIntegrationConfig(businessId: string, data: Partial<HrIntegrationConfigRow>) {
    return this.request<HrIntegrationConfigRow>(`/businesses/${businessId}/manpower/hr/config`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  syncHrIntegration(businessId: string) {
    return this.request<{ payload: Record<string, unknown> }>(`/businesses/${businessId}/manpower/hr/sync`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  seedHrIntegrationDemo(businessId: string) {
    return this.request<{ skipped: boolean; workers?: number; certifications?: number; training?: number; attendance?: number }>(
      `/businesses/${businessId}/manpower/hr/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  getCmmsAiEngine(businessId: string) {
    return this.request<CmmsAiEngineData>(`/businesses/${businessId}/cmms/ai-engine`);
  }

  runCmmsAiEngine(businessId: string) {
    return this.request<{ runAt: string; status: string; insights: CmmsAiEngineData }>(
      `/businesses/${businessId}/cmms/ai-engine/run`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  seedCmmsAiEngine(businessId: string) {
    return this.request<{ skipped: boolean; assetsAnalyzed?: number; highRisk?: number }>(
      `/businesses/${businessId}/cmms/ai-engine/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  getNotificationCenter(businessId: string) {
    return this.request<NotificationCenterData>(`/businesses/${businessId}/cmms/notification-center`);
  }

  updateNotificationCenterConfig(businessId: string, data: { eventRules?: Record<string, Record<string, boolean>>; pushEnabled?: boolean }) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/notification-center/config`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  toggleNotificationChannel(businessId: string, channel: string, isEnabled: boolean) {
    return this.request<NotificationCenterData>(
      `/businesses/${businessId}/cmms/notification-center/channels/${channel}`,
      { method: "PATCH", body: JSON.stringify({ isEnabled }) }
    );
  }

  sendTestNotification(businessId: string, channel: string, recipient: string) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/notification-center/test`, {
      method: "POST",
      body: JSON.stringify({ channel, recipient }),
    });
  }

  seedNotificationCenter(businessId: string) {
    return this.request<{ skipped: boolean; created?: number }>(
      `/businesses/${businessId}/cmms/notification-center/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  getCmmsSecurity(businessId: string) {
    return this.request<CmmsSecurityData>(`/businesses/${businessId}/cmms/security`);
  }

  updateMemberCmmsRole(businessId: string, memberId: string, cmmsRole: string) {
    return this.request<CmmsSecurityData>(`/businesses/${businessId}/cmms/security/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ cmmsRole }),
    });
  }

  seedCmmsSecurity(businessId: string) {
    return this.request<{ skipped: boolean; assigned?: number }>(
      `/businesses/${businessId}/cmms/security/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  getMaintenancePlans(businessId: string) {
    return this.request<MaintenancePlanRow[]>(`/businesses/${businessId}/cmms/maintenance-plans`);
  }

  getPmSummary(businessId: string) {
    return this.request<PmSummaryData>(`/businesses/${businessId}/cmms/maintenance-plans/summary`);
  }

  getPmHistory(businessId: string) {
    return this.request<PmHistoryRow[]>(`/businesses/${businessId}/cmms/maintenance-plans/history`);
  }

  createMaintenancePlan(businessId: string, data: Partial<MaintenancePlanRow> & { name: string }) {
    return this.request<MaintenancePlanRow>(`/businesses/${businessId}/cmms/maintenance-plans`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateMaintenancePlan(businessId: string, planId: string, data: Partial<MaintenancePlanRow>) {
    return this.request<MaintenancePlanRow>(`/businesses/${businessId}/cmms/maintenance-plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteMaintenancePlan(businessId: string, planId: string) {
    return this.request<{ id: string }>(`/businesses/${businessId}/cmms/maintenance-plans/${planId}`, {
      method: "DELETE",
    });
  }

  runDuePm(businessId: string) {
    return this.request<{ generated: number; items: Array<{ plan: string; workOrder: string; pmType: string }> }>(
      `/businesses/${businessId}/cmms/maintenance-plans/run-due`,
      { method: "POST" }
    );
  }

  getSpareParts(businessId: string, category?: string) {
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request<SparePartRow[]>(`/businesses/${businessId}/cmms/spare-parts${q}`);
  }

  getInventorySummary(businessId: string) {
    return this.request<InventorySummaryData>(`/businesses/${businessId}/cmms/inventory/summary`);
  }

  getInventoryTransactions(businessId: string, type?: string) {
    const q = type ? `?type=${encodeURIComponent(type)}` : "";
    return this.request<InventoryTransactionRow[]>(`/businesses/${businessId}/cmms/inventory/transactions${q}`);
  }

  postInventoryTransaction(
    businessId: string,
    data: {
      type: "RECEIVE" | "ISSUE" | "TRANSFER" | "RETURN";
      sparePartId: string;
      qty: number;
      reference?: string;
      workOrderId?: string;
      fromLocation?: string;
      toLocation?: string;
      notes?: string;
    }
  ) {
    return this.request<InventoryTransactionRow>(`/businesses/${businessId}/cmms/inventory/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createSparePart(businessId: string, data: Partial<SparePartRow> & { sku: string; name: string }) {
    return this.request<SparePartRow>(`/businesses/${businessId}/cmms/spare-parts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getProcurement(businessId: string) {
    return this.request<PurchaseRequisitionRow[]>(`/businesses/${businessId}/cmms/procurement`);
  }

  createProcurement(businessId: string, data: { lines: Array<{ description: string; qty: number; unitCost?: number }>; supplierId?: string; notes?: string }) {
    return this.request<PurchaseRequisitionRow>(`/businesses/${businessId}/cmms/procurement`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  approveProcurement(businessId: string, requisitionId: string) {
    return this.request<PurchaseRequisitionRow>(
      `/businesses/${businessId}/cmms/procurement/${requisitionId}`,
      { method: "PATCH", body: JSON.stringify({ action: "approve" }) }
    );
  }

  getPurchaseOrders(businessId: string) {
    return this.request<PurchaseOrderRow[]>(`/businesses/${businessId}/cmms/purchase-orders`);
  }

  advancePurchaseOrder(businessId: string, orderId: string, action: "send_to_vendor" | "in_transit" | "deliver") {
    return this.request<PurchaseOrderRow>(`/businesses/${businessId}/cmms/purchase-orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
  }

  getPlanningPrograms(businessId: string) {
    return this.request<PlanningProgramRow[]>(`/businesses/${businessId}/planning/programs`);
  }

  getPlanningDashboard(businessId: string) {
    return this.request<PlanningDashboardData>(`/businesses/${businessId}/planning/dashboard`);
  }

  createPlanningProgram(businessId: string, data: { name: string; code?: string; description?: string }) {
    return this.request<PlanningProgramRow>(`/businesses/${businessId}/planning/programs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createPlanningProject(
    businessId: string,
    data: { name: string; code?: string; programId?: string; agencyProjectId?: string; plannedStart?: string }
  ) {
    return this.request<PlanningProjectListRow>(`/businesses/${businessId}/planning/projects`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  patchPlanningProject(
    businessId: string,
    projectId: string,
    data: Partial<{
      name: string;
      calendarConfig: object;
      penaltyPerDay: number;
      shiftHours: number;
      plannedStart: string;
      agencyProjectId: string | null;
    }>
  ) {
    return this.request<PlanningProjectListRow>(`/businesses/${businessId}/planning/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  createPlanningWbs(businessId: string, projectId: string, data: { code: string; name: string; parentId?: string }) {
    return this.request<WbsNodeRow>(`/businesses/${businessId}/planning/projects/${projectId}/wbs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createPlanningActivity(
    businessId: string,
    projectId: string,
    data: { name: string; code?: string; wbsNodeId?: string; durationDays?: number; laborCost?: number; materialCost?: number; equipmentTag?: string }
  ) {
    return this.request<ScheduleActivityRow>(`/businesses/${businessId}/planning/projects/${projectId}/activities`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  importPlanningCsv(businessId: string, projectId: string, csv: string, format?: "csv" | "xer", clearExisting?: boolean) {
    return this.request<{ imported: number }>(`/businesses/${businessId}/planning/projects/${projectId}/import`, {
      method: "POST",
      body: JSON.stringify({ csv, format, clearExisting }),
    });
  }

  shiftPlanningActivity(businessId: string, activityId: string, startOverrideDays: number) {
    return this.request<ScheduleActivityRow>(`/businesses/${businessId}/planning/activities/${activityId}/shift`, {
      method: "POST",
      body: JSON.stringify({ startOverrideDays }),
    });
  }

  runPlanningScenario(
    businessId: string,
    projectId: string,
    params: {
      workerShortage?: { workersRemoved: number; tradeRole?: string };
      materialDelayDays?: number;
      equipmentDelayDays?: number;
      equipmentTag?: string;
      activityDelay?: { activityId: string; extraDays: number };
      label?: string;
    }
  ) {
    return this.request<PlanningScenarioResult>(`/businesses/${businessId}/planning/projects/${projectId}/simulate`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  runPlanningBatchSimulation(businessId: string, projectId: string, maxScenarios?: number) {
    return this.request<PlanningBatchSimulation>(`/businesses/${businessId}/planning/projects/${projectId}/simulate-batch`, {
      method: "POST",
      body: JSON.stringify({ maxScenarios: maxScenarios ?? 100 }),
    });
  }

  getPlanningRiskReport(businessId: string, projectId: string) {
    return this.request<PlanningRiskReport>(`/businesses/${businessId}/planning/projects/${projectId}/risk-report`);
  }

  getPlanningChangeOrders(businessId: string, projectId: string) {
    return this.request<ScheduleChangeOrderRow[]>(`/businesses/${businessId}/planning/projects/${projectId}/change-orders`);
  }

  createPlanningChangeOrder(
    businessId: string,
    projectId: string,
    data: { title: string; description?: string; scopeChange?: string; costImpactSar?: number; scheduleImpactDays?: number }
  ) {
    return this.request<ScheduleChangeOrderRow>(`/businesses/${businessId}/planning/projects/${projectId}/change-orders`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  patchPlanningChangeOrder(businessId: string, changeOrderId: string, action: "submit" | "approve" | "reject", rejectionReason?: string) {
    return this.request<ScheduleChangeOrderRow>(`/businesses/${businessId}/planning/change-orders/${changeOrderId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, rejectionReason }),
    });
  }

  getPlanningProjects(businessId: string, programId?: string) {
    const q = programId ? `?programId=${encodeURIComponent(programId)}` : "";
    return this.request<PlanningProjectListRow[]>(`/businesses/${businessId}/planning/projects${q}`);
  }

  getPlanningProject(businessId: string, projectId: string) {
    return this.request<PlanningProjectDetail>(`/businesses/${businessId}/planning/projects/${projectId}`);
  }

  syncPlanningEvm(businessId: string, projectId: string) {
    return this.request<EvmIntegrationSummary & { activitiesUpdated: number }>(
      `/businesses/${businessId}/planning/projects/${projectId}/sync-evm`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  seedPlanningDemo(businessId: string) {
    return this.request<{ skipped: boolean; programId?: string; projectId?: string }>(
      `/businesses/${businessId}/planning/seed`,
      { method: "POST", body: JSON.stringify({}) }
    );
  }

  createPlanningDependency(
    businessId: string,
    projectId: string,
    data: { predecessorId: string; successorId: string; type?: string; lagDays?: number }
  ) {
    return this.request<ActivityDependencyRow>(
      `/businesses/${businessId}/planning/projects/${projectId}/dependencies`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  recalculatePlanning(businessId: string, projectId: string) {
    return this.request<unknown>(`/businesses/${businessId}/planning/projects/${projectId}/recalculate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  createPlanningBaseline(businessId: string, projectId: string, name?: string) {
    return this.request<unknown>(`/businesses/${businessId}/planning/projects/${projectId}/baseline`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  simulatePlanningDelay(businessId: string, projectId: string, data: { activityId: string; extraDays: number }) {
    return this.request<PlanningSimulationResult>(
      `/businesses/${businessId}/planning/projects/${projectId}/simulate`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  releasePlanningActivity(businessId: string, activityId: string) {
    return this.request<WorkOrderRow>(`/businesses/${businessId}/planning/activities/${activityId}/release`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  getPlanningLeveling(businessId: string, projectId: string) {
    return this.request<PlanningLevelingData>(`/businesses/${businessId}/planning/projects/${projectId}/leveling`);
  }

  getPlanningSCurve(businessId: string, projectId: string) {
    return this.request<PlanningSCurveData>(`/businesses/${businessId}/planning/projects/${projectId}/s-curve`);
  }

  getPlanningResourceForecast(businessId: string, projectId: string) {
    return this.request<PlanningResourceForecastData>(`/businesses/${businessId}/planning/projects/${projectId}/resource-forecast`);
  }

  getCmmsMtbfMttr(businessId: string, equipmentId?: string) {
    const q = equipmentId ? `?equipmentId=${equipmentId}` : "";
    return this.request<MtbfMttrRow[]>(`/businesses/${businessId}/cmms/reliability/mtbf-mttr${q}`);
  }

  getAssetHierarchy(businessId: string, equipmentId: string) {
    return this.request<AssetHierarchyData>(`/businesses/${businessId}/cmms/assets/${equipmentId}/hierarchy`);
  }

  postAssetComponent(businessId: string, equipmentId: string, data: { name: string; partNumber?: string; sparePartId?: string; parentComponentId?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/assets/${equipmentId}/components`, { method: "POST", body: JSON.stringify(data) });
  }

  postAssetBomItem(businessId: string, equipmentId: string, data: { sparePartId: string; qty?: number; componentId?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/assets/${equipmentId}/bom`, { method: "POST", body: JSON.stringify(data) });
  }

  postAssetMeterReading(businessId: string, equipmentId: string, data: { readingType?: string; value: number; source?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/assets/${equipmentId}/meter-readings`, { method: "POST", body: JSON.stringify(data) });
  }

  getBomSuggestions(businessId: string, equipmentId: string) {
    return this.request<BomSuggestionRow[]>(`/businesses/${businessId}/cmms/assets/${equipmentId}/bom-suggestions`);
  }

  getMeterReadings(businessId: string, equipmentId?: string) {
    const q = equipmentId ? `?equipmentId=${equipmentId}` : "";
    return this.request<MeterReadingRow[]>(`/businesses/${businessId}/cmms/meter-readings${q}`);
  }

  getIotMonitoring(businessId: string) {
    return this.request<IotMonitoringData>(`/businesses/${businessId}/cmms/iot-monitoring`);
  }

  postIotIngest(businessId: string, readings: Array<{ equipmentId: string; readingType: string; value: number; source?: string }>) {
    return this.request<{ ingested: number }>(`/businesses/${businessId}/cmms/iot-monitoring/ingest`, {
      method: "POST",
      body: JSON.stringify({ readings }),
    });
  }

  postAssetQrToken(businessId: string, equipmentId: string) {
    return this.request<{ token: string; scanUrl: string }>(`/businesses/${businessId}/cmms/assets/${equipmentId}/qr-token`, { method: "POST", body: JSON.stringify({}) });
  }

  getCalibrations(businessId: string) {
    return this.request<CalibrationSummaryData>(`/businesses/${businessId}/cmms/calibrations`);
  }

  postCalibration(businessId: string, data: { instrumentName: string; equipmentId?: string; nextDueAt?: string; certNumber?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/cmms/calibrations`, { method: "POST", body: JSON.stringify(data) });
  }

  postAutoWoFromPredictions(businessId: string, minRisk?: "HIGH" | "CRITICAL") {
    return this.request<{ created: Array<{ assetName: string; workOrderNumber: string }>; count: number }>(
      `/businesses/${businessId}/cmms/ai-engine/auto-work-orders`,
      { method: "POST", body: JSON.stringify({ minRisk }) }
    );
  }

  getProjectFinancials(businessId: string, projectId: string) {
    return this.request<ProjectFinancialControlData>(`/businesses/${businessId}/manpower/projects/${projectId}/financials`);
  }

  getSubcontractors(businessId: string) {
    return this.request<SubcontractorRow[]>(`/businesses/${businessId}/manpower/subcontractors`);
  }

  postSubcontractor(businessId: string, data: { name: string; trade?: string; contactEmail?: string }) {
    return this.request<SubcontractorRow>(`/businesses/${businessId}/manpower/subcontractors`, { method: "POST", body: JSON.stringify(data) });
  }

  postSubcontractorPo(businessId: string, data: { subcontractorId: string; projectId?: string; amountSar: number; description?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/subcontractors/pos`, { method: "POST", body: JSON.stringify(data) });
  }

  postMilestoneInvoice(businessId: string, milestoneId: string, physicalProgressPct: number) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/milestones/${milestoneId}/invoice`, {
      method: "POST",
      body: JSON.stringify({ physicalProgressPct }),
    });
  }

  postReleaseRetention(businessId: string, milestoneId: string) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/milestones/${milestoneId}/release-retention`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  postMilestone(businessId: string, projectId: string, data: { name: string; triggerPercent?: number; invoiceAmountSar: number; retentionPct?: number }) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getClientInvoices(businessId: string, agencyProjectId?: string) {
    const q = agencyProjectId ? `?agencyProjectId=${agencyProjectId}` : "";
    return this.request<ClientInvoiceRow[]>(`/businesses/${businessId}/manpower/client-invoices${q}`);
  }

  postClientInvoice(businessId: string, data: { agencyProjectId: string; amountSar: number; description?: string; dueAt?: string }) {
    return this.request<ClientInvoiceRow>(`/businesses/${businessId}/manpower/client-invoices`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  seedProjectFinance(businessId: string, projectId: string) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/projects/${projectId}/finance-seed`, { method: "POST", body: JSON.stringify({}) });
  }

  getHrAdvanced(businessId: string) {
    return this.request<HrAdvancedData>(`/businesses/${businessId}/manpower/hr/advanced`);
  }

  postLeaveRequest(businessId: string, data: { workerProfileId: string; leaveType?: string; startDate: string; endDate: string; notes?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/hr/leave-requests`, { method: "POST", body: JSON.stringify(data) });
  }

  approveLeaveRequest(businessId: string, requestId: string) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/hr/leave-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "approve" }),
    });
  }

  postCompetency(businessId: string, data: { workerProfileId: string; skill: string; grade: string }) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/hr/competencies`, { method: "POST", body: JSON.stringify(data) });
  }

  postSuccessionPlan(businessId: string, data: { workerProfileId: string; replacementWorkerId: string; role?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/hr/successions`, { method: "POST", body: JSON.stringify(data) });
  }

  postTrainingRecord(businessId: string, data: { workerProfileId: string; title: string; trainingType?: string; dueAt?: string }) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/hr/training-records`, { method: "POST", body: JSON.stringify(data) });
  }

  seedHrAdvanced(businessId: string) {
    return this.request<unknown>(`/businesses/${businessId}/manpower/hr/advanced-seed`, { method: "POST", body: JSON.stringify({}) });
  }

  getPublicAssetScan(token: string) {
    return this.request<PublicAssetScanData>(`/public/asset/${token}`);
  }

  getPlanningAiInsights(businessId: string, projectId: string) {
    return this.request<PlanningAiInsightsData>(`/businesses/${businessId}/planning/projects/${projectId}/ai-insights`);
  }

  patchPlanningActivity(businessId: string, activityId: string, data: Partial<ScheduleActivityRow>) {
    return this.request<ScheduleActivityRow>(`/businesses/${businessId}/planning/activities/${activityId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  getShifts(businessId: string) {
    return this.request<WorkShift[]>(`/businesses/${businessId}/workforce/shifts`);
  }

  createShift(businessId: string, data: Partial<WorkShift>) {
    return this.request<WorkShift>(`/businesses/${businessId}/workforce/shifts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getAttendance(businessId: string) {
    return this.request<AttendanceRecord[]>(`/businesses/${businessId}/workforce/attendance`);
  }

  checkIn(businessId: string, data?: { latitude?: number; longitude?: number }) {
    return this.request<AttendanceRecord>(`/businesses/${businessId}/workforce/attendance/check-in`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    });
  }

  checkOut(businessId: string) {
    return this.request<AttendanceRecord>(`/businesses/${businessId}/workforce/attendance/check-out`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  getManpowerClients(businessId: string) {
    return this.request<ClientCompany[]>(`/businesses/${businessId}/manpower/clients`);
  }

  getManpowerClient(businessId: string, clientId: string) {
    return this.request<ClientCompanyDetail>(`/businesses/${businessId}/manpower/clients/${clientId}`);
  }

  createManpowerClient(businessId: string, data: Partial<ClientCompany>) {
    return this.request<ClientCompany>(`/businesses/${businessId}/manpower/clients`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getManpowerProjects(businessId: string) {
    return this.request<AgencyProject[]>(`/businesses/${businessId}/manpower/projects`);
  }

  getManpowerProject(businessId: string, projectId: string) {
    return this.request<AgencyProjectDetail>(`/businesses/${businessId}/manpower/projects/${projectId}`);
  }

  createManpowerProject(businessId: string, data: Partial<AgencyProject>) {
    return this.request<AgencyProject>(`/businesses/${businessId}/manpower/projects`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateManpowerProject(businessId: string, projectId: string, data: Partial<AgencyProject>) {
    return this.request<AgencyProject>(`/businesses/${businessId}/manpower/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteManpowerProject(businessId: string, projectId: string) {
    return this.request(`/businesses/${businessId}/manpower/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  getManpowerAnalytics(businessId: string) {
    return this.request<ManpowerAnalytics>(`/businesses/${businessId}/manpower/analytics`);
  }

  loadManpowerDemo(businessId: string, force = false) {
    return this.request<DemoSeedResult>(`/businesses/${businessId}/manpower/seed-demo?force=${force}`, {
      method: "POST",
    });
  }

  syncManpowerSchema(businessId: string) {
    return this.request<{ agencyProjectTable?: boolean; message?: string }>(
      `/businesses/${businessId}/manpower/sync-schema`,
      { method: "POST" }
    );
  }

  getManpowerWorkers(businessId: string) {
    return this.request<WorkerProfile[]>(`/businesses/${businessId}/manpower/workers`);
  }

  createManpowerWorker(businessId: string, data: Partial<WorkerProfile> & { password?: string }) {
    return this.request<WorkerProfile>(`/businesses/${businessId}/manpower/workers`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getWorkerCategories(businessId: string) {
    return this.request<{
      groups: Array<{ label: string; labelAr: string; items: string[] }>;
      all: string[];
      custom: string[];
      presetCount: number;
    }>(`/businesses/${businessId}/manpower/worker-categories`);
  }

  addProjectWorker(businessId: string, projectId: string, data: Partial<WorkerProfile> & { password?: string; startDate?: string }) {
    return this.request<{ worker: WorkerProfile; placement: Placement }>(
      `/businesses/${businessId}/manpower/projects/${projectId}/workers`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  getProjectWorkerAttendance(businessId: string, projectId: string, date: string) {
    return this.request<WorkerDailyAttendance[]>(
      `/businesses/${businessId}/manpower/projects/${projectId}/attendance?date=${encodeURIComponent(date)}`
    );
  }

  setProjectWorkerAttendance(
    businessId: string,
    projectId: string,
    data: { workerProfileId: string; workDate: string; status: "PRESENT" | "ABSENT" }
  ) {
    return this.request<WorkerDailyAttendance>(
      `/businesses/${businessId}/manpower/projects/${projectId}/attendance`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  getProjectPermissionCatalog(businessId: string) {
    return this.request<ProjectPermissionDef[]>(`/businesses/${businessId}/manpower/permissions/catalog`);
  }

  getMyProjectAccess(businessId: string) {
    return this.request<MyProjectAccessRow[]>(`/businesses/${businessId}/manpower/my-project-access`);
  }

  getProjectAccessList(businessId: string, projectId: string) {
    return this.request<ProjectAccessGrant[]>(
      `/businesses/${businessId}/manpower/projects/${projectId}/access`
    );
  }

  upsertProjectAccess(
    businessId: string,
    projectId: string,
    data: { memberId?: string; phone?: string; name?: string; permissions: string[] }
  ) {
    return this.request<ProjectAccessSaveResult>(
      `/businesses/${businessId}/manpower/projects/${projectId}/access`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  removeProjectAccess(businessId: string, projectId: string, memberId: string) {
    return this.request(
      `/businesses/${businessId}/manpower/projects/${projectId}/access/${memberId}`,
      { method: "DELETE" }
    );
  }

  getManpowerPlacements(businessId: string) {
    return this.request<Placement[]>(`/businesses/${businessId}/manpower/placements`);
  }

  createManpowerPlacement(businessId: string, data: Partial<Placement>) {
    return this.request<Placement>(`/businesses/${businessId}/manpower/placements`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateManpowerPlacement(businessId: string, placementId: string, data: Partial<Placement>) {
    return this.request<Placement>(`/businesses/${businessId}/manpower/placements/${placementId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteManpowerPlacement(businessId: string, placementId: string) {
    return this.request<{ id: string }>(`/businesses/${businessId}/manpower/placements/${placementId}`, {
      method: "DELETE",
    });
  }

  getManpowerTimesheets(businessId: string) {
    return this.request<Timesheet[]>(`/businesses/${businessId}/manpower/timesheets`);
  }

  createManpowerTimesheet(businessId: string, data: Partial<Timesheet> & { regularHours?: number; overtimeHours?: number }) {
    return this.request<Timesheet>(`/businesses/${businessId}/manpower/timesheets`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async downloadManpowerTimesheetExport(
    businessId: string,
    opts: {
      month?: string;
      period?: "weekly" | "monthly";
      projectId?: string;
      workerProfileId?: string;
      workerName?: string;
    } = {}
  ) {
    const params = new URLSearchParams();
    if (opts.month) params.set("month", opts.month);
    if (opts.period) params.set("period", opts.period);
    if (opts.projectId) params.set("projectId", opts.projectId);
    if (opts.workerProfileId) params.set("workerProfileId", opts.workerProfileId);
    const token = this.getToken();
    const res = await fetch(
      `${API_URL}/businesses/${businessId}/manpower/timesheets/export?${params.toString()}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Export failed");
    }
    const blob = await res.blob();
    const month = opts.month || new Date().toISOString().slice(0, 7);
    const slug = opts.workerName?.replace(/\s+/g, "-").slice(0, 24) || opts.workerProfileId?.slice(0, 8) || "all";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${slug}-${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  updateManpowerTimesheetStatus(businessId: string, timesheetId: string, status: TimesheetStatus) {
    return this.request<Timesheet>(`/businesses/${businessId}/manpower/timesheets/${timesheetId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  timesheetAction(
    businessId: string,
    timesheetId: string,
    data: { action: TimesheetAction; rejectReason?: string }
  ) {
    return this.request<Timesheet>(`/businesses/${businessId}/manpower/timesheets/${timesheetId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  bulkTimesheetAction(
    businessId: string,
    data: { action: TimesheetAction; ids: string[]; rejectReason?: string }
  ) {
    return this.request<{ approved: number; failed: number; results: Array<{ id: string; ok: boolean; error?: string }> }>(
      `/businesses/${businessId}/manpower/timesheets/bulk-action`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  getPendingTimesheets(businessId: string) {
    return this.request<Timesheet[]>(`/businesses/${businessId}/manpower/timesheets/pending`);
  }

  getManpowerPolicy(businessId: string) {
    return this.request<ManpowerPolicy>(`/businesses/${businessId}/manpower/policy`);
  }

  updateManpowerPolicy(businessId: string, data: Partial<ManpowerPolicy>) {
    return this.request<ManpowerPolicy>(`/businesses/${businessId}/manpower/policy`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  getManpowerLiveDashboard(businessId: string) {
    return this.request<ManpowerLiveDashboard>(`/businesses/${businessId}/manpower/live-dashboard`);
  }

  getCommandCenter(businessId: string) {
    return this.request<CommandCenterBriefing>(`/businesses/${businessId}/command-center`);
  }

  askCompany(businessId: string, question: string) {
    return this.request<AskCompanyResult>(`/businesses/${businessId}/ask-company`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  }

  getCompanyReminders(businessId: string) {
    return this.request<CompanyReminder[]>(`/businesses/${businessId}/company-reminders`);
  }

  saveCompanyReminder(businessId: string, data: Partial<CompanyReminder>) {
    return this.request<CompanyReminder>(`/businesses/${businessId}/company-reminders`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteCompanyReminder(businessId: string, reminderId: string) {
    return this.request(`/businesses/${businessId}/company-reminders/${reminderId}`, { method: "DELETE" });
  }

  async downloadManpowerCeoReport(businessId: string, days = 7) {
    const token = this.getToken();
    const res = await fetch(
      `${API_URL}/businesses/${businessId}/manpower/reports/ceo-pdf?days=${days}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("PDF download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manpower-ceo-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async downloadTimesheetImportTemplate(businessId: string) {
    const token = this.getToken();
    const res = await fetch(
      `${API_URL}/businesses/${businessId}/manpower/timesheets/import-template`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error("Template download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timesheet-import-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async uploadTimesheetImport(businessId: string, file: File) {
    const token = this.getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/businesses/${businessId}/manpower/timesheets/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    let data: ApiResponse<TimesheetImportResult>;
    try {
      data = JSON.parse(text) as ApiResponse<TimesheetImportResult>;
    } catch {
      throw new Error("Import failed");
    }
    if (!res.ok) throw new Error(data.message || "Import failed");
    return data;
  }

  getWorkerQrCode(businessId: string, workerId: string) {
    return this.request<WorkerQrData>(`/businesses/${businessId}/manpower/workers/${workerId}/qr`);
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
  memberRole?: "OWNER" | "MANAGER" | "OFFICE_STAFF" | "FIELD_WORKER";
  memberId?: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: "OWNER" | "MANAGER" | "OFFICE_STAFF" | "FIELD_WORKER";
  managerId?: string | null;
  department?: string | null;
  isActive: boolean;
  joinedAt?: string;
  user?: User;
  manager?: { id: string; user?: { name: string } };
}

export interface MemberInvitePayload {
  inviteUrl: string;
  phone: string;
  tempPassword: string;
  smsAttempted: boolean;
  emailAttempted: boolean;
}

export interface MemberInvitePreview {
  valid: boolean;
  businessName?: string;
  userName?: string;
  phone?: string;
  email?: string | null;
  role?: string;
  expiresAt?: string;
  reason?: string;
}

export interface InviteWorkforceResult {
  member: BusinessMember;
  invite: MemberInvitePayload | null;
}

export interface ProjectAccessSaveResult {
  grant: ProjectAccessGrant;
  invite: MemberInvitePayload | null;
}

export interface WorkforceStats {
  totalMembers: number;
  managers: number;
  staffCount: number;
  todayShifts: number;
  todayAttendance: number;
  openTasks: number;
  role: string;
}

export interface TeamPulseData {
  summary: {
    staffTotal: number;
    staffCheckedIn: number;
    todayShifts: number;
    openTasks: number;
    pendingTimesheets: number;
    workersPresent: number;
    workersAbsent: number;
  };
  members: Array<{ id: string; name: string; role: string; phone?: string; checkedIn: boolean }>;
  shifts: Array<{ id: string; memberName: string; startTime: string; endTime: string; date: string }>;
  staffAttendance: Array<{ id: string; memberName: string; checkInAt?: string; checkOutAt?: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; dueDate?: string }>;
  siteAttendance: Array<{ status: string; count: number }>;
}

export interface WorkShift {
  id: string;
  businessId: string;
  memberId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  member?: { user?: { name: string; phone?: string } };
}

export interface AttendanceRecord {
  id: string;
  businessId: string;
  memberId: string;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  member?: { user?: { name: string } };
}

export interface MyWorkData {
  shifts: WorkShift[];
  tasks: Task[];
  conversations: Conversation[];
  attendance: AttendanceRecord | null;
  memberId: string;
  role: string;
  project?: MyWorkProject | null;
  siteLocation?: string | null;
}

export interface MyWorkProject {
  id: string;
  name: string;
  siteName?: string;
  siteAddress?: string;
  city?: string;
  clientName?: string;
  status?: string;
}

export interface ClientCompany {
  id: string;
  businessId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
  _count?: { projects: number; placements: number };
}

export interface ClientCompanyDetail extends ClientCompany {
  projects: AgencyProject[];
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalWorkers: number;
    totalHours: number;
    pendingTimesheets: number;
  };
}

export type EquipmentColumn = "STOCK" | "ISSUED" | "INSPECTION" | "MAINTENANCE";

export interface AgencyEquipmentItem {
  id: string;
  businessId: string;
  name: string;
  assetNumber?: string | null;
  assetTag?: string | null;
  description?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  functionalLocationId?: string | null;
  criticality?: string | null;
  assetStatus?: string | null;
  installationDate?: string | null;
  purchaseCost?: number | null;
  replacementCost?: number | null;
  warrantyExpiry?: string | null;
  drawingUrl?: string | null;
  documentUrls?: unknown;
  photoUrls?: unknown;
  quantity: number;
  boardColumn: EquipmentColumn;
  sortOrder: number;
  projectId?: string | null;
  workerProfileId?: string | null;
  issuedAt?: string | null;
  expectedReturnAt?: string | null;
  lastInspectionAt?: string | null;
  nextInspectionAt?: string | null;
  condition: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: { id: string; name: string; siteName?: string | null } | null;
  workerProfile?: { id: string; name: string } | null;
  functionalLocation?: { id: string; code: string; name: string; type: string } | null;
  parentEquipmentId?: string | null;
  runningHours?: number | null;
}

export interface CmmsAssetRecord extends AgencyEquipmentItem {
  workRequests?: Array<{ id: string; number: string; title: string; status: string }>;
  workOrders?: Array<{ id: string; number: string; title: string; status: string }>;
  maintenancePlans?: Array<{ id: string; name: string; nextDueAt?: string | null }>;
}

export type AssetTreeNode =
  | { kind: "location"; id: string; code: string; name: string; type: string; children: AssetTreeNode[] }
  | { kind: "asset"; asset: CmmsAssetRecord };

export interface AssetTreeData {
  tree: AssetTreeNode[];
  unassigned: CmmsAssetRecord[];
  summary: {
    totalAssets: number;
    totalLocations: number;
    critical: number;
    unassigned: number;
  };
}

export interface EquipmentBoardData {
  columns: Record<EquipmentColumn, AgencyEquipmentItem[]>;
  summary: {
    total: number;
    stock: number;
    issued: number;
    inspection: number;
    maintenance: number;
    inspectionOverdue: number;
  };
}

export interface CmmsAccessInfo {
  role: string;
  level: "OWNER" | "OFFICE" | "SITE";
  layers: Record<string, string[]>;
}

export interface CmmsDashboardData {
  summary: {
    assets: number;
    locations: number;
    openWorkRequests: number;
    openWorkOrders: number;
    pmDue: number;
    lowStock: number;
    pendingProcurement: number;
    totalMaintenanceCost: number;
    totalDowntimeMinutes: number;
  };
  recentWorkOrders: WorkOrderRow[];
  flow: string[];
}

export interface CmmsAlertItem {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  detail?: string;
  href: string;
  assetTag?: string | null;
}

export interface CmmsAlertsData {
  summary: {
    inspectionOverdue: number;
    pmDue: number;
    warrantyExpiring: number;
    lowStock: number;
    openRequests: number;
    total: number;
  };
  items: CmmsAlertItem[];
}

export interface FunctionalLocation {
  id: string;
  businessId: string;
  code: string;
  name: string;
  description?: string | null;
  type: string;
  parentId?: string | null;
  projectId?: string | null;
  address?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  parent?: { id: string; code: string; name: string } | null;
  project?: {
    id: string;
    name: string;
    siteName?: string | null;
    clientCompany?: { id: string; name: string } | null;
  } | null;
  _count?: { equipment: number; children: number };
}

export interface LocationTreeNode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: string;
  address?: string | null;
  parentId?: string | null;
  assetCount: number;
  childCount: number;
  children: LocationTreeNode[];
}

export interface LocationTreeData {
  tree: LocationTreeNode[];
  summary: {
    totalLocations: number;
    rootLocations: number;
    maxDepth: number;
    totalAssets: number;
  };
}

export interface FunctionalLocationDetail extends FunctionalLocation {
  breadcrumb?: Array<{ id: string; code: string; name: string; type: string }>;
  children?: Array<FunctionalLocation & { _count?: { equipment: number; children: number } }>;
  equipment?: Array<{
    id: string;
    name: string;
    assetTag?: string | null;
    assetNumber?: string | null;
    criticality?: string | null;
  }>;
}

export interface WorkRequestRow {
  id: string;
  number: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  equipmentId?: string | null;
  functionalLocationId?: string | null;
  projectId?: string | null;
  equipment?: { id: string; name: string; assetTag?: string | null } | null;
  functionalLocation?: { id: string; code: string; name: string } | null;
  project?: { id: string; name: string } | null;
  workOrder?: { id: string; number: string; status: string } | null;
  createdAt?: string;
}

export interface WorkOrderRow {
  id: string;
  number: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description?: string | null;
  assignedMemberId?: string | null;
  downtimeMinutes?: number | null;
  laborCost?: number | null;
  partsCost?: number | null;
  completedAt?: string | null;
  equipment?: { id: string; name: string; assetTag?: string | null } | null;
  functionalLocation?: { id: string; code: string; name: string } | null;
  project?: { id: string; name: string } | null;
  workRequest?: { id: string; number: string } | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  createdAt?: string;
}

export interface PlannerJobRow {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  assignedMemberId?: string | null;
  equipment?: { id: string; name: string; assetTag?: string | null } | null;
  functionalLocation?: { id: string; code: string; name: string } | null;
}

export interface PlannerDayRow {
  date: string;
  label: string;
  labelAr: string;
  jobCount: number;
  jobs: PlannerJobRow[];
}

export interface PlannerWorkloadData {
  weekStart: string;
  weekEnd: string;
  days: PlannerDayRow[];
  unscheduled: PlannerJobRow[];
  totals: {
    scheduledThisWeek: number;
    unscheduledBacklog: number;
    peakDay: PlannerDayRow;
  };
}

export interface CmmsFinanceConfigRow {
  id: string;
  businessId: string;
  erpSystem: string;
  erpEndpoint?: string | null;
  companyCode?: string | null;
  clientId?: string | null;
  glAccount: string;
  costCenter: string;
  isConnected: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
  annualBudget: number;
  laborHourlyRate: number;
  monthlyBudgets?: Record<string, number>;
}

export interface CmmsFinanceSummaryData {
  period: { year: number; month: number };
  erp: {
    system: string;
    endpoint?: string | null;
    companyCode?: string | null;
    glAccount: string;
    costCenter: string;
    isConnected: boolean;
    lastSyncAt?: string | null;
    lastSyncStatus?: string | null;
    lastSyncMessage?: string | null;
  };
  budget: {
    annual: number;
    monthly: number;
    remaining: number;
    variance: number;
    utilizationPct: number;
  };
  costs: {
    actual: number;
    labor: number;
    material: number;
    jobCount: number;
  };
  monthlyTrend: Array<{
    month: number;
    budget: number;
    actual: number;
    labor: number;
    material: number;
    variance: number;
  }>;
  recentJobs: Array<{
    id: string;
    number: string;
    title: string;
    status: string;
    laborCost?: number | null;
    partsCost?: number | null;
    completedAt?: string | null;
    functionalLocation?: { name: string } | null;
  }>;
}

export interface HrIntegrationConfigRow {
  id: string;
  businessId: string;
  hrSystem: string;
  hrEndpoint?: string | null;
  companyCode?: string | null;
  isConnected: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
}

export interface HrEmployeeRow {
  id: string;
  name: string;
  category?: string | null;
  status: string;
  skills: string[];
  certifications: Array<{
    id: string;
    name: string;
    issuer?: string | null;
    certNumber?: string | null;
    expiresAt?: string | null;
    status: string;
  }>;
  training: Array<{
    id: string;
    title: string;
    trainingType: string;
    status: string;
    completedAt?: string | null;
    dueAt?: string | null;
    hours?: number | null;
  }>;
  attendance: { present: number; absent: number; lastStatus?: string };
}

export interface HrIntegrationSummaryData {
  hr: {
    system: string;
    endpoint?: string | null;
    companyCode?: string | null;
    isConnected: boolean;
    lastSyncAt?: string | null;
    lastSyncStatus?: string | null;
    lastSyncMessage?: string | null;
  };
  stats: {
    workers: number;
    totalSkills: number;
    certifications: number;
    expiringCerts: number;
    expiredCerts: number;
    trainingCompleted: number;
    trainingDue: number;
    attendanceThisMonth: number;
    presentRate: number;
  };
  employees: HrEmployeeRow[];
  pillars: string[];
}

export interface CmmsAiFailureItem {
  assetId: string;
  assetName: string;
  assetTag?: string | null;
  location?: string | null;
  risk: string;
  score: number;
  failureProbability: number;
  predictedWindowDays: number;
  factors: string[];
  recommendation: string;
}

export interface CmmsAiSpareForecastItem {
  sparePartId: string;
  sku: string;
  name: string;
  category?: string | null;
  stockQty: number;
  reorderPoint: number;
  monthlyUsage: number;
  forecast30d: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  urgency: string;
}

export interface CmmsAiEngineData {
  generatedAt: string;
  engineVersion: string;
  capabilities: string[];
  summary: {
    assetsAnalyzed: number;
    highRiskAssets: number;
    partsToReorder: number;
    predictedDowntimeHours: number;
    optimizationActions: number;
    confidencePct: number;
  };
  failurePrediction: {
    items: CmmsAiFailureItem[];
    topRisk: CmmsAiFailureItem | null;
  };
  spareDemandForecast: {
    items: CmmsAiSpareForecastItem[];
    totalReorderValue: number;
    horizonDays: number;
  };
  downtimePrediction: {
    predictedMinutes: number;
    predictedHours: number;
    predictedDays: number;
    horizonDays: number;
    trend: string;
    items: Array<{
      assetId: string | null;
      assetName: string;
      location: string | null;
      predictedMinutes: number;
      predictedHours: number;
      drivers: string[];
    }>;
  };
  maintenanceOptimization: {
    recommendations: Array<{
      type: string;
      priority: string;
      title: string;
      detail: string;
      savingsEstimate?: string;
    }>;
  };
}

export interface NotificationCenterData {
  channels: Array<{
    channel: string;
    label: string;
    labelAr: string;
    isEnabled: boolean;
    configured: boolean;
    lastSyncAt?: string | null;
  }>;
  eventRules: Record<string, Partial<Record<string, boolean>>>;
  eventTypes: Array<{ key: string; label: string; labelAr: string }>;
  stats: {
    totalDeliveries: number;
    sentToday: number;
    inAppUnread: number;
    byChannel: Record<string, number>;
  };
  recentDeliveries: Array<{
    id: string;
    channel: string;
    eventType: string;
    recipient?: string | null;
    title: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
  defaultRecipient: { email?: string | null; phone?: string | null };
}

export interface CmmsSecurityData {
  roles: Array<{ key: string; labelEn: string; labelAr: string; layer: string }>;
  modules: Array<{ key: string; labelEn: string; labelAr: string }>;
  actions: string[];
  roleMatrix: Array<{
    role: string;
    labelEn: string;
    labelAr: string;
    layer: string;
    modules: Array<{
      module: string;
      labelEn: string;
      labelAr: string;
      permissions: Record<string, boolean>;
    }>;
  }>;
  defaultRoleMap: Record<string, string>;
  team: Array<{
    memberId: string;
    name: string;
    email: string;
    systemRole: string;
    cmmsRole: string;
    permissionCount: number;
  }>;
  stats: { members: number; roles: number; modules: number; actions: number };
}

export interface MaintenancePlanRow {
  id: string;
  name: string;
  pmType?: string;
  triggerType?: string;
  preset?: string | null;
  intervalDays?: number | null;
  intervalHours?: number | null;
  meterBaseline?: number | null;
  nextDueAt?: string | null;
  lastGeneratedAt?: string | null;
  isActive: boolean;
  description?: string | null;
  equipment?: { id: string; name: string; assetTag?: string | null } | null;
  functionalLocation?: { id: string; code: string; name: string } | null;
  schedules?: Array<{ id: string; dueAt?: string | null; dueAtHours?: number | null; status: string }>;
}

export interface PmHistoryRow {
  id: string;
  pmType: string;
  triggerType: string;
  title: string;
  dueAt?: string | null;
  generatedAt: string;
  completedAt?: string | null;
  status: string;
  workOrderNumber?: string | null;
  plan?: { id: string; name: string; pmType: string };
  workOrder?: { id: string; number: string; status: string; title?: string };
}

export interface PmSummaryData {
  totalPlans: number;
  dueNow: number;
  historyRecords: number;
  byType: Record<string, number>;
}

export interface SparePartRow {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  stockQty: number;
  reorderPoint: number;
  unitCost?: number | null;
  storeLocation?: string | null;
  binCode?: string | null;
  supplier?: { id: string; name: string } | null;
}

export interface InventoryTransactionRow {
  id: string;
  type: string;
  qty: number;
  unitCost?: number | null;
  reference?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  notes?: string | null;
  createdAt: string;
  sparePart?: { id: string; sku: string; name: string; category?: string; stockQty?: number };
  workOrder?: { id: string; number: string; title: string } | null;
}

export interface InventorySummaryData {
  totalSkus: number;
  lowStock: number;
  totalValue: number;
  transactionCount: number;
  byCategory: Array<{ category: string; count: number; stockQty: number }>;
}

export interface PurchaseRequisitionRow {
  id: string;
  number: string;
  status: string;
  totalCost?: number | null;
  notes?: string | null;
  supplier?: { id: string; name: string } | null;
  workOrder?: { id: string; number: string; title: string } | null;
  createdAt?: string;
}

export interface PurchaseOrderRow {
  id: string;
  number: string;
  status: string;
  totalCost?: number | null;
  deliveredAt?: string | null;
  supplier?: { id: string; name: string } | null;
  requisition?: { id: string; number: string } | null;
}

export interface PlanningProgramRow {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  _count?: { projects: number };
}

export interface PlanningProjectListRow {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  program?: { id: string; name: string } | null;
  agencyProject?: { id: string; name: string } | null;
  _count?: { activities: number; wbsNodes: number };
}

export interface WbsNodeRow {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
}

export interface ScheduleActivityRow {
  id: string;
  code?: string | null;
  name: string;
  durationDays: number;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  percentComplete: number;
  status: string;
  isCritical: boolean;
  totalFloat?: number | null;
  laborCost?: number | null;
  materialCost?: number | null;
  equipmentTag?: string | null;
  startOverrideDays?: number | null;
  wbsNode?: { id: string; code: string; name: string } | null;
  workOrder?: { id: string; number: string; status: string } | null;
  predecessors?: Array<{ id: string; type: string; lagDays: number; predecessor: { id: string; code?: string; name: string } }>;
}

export interface ActivityDependencyRow {
  id: string;
  predecessorId: string;
  successorId: string;
  type: string;
  lagDays: number;
}

export interface PlanningEvmMetrics {
  bac: number;
  bcws: number;
  pv: number;
  bcwp: number;
  ev: number;
  acwp: number;
  ac: number;
  spi: number;
  cpi: number;
  sv: number;
  cv: number;
  eac: number;
  vac: number;
  percentComplete: number;
  scheduleCompliancePct: number;
  costVariancePct: number;
  asOf: string;
}

export interface ScheduleChangeOrderRow {
  id: string;
  number: string;
  title: string;
  description?: string | null;
  scopeChange?: string | null;
  costImpactSar: number;
  scheduleImpactDays: number;
  status: string;
  affectsBaseline: boolean;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  changeLog?: Array<{ at: string; action: string; note?: string }>;
  createdAt: string;
}

export interface PlanningProjectDetail extends PlanningProjectListRow {
  wbsNodes: WbsNodeRow[];
  activities: ScheduleActivityRow[];
  dependencies: ActivityDependencyRow[];
  calendarConfig?: Record<string, unknown>;
  penaltyPerDay?: number;
  shiftHours?: number;
  evm?: PlanningEvmMetrics;
  evmIntegration?: EvmIntegrationSummary;
  baselineVariance?: Array<{ activityId: string; name: string; scheduleVarianceDays: number; costVariance: number }>;
}

export interface EvmIntegrationSummary {
  linkedAgencyProjectId: string | null;
  linkedAgencyProjectName: string | null;
  timesheetHoursApproved: number;
  timesheetLaborCostSar: number;
  cmmsFinanceActualSar: number;
  cmmsFinanceBudgetSar: number;
  progressSource: "MANUAL" | "TIMESHEET" | "HYBRID";
  costSource: "ESTIMATED" | "CMMS_FINANCE" | "HYBRID";
  activityProgress: Array<{
    activityId: string;
    name: string;
    manualPct: number;
    integratedPct: number;
    hoursUsed: number;
  }>;
  lastSyncedAt: string;
}

export interface PlanningDashboardData {
  programCount: number;
  projectCount: number;
  totalActivities: number;
  criticalPathActivities: number;
  scheduleCompliancePct: number;
  avgSpi: number;
  avgCpi: number;
  recentProjects: Array<{ id: string; name: string; code?: string | null; status: string; plannedFinish?: string | null; activityCount: number }>;
}

export interface PlanningScenarioResult {
  id: string;
  label: string;
  projectSlipDays: number;
  costIncreaseSar: number;
  penaltySar: number;
  laborOvertimeSar: number;
  materialHoldingSar: number;
  criticalPathCount: number;
  affectedActivityCount: number;
  rank?: number;
}

export interface PlanningBatchSimulation {
  baselineFinish: string;
  scenarioCount: number;
  scenarios: PlanningScenarioResult[];
  bestCase: PlanningScenarioResult | null;
  worstCase: PlanningScenarioResult | null;
  recommended: PlanningScenarioResult | null;
}

export interface PlanningRiskReport {
  summary: {
    highRiskCount: number;
    mediumRiskCount: number;
    totalExposureSar: number;
    scheduleCompliancePct: number;
    costVariancePct: number;
    worstCaseSlipDays: number;
    worstCaseCostSar: number;
  };
  activityRisks: Array<{
    activityId: string;
    code?: string | null;
    name: string;
    delayProbability: number;
    impactSar: number;
    riskLevel: string;
    isCritical: boolean;
  }>;
  resourceRisks?: Array<{ trade: string; date: string; shortage: number; impactSar: number }>;
  timesheetRisks?: Array<{ type: string; message: string; severity: string }>;
  evmIntegration?: EvmIntegrationSummary | null;
  scenarioPreview?: {
    scenarioCount: number;
    worstCase: PlanningScenarioResult | null;
    recommended: PlanningScenarioResult | null;
  } | null;
}

export interface PlanningSimulationResult {
  activityId?: string;
  extraDays?: number;
  originalProjectFinish: string;
  simulatedProjectFinish: string;
  projectSlipDays: number;
  costIncreaseSar?: number;
  penaltySar?: number;
  criticalPathCount?: number;
  affectedActivities?: Array<{ id: string; name: string; isCritical: boolean; totalFloat: number }>;
  affectedActivityCount?: number;
}

export interface PlanningLevelingData {
  headcount: number;
  placementPoolSize: number;
  overloads: Array<{ date: string; trade: string; required: number; available: number; suggestion?: string }>;
  histogram: Array<{ date: string; trade: string; units: number; capacity: number; overloaded: boolean }>;
}

export interface PlanningSCurveData {
  points: Array<{ date: string; plannedValue: number; earnedValue: number; actualCost: number; plannedProgressPct: number; actualProgressPct: number; zone: string }>;
  bac: number;
  currentZone: string;
  spi: number;
  cpi: number;
  projectStart: string;
  projectEnd: string;
}

export interface PlanningResourceForecastData {
  forecastDays: number;
  totalAlerts: number;
  alerts: Array<{ weekStart: string; trade: string; required: number; available: number; gap: number; alert: boolean }>;
  byTrade: Array<{ trade: string; peakRequired: number; peakWeek: string; weeklyLoad: Array<{ weekStart: string; required: number; available: number; gap: number }> }>;
}

export interface MtbfMttrRow {
  equipmentId: string;
  assetName: string;
  assetTag?: string | null;
  failureCount: number;
  mtbfHours: number | null;
  mttrMinutes: number | null;
  mttrHours?: number | null;
  healthScore: number;
}

export interface AssetComponentRow {
  id: string;
  name: string;
  partNumber?: string | null;
  sparePart?: { sku: string; name: string } | null;
  bomItems?: Array<{ id: string; qty: number; sparePart: { id: string; sku: string; name: string; stockQty: number } }>;
  childComponents?: AssetComponentRow[];
}

export interface AssetBomItemRow {
  id: string;
  qty: number;
  sparePart: { id: string; sku: string; name: string; stockQty: number; unitCost?: number };
  component?: { name: string } | null;
}

export interface AssetHierarchyData {
  id: string;
  name: string;
  assetTag?: string | null;
  runningHours?: number;
  parentEquipment?: { id: string; name: string; assetTag?: string | null } | null;
  components: AssetComponentRow[];
  bomItems: AssetBomItemRow[];
  childEquipment: Array<{ id: string; name: string; assetTag?: string | null; condition?: string }>;
}

export interface BomSuggestionRow {
  sparePartId: string;
  sku: string;
  name: string;
  qty: number;
  unitCost: number;
  stockQty: number;
  component: string | null;
  inStock: boolean;
}

export interface MeterReadingRow {
  id: string;
  equipmentId: string;
  readingType: string;
  value: number;
  source?: string | null;
  recordedAt: string;
  equipment?: { id: string; name: string; assetTag?: string | null };
}

export interface IotMonitoringData {
  totalReadings: number;
  anomalyCount: number;
  anomalies: Array<{
    equipmentId: string;
    assetName: string;
    readingType: string;
    value: number;
    threshold: number;
    planName: string;
    severity: "HIGH" | "MEDIUM";
  }>;
  recentReadings: MeterReadingRow[];
  assets: Array<{
    id: string;
    name: string;
    assetTag?: string | null;
    runningHours: number;
    lastHoursReading: number | null;
    lastTemp: number | null;
    lastVibration: number | null;
    lastReadingAt: string | null;
    hasAnomaly: boolean;
  }>;
}

export interface CalibrationSummaryData {
  records: Array<{ id: string; instrumentName: string; nextDueAt?: string | null; status: string; equipment?: { name: string } | null }>;
  dueCount: number;
}

export interface ProjectFinancialControlData {
  budget: number;
  commitment: number;
  actual: number;
  revenue: number;
  retentionHeld: number;
  threeWayMatch: { status: string; budget: number; commitment: number; actual: number };
  milestones: Array<{ id: string; name: string; triggerPercent: number; invoiceAmountSar: number; retentionPct: number; status: string }>;
}

export interface SubcontractorRow {
  id: string;
  name: string;
  trade?: string | null;
  status: string;
  _count?: { pos: number; timesheets: number; invoices: number };
}

export interface HrAdvancedData {
  workers?: number;
  leave: {
    balances: Array<{ workerProfileId: string; leaveType: string; balanceDays: number; usedDays: number }>;
    pendingRequests: Array<{ id: string; workerProfile: { name: string }; leaveType: string; days: number; startDate: string; endDate: string; status: string }>;
    onLeaveToday: Array<{ id: string; workerProfile: { name: string }; leaveType: string; days: number }>;
    recentRequests: Array<{ id: string; workerProfile: { name: string }; leaveType: string; days: number; status: string; startDate: string; endDate: string }>;
  };
  training: { dueSoon: Array<{ id: string; title: string; workerProfile: { name: string } }> };
  competencyMatrix: { skills: string[]; workers: Array<{ id: string; name: string; grades: Record<string, string> }> };
  successions: unknown[];
  alerts: Array<{ type: string; message: string }>;
}

export interface ClientInvoiceRow {
  id: string;
  number: string;
  agencyProjectId?: string | null;
  amountSar: number;
  description?: string | null;
  status: string;
  createdAt: string;
}

export interface PublicAssetScanData {
  id: string;
  name: string;
  assetTag?: string | null;
  condition?: string;
  criticality?: string;
  runningHours?: number;
  workOrders: unknown[];
  pmHistory: unknown[];
  reliability?: MtbfMttrRow | null;
}

export interface PlanningAiInsightsData {
  delayPredictions: Array<{ activityId: string; name: string; riskScore: number; prediction: string; isCritical: boolean }>;
  costImpact: { estimatedPenaltySar: number; criticalActivitiesAtRisk: number };
  recommendations: string[];
  evm?: { spi: number; cpi: number };
}

export interface WorkerProfile {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  nationality?: string;
  iqamaNumber?: string;
  iqamaExpiry?: string;
  category?: string;
  defaultHours?: number;
  hourlyRate?: number;
  skills?: string[];
  contractType?: string;
  status?: string;
  notes?: string;
}

export type WorkerAttendanceStatus = "PRESENT" | "ABSENT";

export interface WorkerDailyAttendance {
  id: string;
  businessId: string;
  workerProfileId: string;
  projectId?: string;
  workDate: string;
  status: WorkerAttendanceStatus;
  notes?: string;
}

export type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
export type TimesheetStatus =
  | "PENDING"
  | "PENDING_ADMIN"
  | "PENDING_PAYROLL"
  | "APPROVED"
  | "REJECTED"
  | "BILLED";

export type TimesheetAction = "approve" | "reject" | "bill";

export interface AgencyProject {
  id: string;
  businessId: string;
  clientCompanyId: string;
  name: string;
  code?: string;
  siteName?: string;
  siteAddress?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  industryTag?: string;
  contractRef?: string;
  startDate?: string;
  endDate?: string;
  headcount?: number;
  managerMemberId?: string;
  status: ProjectStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  clientCompany?: ClientCompany;
  manager?: {
    id: string;
    role: string;
    user?: { id: string; name: string; phone?: string; email?: string };
  };
  _count?: { placements: number; timesheets: number };
  stats?: {
    assignedWorkers: number;
    activeWorkers: number;
    totalHours: number;
    headcountGap: number | null;
  };
}

export interface AgencyProjectDetail extends AgencyProject {
  placements?: Placement[];
  timesheets?: Timesheet[];
  hoursSummary?: {
    total: number;
    pending: number;
    approved: number;
    billed: number;
  };
  projectStats?: {
    assignedWorkers: number;
    activeWorkers: number;
    headcountRequired?: number | null;
    headcountGap?: number | null;
    totalHours: number;
    pendingHours: number;
  };
  teamManagers?: Array<{
    id: string;
    role: string;
    user?: { id: string; name: string; phone?: string; email?: string };
  }>;
  myPermissions?: string[];
}

export interface ProjectPermissionDef {
  key: string;
  group: string;
  labelEn: string;
  labelAr: string;
}

export interface ProjectAccessGrant {
  id: string;
  memberId: string;
  permissions: string[];
  isActive: boolean;
  member?: { id: string; role: string; user?: { id: string; name: string; phone?: string; email?: string } };
  user?: { id: string; name: string; phone?: string; email?: string };
}

export interface MyProjectAccessRow {
  projectId: string;
  projectName: string;
  status: string;
  permissions: string[];
}

export interface ManpowerAnalytics {
  activeProjects: number;
  totalProjects: number;
  activePlacements: number;
  totalWorkers: number;
  availableWorkers: number;
  utilizationPercent: number;
  pendingHours: number;
  approvedHours: number;
  expiringIqamas: Array<{
    id: string;
    name: string;
    iqamaNumber?: string;
    iqamaExpiry?: string;
  }>;
  projectsPerClient: Array<{
    clientId: string;
    clientName: string;
    projectCount: number;
  }>;
  workersByCategory?: Array<{
    category: string;
    count: number;
  }>;
}

export interface DemoSeedResult {
  created: boolean;
  skipped?: boolean;
  message: string;
  clients: number;
  workers: number;
  projects: number;
  placements: number;
  timesheets: number;
  attendance?: number;
  tasks?: number;
  knowledgeDocs?: number;
  equipment?: number;
  demoAccounts?: Array<{ name: string; phone: string; role: string; password: string }>;
}

export interface Placement {
  id: string;
  businessId: string;
  workerProfileId: string;
  clientCompanyId: string;
  projectId?: string;
  startDate: string;
  endDate?: string;
  siteName?: string;
  status?: string;
  notes?: string;
  workerProfile?: WorkerProfile;
  clientCompany?: ClientCompany;
  project?: AgencyProject;
}

export interface Timesheet {
  id: string;
  businessId: string;
  placementId?: string;
  workerProfileId: string;
  clientCompanyId?: string;
  projectId?: string;
  workDate: string;
  date?: string;
  regularHours?: number;
  overtimeHours?: number;
  hoursWorked: number;
  notes?: string;
  status?: TimesheetStatus;
  rejectReason?: string;
  approvalStageLabel?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  overtimePay?: number;
  workerProfile?: WorkerProfile;
  clientCompany?: ClientCompany;
  project?: AgencyProject;
}

export interface ManpowerPolicy {
  regularHoursPerDay: number;
  overtimeMultiplier: number;
  autoCalculateOvertime: boolean;
  approvalLevels: Array<"SITE_MANAGER" | "ADMIN" | "PAYROLL">;
  autoReminderHours: number;
  shiftStart: string;
  shiftEnd: string;
  equalizeOvertime: boolean;
  fatigueOtThresholdWeekly: number;
}

export interface ManpowerLiveDashboard {
  realtime: {
    pendingSiteManager: number;
    pendingAdminPayroll: number;
    entriesToday: number;
    presentToday: number;
    absentToday: number;
  };
  monthSummary: Array<{ status: string; count: number; hours: number; overtimeHours: number }>;
  totalLaborCostMonth: number;
  totalOvertimeHoursMonth: number;
  siteAttendanceLive: Array<{ projectId: string; projectName: string; present: number; absent: number }>;
  laborCostTrend: Array<{ date: string; totalHours: number; overtimeHours: number }>;
  fatigueRisk: Array<{ workerProfileId: string; workerName: string; category?: string | null; weeklyOvertimeHours: number; riskLevel: string }>;
  overtimeBalance: {
    averageWeeklyOt: number;
    underAllocated: Array<{ name: string; category?: string | null; weeklyOvertimeHours: number }>;
    overAllocated: Array<{ name: string; category?: string | null; weeklyOvertimeHours: number }>;
    equalizeEnabled: boolean;
  };
}

export interface AttentionItem {
  id: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail?: string;
  href?: string;
  count?: number;
}

export interface CommandCenterBriefing {
  generatedAt: string;
  morningBrief: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: Array<{ label: string; weight: number; score: number }>;
  attentionItems: AttentionItem[];
  ignoredItems: AttentionItem[];
  resourceVisibility: {
    workers: { total: number; available: number; assigned: number; onLeave: number };
    projects: { active: number; completed: number; paused: number };
    placementsActive: number;
  };
  summary: {
    pendingTimesheets: number;
    pendingAdmin: number;
    iqamaExpiringCount: number;
    projectsEndingCount: number;
    overdueTasksCount: number;
    fatigueRiskCount: number;
    pendingLeave?: number;
  };
  cmmsKpis?: {
    openWorkOrders: number;
    pmOverdue: number;
    cmmsAlerts: number;
    maintenanceBudget: number;
    erpConnected: boolean;
  };
}

export interface AskCompanyResult {
  answer: string;
  sources: string[];
  aiPowered?: boolean;
}

export interface CompanyReminder {
  id: string;
  title: string;
  type?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
}

export interface TimesheetImportResult {
  imported: number;
  skipped: number;
  results: Array<{ row: number; ok: boolean; message: string }>;
}

export interface WorkerQrData {
  token: string;
  checkInUrl: string;
  qrImageUrl: string;
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
