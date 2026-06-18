import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as businessController from '../controllers/businessController';
import * as resourceController from '../controllers/resourceController';
import * as aiController from '../controllers/aiController';
import * as websiteController from '../controllers/websiteController';
import * as extendedController from '../controllers/extendedController';
import * as liveChatController from '../controllers/liveChatController';
import * as omnichannelController from '../controllers/omnichannelController';
import * as industryController from '../controllers/industryController';
import * as workforceController from '../controllers/workforceController';
import * as executiveController from '../controllers/executiveController';
import * as equipmentController from '../controllers/equipmentController';
import * as cmmsController from '../controllers/cmmsController';
import * as cmmsAiController from '../controllers/cmmsAiController';
import * as notificationCenterController from '../controllers/notificationCenterController';
import * as cmmsSecurityController from '../controllers/cmmsSecurityController';
import * as hrIntegrationController from '../controllers/hrIntegrationController';
import * as reminderNotifyController from '../controllers/reminderNotifyController';
import * as planningController from '../controllers/planningController';
import * as advancedFeaturesController from '../controllers/advancedFeaturesController';
import { authMiddleware, businessAccessMiddleware, requireMinRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { authLimiter, apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Auth routes
router.post('/auth/login', authLimiter, asyncHandler(authController.login));
router.post('/auth/signup', authLimiter, asyncHandler(authController.signup));
router.post('/auth/verify-otp', authLimiter, asyncHandler(authController.verifySignupOtp));
router.post('/auth/forgot-password', authLimiter, asyncHandler(authController.forgotPassword));
router.post('/auth/reset-password', authLimiter, asyncHandler(authController.resetPassword));
router.get('/auth/invite/:token', authLimiter, asyncHandler(authController.getMemberInvite));
router.post('/auth/invite/:token/accept', authLimiter, asyncHandler(authController.acceptMemberInviteHandler));
router.get('/auth/me', authMiddleware, asyncHandler(authController.getMe));

// Business routes
router.post('/businesses', authMiddleware, businessController.createBusiness);
router.get('/businesses/:businessId', authMiddleware, businessAccessMiddleware, businessController.getBusiness);
router.patch('/businesses/:businessId', authMiddleware, businessAccessMiddleware, businessController.updateBusiness);
router.get('/businesses/:businessId/dashboard', authMiddleware, businessAccessMiddleware, businessController.getDashboardStats);
router.get('/businesses/:businessId/bot-setup', authMiddleware, businessAccessMiddleware, businessController.getBotSetup);
router.post('/businesses/:businessId/whatsapp/test', authMiddleware, businessAccessMiddleware, businessController.testWhatsAppConnection);

// Website import
router.get('/businesses/:businessId/website/status', authMiddleware, businessAccessMiddleware, asyncHandler(websiteController.getWebsiteImportStatus));
router.post('/businesses/:businessId/website/preview', authMiddleware, businessAccessMiddleware, asyncHandler(websiteController.previewWebsite));
router.post('/businesses/:businessId/website/import', authMiddleware, businessAccessMiddleware, asyncHandler(websiteController.importWebsite));
router.post('/businesses/:businessId/website/sync', authMiddleware, businessAccessMiddleware, asyncHandler(websiteController.syncWebsite));

// Orders
router.get('/businesses/:businessId/orders', authMiddleware, businessAccessMiddleware, resourceController.getOrders);
router.get('/businesses/:businessId/orders/:orderId', authMiddleware, businessAccessMiddleware, resourceController.getOrder);
router.post('/businesses/:businessId/orders', authMiddleware, businessAccessMiddleware, resourceController.createOrder);
router.patch('/businesses/:businessId/orders/:orderId', authMiddleware, businessAccessMiddleware, resourceController.updateOrderStatus);

// Appointments
router.get('/businesses/:businessId/appointments', authMiddleware, businessAccessMiddleware, resourceController.getAppointments);
router.post('/businesses/:businessId/appointments', authMiddleware, businessAccessMiddleware, resourceController.createAppointment);
router.patch('/businesses/:businessId/appointments/:appointmentId', authMiddleware, businessAccessMiddleware, resourceController.updateAppointment);

// Customers
router.get('/businesses/:businessId/customers', authMiddleware, businessAccessMiddleware, resourceController.getCustomers);
router.get('/businesses/:businessId/customers/:customerId', authMiddleware, businessAccessMiddleware, resourceController.getCustomer);
router.patch('/businesses/:businessId/customers/:customerId', authMiddleware, businessAccessMiddleware, resourceController.updateCustomer);

// Catalog
router.get('/businesses/:businessId/catalog', authMiddleware, businessAccessMiddleware, resourceController.getCatalog);
router.post('/businesses/:businessId/catalog/items', authMiddleware, businessAccessMiddleware, resourceController.createCatalogItem);
router.patch('/businesses/:businessId/catalog/items/:itemId', authMiddleware, businessAccessMiddleware, resourceController.updateCatalogItem);
router.delete('/businesses/:businessId/catalog/items/:itemId', authMiddleware, businessAccessMiddleware, resourceController.deleteCatalogItem);

// Conversations
router.get('/businesses/:businessId/conversations', authMiddleware, businessAccessMiddleware, resourceController.getConversations);
router.get('/businesses/:businessId/conversations/:conversationId/messages', authMiddleware, businessAccessMiddleware, resourceController.getConversationMessages);
router.post('/businesses/:businessId/conversations/:conversationId/messages', authMiddleware, businessAccessMiddleware, resourceController.sendMessage);
router.patch('/businesses/:businessId/conversations/:conversationId/bot', authMiddleware, businessAccessMiddleware, resourceController.toggleBotHandling);

// Marketing
router.get('/businesses/:businessId/campaigns', authMiddleware, businessAccessMiddleware, resourceController.getCampaigns);
router.post('/businesses/:businessId/campaigns', authMiddleware, businessAccessMiddleware, resourceController.createCampaign);
router.post('/businesses/:businessId/campaigns/:campaignId/send', authMiddleware, businessAccessMiddleware, resourceController.sendCampaign);
router.get('/businesses/:businessId/promo-codes', authMiddleware, businessAccessMiddleware, resourceController.getPromoCodes);
router.post('/businesses/:businessId/promo-codes', authMiddleware, businessAccessMiddleware, resourceController.createPromoCode);
router.patch('/businesses/:businessId/promo-codes/:promoId', authMiddleware, businessAccessMiddleware, resourceController.updatePromoCode);
router.delete('/businesses/:businessId/promo-codes/:promoId', authMiddleware, businessAccessMiddleware, resourceController.deletePromoCode);
router.get('/businesses/:businessId/loyalty-rewards', authMiddleware, businessAccessMiddleware, resourceController.getLoyaltyRewards);
router.post('/businesses/:businessId/loyalty-rewards', authMiddleware, businessAccessMiddleware, resourceController.createLoyaltyReward);
router.patch('/businesses/:businessId/loyalty-rewards/:rewardId', authMiddleware, businessAccessMiddleware, resourceController.updateLoyaltyReward);

// Analytics
router.get('/businesses/:businessId/analytics', authMiddleware, businessAccessMiddleware, resourceController.getAnalytics);

// Settings
router.get('/businesses/:businessId/auto-replies', authMiddleware, businessAccessMiddleware, resourceController.getAutoReplies);
router.post('/businesses/:businessId/auto-replies', authMiddleware, businessAccessMiddleware, resourceController.createAutoReply);
router.patch('/businesses/:businessId/auto-replies/:ruleId', authMiddleware, businessAccessMiddleware, resourceController.updateAutoReply);
router.delete('/businesses/:businessId/auto-replies/:ruleId', authMiddleware, businessAccessMiddleware, resourceController.deleteAutoReply);
router.get('/businesses/:businessId/staff', authMiddleware, businessAccessMiddleware, resourceController.getStaff);
router.post('/businesses/:businessId/staff', authMiddleware, businessAccessMiddleware, resourceController.createStaff);
router.patch('/businesses/:businessId/staff/:staffId', authMiddleware, businessAccessMiddleware, resourceController.updateStaff);
router.delete('/businesses/:businessId/staff/:staffId', authMiddleware, businessAccessMiddleware, resourceController.deleteStaff);
router.get('/businesses/:businessId/notifications', authMiddleware, businessAccessMiddleware, resourceController.getNotifications);
router.patch('/businesses/:businessId/notifications/:notificationId/read', authMiddleware, businessAccessMiddleware, resourceController.markNotificationRead);

// AI Bot & Intelligence
router.get('/businesses/:businessId/ai/settings', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getAiSettings));
router.patch('/businesses/:businessId/ai/settings', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.updateAiSettings));
router.post('/businesses/:businessId/ai/clear-cache', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.clearBotCache));
router.post('/businesses/:businessId/ai/test', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.testBot));
router.get('/businesses/:businessId/ai/analytics', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getBotAnalytics));
router.get('/businesses/:businessId/ai/intelligence', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getIntelligence));
router.get('/businesses/:businessId/ai/knowledge', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getKnowledgeDocuments));
router.post('/businesses/:businessId/ai/knowledge', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.createKnowledgeDocument));
router.delete('/businesses/:businessId/ai/knowledge/:docId', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.deleteKnowledgeDocument));
router.get('/businesses/:businessId/ai/knowledge/search', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.searchKnowledgeApi));
router.get('/businesses/:businessId/ai/faq-candidates', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getFaqCandidates));
router.post('/businesses/:businessId/ai/faq-candidates/:candidateId/approve', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.approveFaq));
router.post('/businesses/:businessId/ai/faq-learning', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.runFaqLearning));
router.post('/businesses/:businessId/ai/winback', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.triggerWinBack));
router.get('/businesses/:businessId/ai/workflows', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getWorkflowLogs));
router.get('/businesses/:businessId/ai/quota', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getQuotaUsage));
router.get('/businesses/:businessId/ai/dlq', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.getDlqJobs));
router.post('/businesses/:businessId/ai/dlq/replay', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.replayDlqJob));
router.post('/businesses/:businessId/ai/resume-bot', authMiddleware, businessAccessMiddleware, asyncHandler(aiController.resumeBot));

