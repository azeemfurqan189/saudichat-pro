import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as businessController from '../controllers/businessController';
import * as resourceController from '../controllers/resourceController';
import { authMiddleware, businessAccessMiddleware } from '../middleware/auth';
import { authLimiter, apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Auth routes
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/signup', authLimiter, authController.signup);
router.post('/auth/verify-otp', authLimiter, authController.verifySignupOtp);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);
router.get('/auth/me', authMiddleware, authController.getMe);

// Business routes
router.post('/businesses', authMiddleware, businessController.createBusiness);
router.get('/businesses/:businessId', authMiddleware, businessAccessMiddleware, businessController.getBusiness);
router.patch('/businesses/:businessId', authMiddleware, businessAccessMiddleware, businessController.updateBusiness);
router.get('/businesses/:businessId/dashboard', authMiddleware, businessAccessMiddleware, businessController.getDashboardStats);
router.post('/businesses/:businessId/whatsapp/test', authMiddleware, businessAccessMiddleware, businessController.testWhatsAppConnection);

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
router.get('/businesses/:businessId/promo-codes', authMiddleware, businessAccessMiddleware, resourceController.getPromoCodes);
router.post('/businesses/:businessId/promo-codes', authMiddleware, businessAccessMiddleware, resourceController.createPromoCode);
router.get('/businesses/:businessId/loyalty-rewards', authMiddleware, businessAccessMiddleware, resourceController.getLoyaltyRewards);

// Analytics
router.get('/businesses/:businessId/analytics', authMiddleware, businessAccessMiddleware, resourceController.getAnalytics);

// Settings
router.get('/businesses/:businessId/auto-replies', authMiddleware, businessAccessMiddleware, resourceController.getAutoReplies);
router.post('/businesses/:businessId/auto-replies', authMiddleware, businessAccessMiddleware, resourceController.createAutoReply);
router.patch('/businesses/:businessId/auto-replies/:ruleId', authMiddleware, businessAccessMiddleware, resourceController.updateAutoReply);
router.delete('/businesses/:businessId/auto-replies/:ruleId', authMiddleware, businessAccessMiddleware, resourceController.deleteAutoReply);
router.get('/businesses/:businessId/staff', authMiddleware, businessAccessMiddleware, resourceController.getStaff);
router.post('/businesses/:businessId/staff', authMiddleware, businessAccessMiddleware, resourceController.createStaff);
router.get('/businesses/:businessId/notifications', authMiddleware, businessAccessMiddleware, resourceController.getNotifications);
router.patch('/businesses/:businessId/notifications/:notificationId/read', authMiddleware, businessAccessMiddleware, resourceController.markNotificationRead);

export default router;