// Sales Pipeline
router.get('/businesses/:businessId/deals', authMiddleware, businessAccessMiddleware, extendedController.getDeals);
router.post('/businesses/:businessId/deals', authMiddleware, businessAccessMiddleware, extendedController.createDeal);
router.patch('/businesses/:businessId/deals/:dealId', authMiddleware, businessAccessMiddleware, extendedController.updateDeal);
router.delete('/businesses/:businessId/deals/:dealId', authMiddleware, businessAccessMiddleware, extendedController.deleteDeal);

// Tasks
router.get('/businesses/:businessId/tasks', authMiddleware, businessAccessMiddleware, extendedController.getTasks);
router.post('/businesses/:businessId/tasks', authMiddleware, businessAccessMiddleware, extendedController.createTask);
router.patch('/businesses/:businessId/tasks/:taskId', authMiddleware, businessAccessMiddleware, extendedController.updateTask);
router.delete('/businesses/:businessId/tasks/:taskId', authMiddleware, businessAccessMiddleware, extendedController.deleteTask);

// Inventory
router.get('/businesses/:businessId/inventory', authMiddleware, businessAccessMiddleware, extendedController.getInventory);
router.patch('/businesses/:businessId/inventory/:itemId', authMiddleware, businessAccessMiddleware, extendedController.updateInventory);

// Automation Workflows
router.get('/businesses/:businessId/automation-workflows', authMiddleware, businessAccessMiddleware, extendedController.getAutomationWorkflows);
router.post('/businesses/:businessId/automation-workflows', authMiddleware, businessAccessMiddleware, extendedController.createAutomationWorkflow);
router.patch('/businesses/:businessId/automation-workflows/:workflowId', authMiddleware, businessAccessMiddleware, extendedController.updateAutomationWorkflow);
router.delete('/businesses/:businessId/automation-workflows/:workflowId', authMiddleware, businessAccessMiddleware, extendedController.deleteAutomationWorkflow);

// PDPL Compliance
router.get('/businesses/:businessId/compliance', authMiddleware, businessAccessMiddleware, extendedController.getComplianceStatus);
router.patch('/businesses/:businessId/compliance', authMiddleware, businessAccessMiddleware, extendedController.updateComplianceSettings);
router.get('/businesses/:businessId/consent-records', authMiddleware, businessAccessMiddleware, extendedController.getConsentRecords);
router.post('/businesses/:businessId/consent-records', authMiddleware, businessAccessMiddleware, extendedController.createConsentRecord);

// Executive Dashboard & Reports
router.get('/businesses/:businessId/executive', authMiddleware, businessAccessMiddleware, extendedController.getExecutiveDashboard);
router.get('/businesses/:businessId/reports/pdf', authMiddleware, businessAccessMiddleware, extendedController.downloadReport);

// Owner Command Center & Executive AI
router.get('/businesses/:businessId/command-center', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(executiveController.getCommandCenter));
router.post('/businesses/:businessId/ask-company', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(executiveController.askCompany));
router.get('/businesses/:businessId/company-reminders', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(executiveController.listCompanyReminders));
router.post('/businesses/:businessId/company-reminders', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(executiveController.saveCompanyReminder));
router.delete('/businesses/:businessId/company-reminders/:reminderId', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(executiveController.removeCompanyReminder));
router.get('/businesses/:businessId/reminder-notify/:itemKey', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(reminderNotifyController.getReminderNotify));
router.put('/businesses/:businessId/reminder-notify/:itemKey', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(reminderNotifyController.putReminderNotify));
router.get('/businesses/:businessId/manpower/reports/ceo-pdf', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(executiveController.downloadManpowerCeoReport));
router.get('/businesses/:businessId/manpower/timesheets/import-template', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(executiveController.downloadTimesheetImportTemplate));
router.post('/businesses/:businessId/manpower/timesheets/import', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), executiveController.timesheetUploadMiddleware, asyncHandler(executiveController.uploadTimesheetImport));
router.get('/businesses/:businessId/manpower/workers/:workerId/qr', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(executiveController.getWorkerQrCode));

// Public QR check-in (no auth)
router.get('/public/check-in/:token', asyncHandler(executiveController.publicCheckInInfo));
router.post('/public/check-in/:token', asyncHandler(executiveController.publicCheckInSubmit));
router.get('/public/asset/:token', asyncHandler(advancedFeaturesController.publicAssetScan));

// Live Chat (dashboard)
router.get('/businesses/:businessId/live-chat/sessions', authMiddleware, businessAccessMiddleware, liveChatController.getLiveChatSessions);
router.post('/businesses/:businessId/live-chat/sessions/:sessionId/reply', authMiddleware, businessAccessMiddleware, liveChatController.replyLiveChat);

// Omnichannel
router.get('/businesses/:businessId/channels', authMiddleware, businessAccessMiddleware, omnichannelController.getChannels);
router.patch('/businesses/:businessId/channels/:channel', authMiddleware, businessAccessMiddleware, omnichannelController.updateChannel);
router.post('/businesses/:businessId/channels/send', authMiddleware, businessAccessMiddleware, omnichannelController.sendOmnichannelMessage);
router.post('/businesses/:businessId/channels/ai-reply', authMiddleware, businessAccessMiddleware, omnichannelController.aiOmnichannelReply);
router.get('/businesses/:businessId/inbox/unified', authMiddleware, businessAccessMiddleware, omnichannelController.getUnifiedInbox);

// Leads
router.get('/businesses/:businessId/leads', authMiddleware, businessAccessMiddleware, omnichannelController.getLeads);
router.post('/businesses/:businessId/leads', authMiddleware, businessAccessMiddleware, omnichannelController.createLead);
router.patch('/businesses/:businessId/leads/:leadId', authMiddleware, businessAccessMiddleware, omnichannelController.updateLead);

// Referrals
router.get('/businesses/:businessId/referrals', authMiddleware, businessAccessMiddleware, omnichannelController.getReferrals);
router.post('/businesses/:businessId/referrals', authMiddleware, businessAccessMiddleware, omnichannelController.createReferral);

// Reviews & Feedback
router.get('/businesses/:businessId/reviews', authMiddleware, businessAccessMiddleware, omnichannelController.getReviews);
router.post('/businesses/:businessId/reviews', authMiddleware, businessAccessMiddleware, omnichannelController.createReview);
router.get('/businesses/:businessId/feedbacks', authMiddleware, businessAccessMiddleware, omnichannelController.getFeedbacks);
router.post('/businesses/:businessId/feedbacks', authMiddleware, businessAccessMiddleware, omnichannelController.createFeedback);

// API Keys
router.get('/businesses/:businessId/api-keys', authMiddleware, businessAccessMiddleware, omnichannelController.getApiKeys);
router.post('/businesses/:businessId/api-keys', authMiddleware, businessAccessMiddleware, omnichannelController.createApiKey);
router.delete('/businesses/:businessId/api-keys/:keyId', authMiddleware, businessAccessMiddleware, omnichannelController.revokeApiKey);

// Customer Journey
router.get('/businesses/:businessId/customers/:customerId/journey', authMiddleware, businessAccessMiddleware, omnichannelController.getCustomerJourney);

// AI Advisor
router.get('/businesses/:businessId/ai/advisor', authMiddleware, businessAccessMiddleware, omnichannelController.getAiAdvisor);

// Suppliers & Deliveries
router.get('/businesses/:businessId/suppliers', authMiddleware, businessAccessMiddleware, omnichannelController.getSuppliers);
router.post('/businesses/:businessId/suppliers', authMiddleware, businessAccessMiddleware, omnichannelController.createSupplier);
router.get('/businesses/:businessId/deliveries', authMiddleware, businessAccessMiddleware, omnichannelController.getDeliveries);
router.post('/businesses/:businessId/deliveries', authMiddleware, businessAccessMiddleware, omnichannelController.createDelivery);
router.patch('/businesses/:businessId/deliveries/:deliveryId', authMiddleware, businessAccessMiddleware, omnichannelController.updateDelivery);

// Industry Modules
router.get('/businesses/:businessId/industry/stats', authMiddleware, businessAccessMiddleware, industryController.getIndustryStats);

// Real Estate
router.get('/businesses/:businessId/properties', authMiddleware, businessAccessMiddleware, industryController.getProperties);
router.post('/businesses/:businessId/properties', authMiddleware, businessAccessMiddleware, industryController.createProperty);
router.patch('/businesses/:businessId/properties/:propertyId', authMiddleware, businessAccessMiddleware, industryController.updateProperty);
router.get('/businesses/:businessId/property-viewings', authMiddleware, businessAccessMiddleware, industryController.getPropertyViewings);
router.post('/businesses/:businessId/property-viewings', authMiddleware, businessAccessMiddleware, industryController.createPropertyViewing);
router.patch('/businesses/:businessId/property-viewings/:viewingId', authMiddleware, businessAccessMiddleware, industryController.updatePropertyViewing);

// Hotel
router.get('/businesses/:businessId/hotel-rooms', authMiddleware, businessAccessMiddleware, industryController.getHotelRooms);
router.post('/businesses/:businessId/hotel-rooms', authMiddleware, businessAccessMiddleware, industryController.createHotelRoom);
router.patch('/businesses/:businessId/hotel-rooms/:roomId', authMiddleware, businessAccessMiddleware, industryController.updateHotelRoom);
router.get('/businesses/:businessId/hotel-reservations', authMiddleware, businessAccessMiddleware, industryController.getHotelReservations);
router.post('/businesses/:businessId/hotel-reservations', authMiddleware, businessAccessMiddleware, industryController.createHotelReservation);
router.patch('/businesses/:businessId/hotel-reservations/:reservationId', authMiddleware, businessAccessMiddleware, industryController.updateHotelReservation);

// Logistics
router.get('/businesses/:businessId/shipments', authMiddleware, businessAccessMiddleware, industryController.getShipments);
router.post('/businesses/:businessId/shipments', authMiddleware, businessAccessMiddleware, industryController.createShipment);
router.patch('/businesses/:businessId/shipments/:shipmentId', authMiddleware, businessAccessMiddleware, industryController.updateShipment);
router.get('/businesses/:businessId/fleet', authMiddleware, businessAccessMiddleware, industryController.getFleetVehicles);
router.post('/businesses/:businessId/fleet', authMiddleware, businessAccessMiddleware, industryController.createFleetVehicle);
router.patch('/businesses/:businessId/fleet/:vehicleId', authMiddleware, businessAccessMiddleware, industryController.updateFleetVehicle);

// Education
router.get('/businesses/:businessId/courses', authMiddleware, businessAccessMiddleware, industryController.getCourses);
router.post('/businesses/:businessId/courses', authMiddleware, businessAccessMiddleware, industryController.createCourse);
router.patch('/businesses/:businessId/courses/:courseId', authMiddleware, businessAccessMiddleware, industryController.updateCourse);
router.get('/businesses/:businessId/enrollments', authMiddleware, businessAccessMiddleware, industryController.getEnrollments);
router.post('/businesses/:businessId/enrollments', authMiddleware, businessAccessMiddleware, industryController.createEnrollment);

// Automotive
router.get('/businesses/:businessId/vehicle-jobs', authMiddleware, businessAccessMiddleware, industryController.getVehicleJobs);
router.post('/businesses/:businessId/vehicle-jobs', authMiddleware, businessAccessMiddleware, industryController.createVehicleJob);
router.patch('/businesses/:businessId/vehicle-jobs/:jobId', authMiddleware, businessAccessMiddleware, industryController.updateVehicleJob);

// Workforce / Manpower
router.get('/businesses/:businessId/workforce/membership', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.getMembershipMe));
router.get('/businesses/:businessId/workforce/members', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.getMembers));
router.post('/businesses/:businessId/workforce/members/invite', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.inviteMember));
router.patch('/businesses/:businessId/workforce/members/:memberId', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(workforceController.updateMemberRole));
router.get('/businesses/:businessId/workforce/stats', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getWorkforceStats));
router.get('/businesses/:businessId/workforce/my-work', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.getMyWork));
router.get('/businesses/:businessId/manpower/team-pulse', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getTeamPulse));
router.get('/businesses/:businessId/manpower/equipment', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(equipmentController.getEquipmentBoard));
router.post('/businesses/:businessId/manpower/equipment', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(equipmentController.createEquipment));
router.patch('/businesses/:businessId/manpower/equipment/:equipmentId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(equipmentController.updateEquipment));
router.post('/businesses/:businessId/manpower/equipment/:equipmentId/move', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(equipmentController.moveEquipment));
router.post('/businesses/:businessId/manpower/equipment/reorder', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(equipmentController.reorderEquipment));
router.delete('/businesses/:businessId/manpower/equipment/:equipmentId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(equipmentController.deleteEquipment));
router.get('/businesses/:businessId/cmms/access', authMiddleware, businessAccessMiddleware, asyncHandler(cmmsController.getCmmsAccessLevel));
router.get('/businesses/:businessId/cmms/dashboard', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getDashboard));
router.get('/businesses/:businessId/cmms/alerts', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getCmmsAlertsHandler));
router.post('/businesses/:businessId/cmms/seed-demo', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedCmms));
router.get('/businesses/:businessId/cmms/locations', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getLocations));
router.get('/businesses/:businessId/cmms/locations/tree', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getLocationTreeHandler));
router.post('/businesses/:businessId/cmms/locations/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedLocations));
router.get('/businesses/:businessId/cmms/locations/:locationId', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getLocationById));
router.post('/businesses/:businessId/cmms/locations', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.postLocation));
router.patch('/businesses/:businessId/cmms/locations/:locationId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.patchLocation));
router.delete('/businesses/:businessId/cmms/locations/:locationId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.deleteLocation));
router.get('/businesses/:businessId/cmms/assets', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getAssets));
router.get('/businesses/:businessId/cmms/assets/tree', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getAssetTreeHandler));
router.post('/businesses/:businessId/cmms/assets/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedAssets));
router.get('/businesses/:businessId/cmms/assets/:assetId', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getAssetById));
router.post('/businesses/:businessId/cmms/assets', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.postAsset));
router.patch('/businesses/:businessId/cmms/assets/:assetId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.patchAsset));
router.delete('/businesses/:businessId/cmms/assets/:assetId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.deleteAsset));
router.get('/businesses/:businessId/cmms/work-requests', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getWorkRequests));
router.post('/businesses/:businessId/cmms/work-requests', authMiddleware, businessAccessMiddleware, asyncHandler(cmmsController.postWorkRequest));
router.patch('/businesses/:businessId/cmms/work-requests/:requestId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.patchWorkRequest));
router.get('/businesses/:businessId/cmms/work-orders', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getWorkOrders));
router.patch('/businesses/:businessId/cmms/work-orders/:workOrderId', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.patchWorkOrder));
router.post('/businesses/:businessId/cmms/work-orders/:workOrderId/issue-part', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.postIssuePart));
router.get('/businesses/:businessId/cmms/planner', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getPlanner));
router.patch('/businesses/:businessId/cmms/planner/work-orders/:workOrderId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.patchPlannerSchedule));
router.post('/businesses/:businessId/cmms/planner/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedPlanner));
router.get('/businesses/:businessId/cmms/finance', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getFinanceSummary));
router.get('/businesses/:businessId/cmms/finance/config', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(cmmsController.getFinanceConfig));
router.patch('/businesses/:businessId/cmms/finance/config', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(cmmsController.patchFinanceConfig));
router.post('/businesses/:businessId/cmms/finance/sync', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(cmmsController.postFinanceSync));
router.post('/businesses/:businessId/cmms/finance/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedFinance));
router.get('/businesses/:businessId/cmms/ai-engine', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsAiController.getAiEngine));
router.post('/businesses/:businessId/cmms/ai-engine/run', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsAiController.postAiEngineRun));
router.post('/businesses/:businessId/cmms/ai-engine/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsAiController.seedAiEngine));
router.get('/businesses/:businessId/cmms/notification-center', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(notificationCenterController.getNotificationCenter));
router.patch('/businesses/:businessId/cmms/notification-center/config', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(notificationCenterController.patchNotificationCenterConfig));
router.patch('/businesses/:businessId/cmms/notification-center/channels/:channel', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(notificationCenterController.patchNotificationChannel));
router.post('/businesses/:businessId/cmms/notification-center/test', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(notificationCenterController.postNotificationTest));
router.post('/businesses/:businessId/cmms/notification-center/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(notificationCenterController.seedNotificationCenter));
router.get('/businesses/:businessId/cmms/security', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsSecurityController.getCmmsSecurity));
router.patch('/businesses/:businessId/cmms/security/members/:memberId', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(cmmsSecurityController.patchMemberCmmsRole));
router.post('/businesses/:businessId/cmms/security/seed', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(cmmsSecurityController.seedCmmsSecurity));
router.get('/businesses/:businessId/cmms/maintenance-plans', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getMaintenancePlans));
router.get('/businesses/:businessId/cmms/maintenance-plans/summary', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getPmSummaryHandler));
router.get('/businesses/:businessId/cmms/maintenance-plans/history', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getPmHistoryHandler));
router.post('/businesses/:businessId/cmms/maintenance-plans/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedPmHandler));
router.get('/businesses/:businessId/cmms/maintenance-plans/:planId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getMaintenancePlanById));
router.post('/businesses/:businessId/cmms/maintenance-plans', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.postMaintenancePlan));
router.patch('/businesses/:businessId/cmms/maintenance-plans/:planId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.patchMaintenancePlan));
router.delete('/businesses/:businessId/cmms/maintenance-plans/:planId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.deleteMaintenancePlanHandler));
router.post('/businesses/:businessId/cmms/maintenance-plans/run-due', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.postRunPm));
router.get('/businesses/:businessId/cmms/spare-parts', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getSpareParts));
router.get('/businesses/:businessId/cmms/inventory/summary', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getInventorySummaryHandler));
router.get('/businesses/:businessId/cmms/inventory/transactions', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.getInventoryTransactions));
router.post('/businesses/:businessId/cmms/inventory/transactions', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(cmmsController.postInventoryTransaction));
router.post('/businesses/:businessId/cmms/inventory/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.seedInventory));
router.post('/businesses/:businessId/cmms/spare-parts', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.postSparePart));
router.get('/businesses/:businessId/cmms/procurement', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getProcurement));
router.post('/businesses/:businessId/cmms/procurement', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.postProcurement));
router.patch('/businesses/:businessId/cmms/procurement/:requisitionId', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(cmmsController.patchProcurement));
router.get('/businesses/:businessId/cmms/purchase-orders', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.getPurchaseOrders));
router.patch('/businesses/:businessId/cmms/purchase-orders/:orderId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(cmmsController.patchPurchaseOrder));
router.get('/businesses/:businessId/cmms/reliability/mtbf-mttr', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getMtbfMttr));
router.get('/businesses/:businessId/cmms/assets/:equipmentId/hierarchy', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getAssetHierarchy));
router.post('/businesses/:businessId/cmms/assets/:equipmentId/components', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postAssetComponent));
router.post('/businesses/:businessId/cmms/assets/:equipmentId/bom', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postBomItem));
router.get('/businesses/:businessId/cmms/assets/:equipmentId/bom-suggestions', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getBomSuggestions));
router.post('/businesses/:businessId/cmms/assets/:equipmentId/meter-readings', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(advancedFeaturesController.postMeterReading));
router.get('/businesses/:businessId/cmms/meter-readings', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(advancedFeaturesController.getMeterReadings));
router.get('/businesses/:businessId/cmms/iot-monitoring', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getIotMonitoring));
router.post('/businesses/:businessId/cmms/iot-monitoring/ingest', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postIotIngest));
router.post('/businesses/:businessId/cmms/assets/:equipmentId/qr-token', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postAssetQrToken));
router.get('/businesses/:businessId/cmms/calibrations', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getCalibrations));
router.post('/businesses/:businessId/cmms/calibrations', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postCalibration));
router.post('/businesses/:businessId/cmms/ai-engine/auto-work-orders', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postAutoWoFromPredictions));
router.get('/businesses/:businessId/manpower/projects/:projectId/financials', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getProjectFinancials));
router.post('/businesses/:businessId/manpower/financials/entries', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postFinancialEntry));
router.post('/businesses/:businessId/manpower/projects/:projectId/milestones', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postMilestone));
router.post('/businesses/:businessId/manpower/milestones/:milestoneId/invoice', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postInvoiceMilestone));
router.post('/businesses/:businessId/manpower/milestones/:milestoneId/release-retention', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postReleaseRetention));
router.get('/businesses/:businessId/manpower/client-invoices', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getClientInvoices));
router.post('/businesses/:businessId/manpower/client-invoices', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postClientInvoice));
router.post('/businesses/:businessId/manpower/projects/:projectId/finance-seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.seedFinanceAdvanced));
router.get('/businesses/:businessId/manpower/subcontractors', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getSubcontractors));
router.post('/businesses/:businessId/manpower/subcontractors', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postSubcontractor));
router.post('/businesses/:businessId/manpower/subcontractors/pos', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postSubcontractorPo));
router.post('/businesses/:businessId/manpower/subcontractors/timesheets', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postSubcontractorTimesheet));
router.patch('/businesses/:businessId/manpower/subcontractors/timesheets/:timesheetId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.patchSubcontractorTimesheet));
router.post('/businesses/:businessId/manpower/subcontractors/invoices', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postSubcontractorInvoice));
router.get('/businesses/:businessId/manpower/hr/advanced', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getHrAdvanced));
router.post('/businesses/:businessId/manpower/hr/leave-requests', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postLeaveRequest));
router.patch('/businesses/:businessId/manpower/hr/leave-requests/:requestId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.patchLeaveRequest));
router.post('/businesses/:businessId/manpower/hr/mark-absent', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(advancedFeaturesController.postMarkAbsent));
router.post('/businesses/:businessId/manpower/hr/competencies', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postCompetency));
router.post('/businesses/:businessId/manpower/hr/successions', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postSuccession));
router.post('/businesses/:businessId/manpower/hr/training-records', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.postTrainingRecord));
router.patch('/businesses/:businessId/manpower/hr/training-records/:trainingId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.patchTrainingRecord));
router.post('/businesses/:businessId/manpower/hr/advanced-seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.seedHrAdvanced));

// Project Planning (Primavera-style)
router.get('/businesses/:businessId/planning/dashboard', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getDashboard));
router.get('/businesses/:businessId/planning/portfolio', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getPortfolioSummary));
router.get('/businesses/:businessId/planning/programs', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getPrograms));
router.post('/businesses/:businessId/planning/programs', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postProgram));
router.get('/businesses/:businessId/planning/projects', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getProjects));
router.post('/businesses/:businessId/planning/projects', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postProject));
router.get('/businesses/:businessId/planning/projects/:projectId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getProjectById));
router.patch('/businesses/:businessId/planning/projects/:projectId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.patchProject));
router.post('/businesses/:businessId/planning/projects/:projectId/wbs', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postWbs));
router.post('/businesses/:businessId/planning/projects/:projectId/activities', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postActivity));
router.post('/businesses/:businessId/planning/projects/:projectId/dependencies', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postDependency));
router.post('/businesses/:businessId/planning/projects/:projectId/recalculate', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postRecalculate));
router.post('/businesses/:businessId/planning/projects/:projectId/baseline', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postBaseline));
router.post('/businesses/:businessId/planning/projects/:projectId/simulate', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postSimulate));
router.post('/businesses/:businessId/planning/projects/:projectId/simulate-batch', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postSimulateBatch));
router.post('/businesses/:businessId/planning/projects/:projectId/import', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postImport));
router.get('/businesses/:businessId/planning/projects/:projectId/evm', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getEvm));
router.post('/businesses/:businessId/planning/projects/:projectId/sync-evm', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postSyncEvm));
router.get('/businesses/:businessId/planning/projects/:projectId/change-orders', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getChangeOrders));
router.post('/businesses/:businessId/planning/projects/:projectId/change-orders', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postChangeOrder));
router.patch('/businesses/:businessId/planning/change-orders/:changeOrderId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.patchChangeOrder));
router.get('/businesses/:businessId/planning/projects/:projectId/leveling', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getLeveling));
router.get('/businesses/:businessId/planning/projects/:projectId/ai-insights', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.getAiInsights));
router.post('/businesses/:businessId/planning/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.seedPlanning));
router.patch('/businesses/:businessId/planning/activities/:activityId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.patchActivity));
router.post('/businesses/:businessId/planning/activities/:activityId/shift', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postShiftActivity));
router.delete('/businesses/:businessId/planning/activities/:activityId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.deleteActivity));
router.post('/businesses/:businessId/planning/activities/:activityId/release', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(planningController.postReleaseActivity));
router.post('/businesses/:businessId/planning/activities/:activityId/resources', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postActivityResource));
router.post('/businesses/:businessId/planning/activities/:activityId/materials', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.postActivityMaterial));
router.delete('/businesses/:businessId/planning/dependencies/:dependencyId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(planningController.deleteDependency));
router.get('/businesses/:businessId/planning/projects/:projectId/s-curve', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getSCurve));
router.get('/businesses/:businessId/planning/projects/:projectId/resource-forecast', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(advancedFeaturesController.getResourceForecast));

router.get('/businesses/:businessId/workforce/shifts', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.getShifts));
router.post('/businesses/:businessId/workforce/shifts', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.createShift));
router.get('/businesses/:businessId/workforce/attendance', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.getAttendance));
router.post('/businesses/:businessId/workforce/attendance/check-in', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.checkIn));
router.post('/businesses/:businessId/workforce/attendance/check-out', authMiddleware, businessAccessMiddleware, asyncHandler(workforceController.checkOut));

// Manpower Agency (Phase 2)
router.get('/businesses/:businessId/manpower/clients', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getClientCompanies));
router.get('/businesses/:businessId/manpower/clients/:clientId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getClientCompany));
router.post('/businesses/:businessId/manpower/clients', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.createClientCompany));
router.get('/businesses/:businessId/manpower/projects', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.getAgencyProjects));
router.post('/businesses/:businessId/manpower/projects', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.createAgencyProject));
router.get('/businesses/:businessId/manpower/projects/:projectId', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.getAgencyProject));
router.patch('/businesses/:businessId/manpower/projects/:projectId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.updateAgencyProject));
router.delete('/businesses/:businessId/manpower/projects/:projectId', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(workforceController.deleteAgencyProject));
router.post('/businesses/:businessId/manpower/seed-demo', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.loadManpowerDemo));
router.post('/businesses/:businessId/manpower/sync-schema', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.syncManpowerSchema));
router.get('/businesses/:businessId/manpower/analytics', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getManpowerAnalytics));
router.get('/businesses/:businessId/manpower/workers', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getWorkerProfiles));
router.post('/businesses/:businessId/manpower/workers', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.createWorkerProfile));
router.get('/businesses/:businessId/manpower/hr', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(hrIntegrationController.getHrSummary));
router.get('/businesses/:businessId/manpower/hr/config', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(hrIntegrationController.getHrConfig));
router.patch('/businesses/:businessId/manpower/hr/config', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(hrIntegrationController.patchHrConfig));
router.post('/businesses/:businessId/manpower/hr/sync', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(hrIntegrationController.postHrSync));
router.post('/businesses/:businessId/manpower/hr/seed', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(hrIntegrationController.seedHr));
router.get('/businesses/:businessId/manpower/worker-categories', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getWorkerCategories));
router.post('/businesses/:businessId/manpower/projects/:projectId/workers', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.addProjectWorker));
router.get('/businesses/:businessId/manpower/projects/:projectId/attendance', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.getProjectWorkerAttendance));
router.put('/businesses/:businessId/manpower/projects/:projectId/attendance', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.setProjectWorkerAttendance));
router.get('/businesses/:businessId/manpower/permissions/catalog', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getProjectPermissionCatalog));
router.get('/businesses/:businessId/manpower/my-project-access', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.getMyProjectAccess));
router.get('/businesses/:businessId/manpower/projects/:projectId/access', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(workforceController.getProjectAccessList));
router.put('/businesses/:businessId/manpower/projects/:projectId/access', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(workforceController.upsertProjectAccess));
router.delete('/businesses/:businessId/manpower/projects/:projectId/access/:memberId', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(workforceController.removeProjectAccess));
router.get('/businesses/:businessId/manpower/placements', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getPlacements));
router.post('/businesses/:businessId/manpower/placements', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.createPlacement));
router.patch('/businesses/:businessId/manpower/placements/:placementId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.updatePlacement));
router.delete('/businesses/:businessId/manpower/placements/:placementId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.deletePlacement));
router.get('/businesses/:businessId/manpower/timesheets', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.getTimesheets));
router.get('/businesses/:businessId/manpower/timesheets/export', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.exportManpowerTimesheets));
router.post('/businesses/:businessId/manpower/timesheets', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.createTimesheet));
router.get('/businesses/:businessId/manpower/timesheets/pending', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getTimesheetPendingQueue));
router.post('/businesses/:businessId/manpower/timesheets/bulk-action', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.bulkTimesheetAction));
router.get('/businesses/:businessId/manpower/policy', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.getManpowerPolicyConfig));
router.patch('/businesses/:businessId/manpower/policy', authMiddleware, businessAccessMiddleware, requireMinRole('OWNER'), asyncHandler(workforceController.updateManpowerPolicyConfig));
router.get('/businesses/:businessId/manpower/live-dashboard', authMiddleware, businessAccessMiddleware, requireMinRole('OFFICE_STAFF'), asyncHandler(workforceController.getManpowerLiveDashboard));
router.patch('/businesses/:businessId/manpower/timesheets/:timesheetId', authMiddleware, businessAccessMiddleware, requireMinRole('MANAGER'), asyncHandler(workforceController.updateTimesheetStatus));

export default router;
