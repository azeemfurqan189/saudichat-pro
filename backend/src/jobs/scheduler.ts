import { Queue } from 'bullmq';

const SCHEDULED_QUEUE = 'scheduled-jobs';

function getConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return { url };
}

export interface AbandonedCartJob {
  type: 'abandoned_cart';
  businessId: string;
  conversationId: string;
  customerId: string;
  phone: string;
  itemName: string;
  price: number;
}

export async function scheduleAbandonedCartReminder(data: AbandonedCartJob, delayMs = 30 * 60 * 1000): Promise<void> {
  const connection = getConnection();
  if (!connection) return;

  const queue = new Queue(SCHEDULED_QUEUE, { connection });
  await Promise.race([
    queue.add('abandoned_cart', data, {
      delay: delayMs,
      jobId: `abandoned:${data.conversationId}:${Date.now()}`,
      removeOnComplete: true,
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('schedule timeout')), 5000)),
  ]).catch((err) => console.warn('[jobs] abandoned cart schedule skipped:', err instanceof Error ? err.message : err));
}

export async function startScheduledJobsProcessor(): Promise<void> {
  const connection = getConnection();
  if (!connection) return;

  const { Worker } = await import('bullmq');
  const worker = new Worker(
    SCHEDULED_QUEUE,
    async (job) => {
      if (job.name === 'abandoned_cart') {
        const data = job.data as AbandonedCartJob;
        const { getConversationState } = await import('../agent/agents');
        const state = await getConversationState(data.businessId, data.conversationId);
        const hasCart = (state.cart?.length ?? 0) > 0 || !!state.pendingOrder;
        if ((state.state === 'confirming_order' || state.state === 'collecting_address' || state.state === 'viewing_cart') && hasCart) {
          const { sendAbandonedCartReminder } = await import('../revenue/revenueAI');
          await sendAbandonedCartReminder(data);
        }
      } else if (job.name === 'winback') {
        const { sendWinBackMessage } = await import('../revenue/revenueAI');
        const d = job.data as { businessId: string; customerId: string; phone: string; name: string };
        await sendWinBackMessage(d.businessId, d.customerId, d.phone, d.name);
      } else if (job.name === 'order_feedback') {
        const { businessId, orderId, customerPhone } = job.data as {
          businessId: string;
          orderId: string;
          customerPhone: string;
        };
        const feedbackMsg = '⭐ How was your experience? Rate us 1-5!\nكيف كانت تجربتك؟ قيّمنا من 1-5!';
        const { validateBotResponse } = await import('../ai/guardrails/responseValidator');
        const { sendWhatsAppText } = await import('../services/whatsappSend');
        const { sanitized: fb } = await validateBotResponse(feedbackMsg, businessId);
        await sendWhatsAppText(businessId, customerPhone, fb);
        const prisma = (await import('../utils/prisma')).default;
        await prisma.workflowLog.create({
          data: { businessId, entityType: 'order', entityId: orderId, step: 'feedback_request', messageSent: fb },
        });
      } else if (job.name === 'analytics_daily') {
        const { runDailyAggregationForAll } = await import('../analytics/aggregator');
        const count = await runDailyAggregationForAll();
        console.log(`[jobs] daily analytics aggregated for ${count} businesses`);
      } else if (job.name === 'analyze_conversations') {
        const { runConversationAnalysisBatch } = await import('./analyzeConversations');
        const count = await runConversationAnalysisBatch(job.data.businessId as string);
        console.log(`[jobs] conversation analysis completed: ${count} conversations`);
      } else if (job.name === 'faq_learning') {
        const { runWeeklyLearning } = await import('./weeklyLearning');
        const businessId = job.data.businessId as string;
        const count = await runWeeklyLearning(businessId);
        console.log(`[jobs] FAQ learning for ${businessId}: ${count} new candidates`);
      } else if (job.name === 'winback_all') {
        const prisma = (await import('../utils/prisma')).default;
        const businesses = await prisma.business.findMany({ where: { isActive: true }, select: { id: true } });
        const { scheduleWinBackCampaign } = await import('./scheduler');
        for (const b of businesses) {
          await scheduleWinBackCampaign(b.id);
        }
      } else if (job.name === 'website_sync') {
        const { runDueWebsiteSyncs } = await import('../services/websiteImportService');
        const count = await runDueWebsiteSyncs();
        console.log(`[jobs] website sync completed for ${count} businesses`);
      } else if (job.name === 'campaign_send') {
        const { businessId, campaignId } = job.data as { businessId: string; campaignId: string };
        const { sendCampaignBroadcast } = await import('../services/campaignService');
        const result = await sendCampaignBroadcast(businessId, campaignId);
        console.log(`[jobs] campaign ${campaignId} sent:`, result);
      } else if (job.name === 'appointment_reminder') {
        const { sendAppointmentReminder } = await import('../services/appointmentReminderService');
        await sendAppointmentReminder(job.data as { appointmentId: string; businessId: string });
      } else if (job.name === 'appointment_reminders') {
        const { runDueAppointmentReminders, runOneHourAppointmentReminders } = await import('../services/appointmentReminderService');
        const count = await runDueAppointmentReminders();
        const count1h = await runOneHourAppointmentReminders();
        console.log(`[jobs] appointment reminders sent: ${count} (24h), ${count1h} (1h)`);
      } else if (job.name === 'lead_followup') {
        const { runLeadFollowUps, runPaymentPendingReminders } = await import('../agent/autonomous/followUp');
        const leads = await runLeadFollowUps();
        const payments = await runPaymentPendingReminders();
        console.log(`[jobs] follow-up: ${leads} leads, ${payments} payment reminders`);
      } else if (job.name === 'proactive_churn') {
        const { runProactiveChurnOffers } = await import('../agent/autonomous/predictive');
        const n = await runProactiveChurnOffers();
        console.log(`[jobs] proactive churn offers: ${n}`);
      } else if (job.name === 'smart_upsell') {
        const { runSmartUpsellCampaigns } = await import('../agent/autonomous/predictive');
        const n = await runSmartUpsellCampaigns();
        console.log(`[jobs] smart upsell: ${n}`);
      } else if (job.name === 'stock_prediction') {
        const { runStockPredictionAlerts } = await import('../agent/autonomous/predictive');
        const n = await runStockPredictionAlerts();
        console.log(`[jobs] stock prediction alerts: ${n}`);
      } else if (job.name === 'revenue_forecast') {
        const { sendOwnerRevenueForecast } = await import('../agent/autonomous/predictive');
        const n = await sendOwnerRevenueForecast();
        console.log(`[jobs] revenue forecast sent: ${n}`);
      } else if (job.name === 'ai_manager_briefing') {
        const { runDailyBusinessManagerBriefing } = await import('../agent/autonomous/autopilot');
        const n = await runDailyBusinessManagerBriefing();
        console.log(`[jobs] AI manager briefings: ${n}`);
      } else if (job.name === 'auto_marketing') {
        const { runAutoMarketingCampaigns } = await import('../agent/autonomous/autopilot');
        const n = await runAutoMarketingCampaigns();
        console.log(`[jobs] auto marketing proposals: ${n}`);
      } else if (job.name === 'staff_schedule') {
        const { generateWeeklyStaffSchedule } = await import('../agent/autonomous/autopilot');
        const n = await generateWeeklyStaffSchedule();
        console.log(`[jobs] staff schedules: ${n}`);
      } else if (job.name === 'timesheet_approval_reminders') {
        const { runTimesheetApprovalReminders } = await import('../services/timesheetReminderService');
        const n = await runTimesheetApprovalReminders();
        console.log(`[jobs] timesheet approval reminders: ${n}`);
      }
    },
    { connection, concurrency: 3 }
  );

  worker.on('failed', (job, err) => console.error(`[jobs] ${job?.name} failed:`, err.message));
  console.log('[jobs] Scheduled jobs processor started');
}

export async function scheduleWinBackCampaign(businessId: string): Promise<number> {
  const connection = getConnection();
  if (!connection) return 0;

  const prisma = (await import('../utils/prisma')).default;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const inactive = await prisma.customer.findMany({
    where: { businessId, lastInteraction: { lt: cutoff } },
    take: 50,
  });

  const queue = new Queue(SCHEDULED_QUEUE, { connection });
  for (const c of inactive) {
    await queue.add('winback', { businessId, customerId: c.id, phone: c.phone, name: c.name }, { removeOnComplete: true });
  }
  return inactive.length;
}

export async function scheduleOrderFeedbackRequest(
  businessId: string,
  orderId: string,
  customerPhone: string,
  delayMs = 60_000
): Promise<void> {
  const connection = getConnection();
  if (!connection) return;

  const queue = new Queue(SCHEDULED_QUEUE, { connection });
  await queue.add(
    'order_feedback',
    { businessId, orderId, customerPhone },
    { delay: delayMs, jobId: `feedback:${orderId}`, removeOnComplete: true }
  );
}

export async function scheduleWeeklyLearning(businessId: string): Promise<void> {
  const connection = getConnection();
  if (!connection) return;
  const queue = new Queue(SCHEDULED_QUEUE, { connection });
  await queue.add('faq_learning', { businessId }, { removeOnComplete: true });
}

export async function startRepeatableJobs(): Promise<void> {
  const connection = getConnection();
  if (!connection) return;

  const prisma = (await import('../utils/prisma')).default;
  const businesses = await prisma.business.findMany({ where: { isActive: true }, select: { id: true } });

  const queue = new Queue(SCHEDULED_QUEUE, { connection });

  for (const b of businesses) {
    await queue.add('faq_learning', { businessId: b.id }, {
      repeat: { pattern: '0 3 * * 0' },
      jobId: `weekly-learning-${b.id}`,
    });
  }

  await queue.add('winback_all', {}, {
    repeat: { pattern: '0 10 * * *' },
    jobId: 'daily-winback',
  });

  await queue.add('website_sync', {}, {
    repeat: { pattern: '0 */6 * * *' },
    jobId: 'website-sync-check',
  });

  await queue.add('appointment_reminders', {}, {
    repeat: { pattern: '0 * * * *' },
    jobId: 'hourly-appointment-reminders',
  });

  await queue.add('lead_followup', {}, {
    repeat: { pattern: '0 11 * * *' },
    jobId: 'daily-lead-followup',
  });

  await queue.add('proactive_churn', {}, {
    repeat: { pattern: '0 10 * * *' },
    jobId: 'daily-proactive-churn',
  });

  await queue.add('revenue_forecast', {}, {
    repeat: { pattern: '0 7 * * *' },
    jobId: 'daily-revenue-forecast',
  });

  await queue.add('ai_manager_briefing', {}, {
    repeat: { pattern: '0 8 * * *' },
    jobId: 'daily-ai-manager',
  });

  await queue.add('smart_upsell', {}, {
    repeat: { pattern: '0 17 * * 3' },
    jobId: 'weekly-smart-upsell',
  });

  await queue.add('stock_prediction', {}, {
    repeat: { pattern: '0 9 * * 1' },
    jobId: 'weekly-stock-prediction',
  });

  await queue.add('auto_marketing', {}, {
    repeat: { pattern: '0 20 * * 0' },
    jobId: 'weekly-auto-marketing',
  });

  await queue.add('staff_schedule', {}, {
    repeat: { pattern: '0 21 * * 0' },
    jobId: 'weekly-staff-schedule',
  });

  await queue.add('analytics_daily', {}, {
    repeat: { pattern: '0 2 * * *' },
    jobId: 'daily-analytics-rollup',
  });

  await queue.add('timesheet_approval_reminders', {}, {
    repeat: { pattern: '0 */4 * * *' },
    jobId: 'timesheet-approval-reminders',
  });

  for (const b of businesses) {
    await queue.add('analyze_conversations', { businessId: b.id }, {
      repeat: { pattern: '0 4 * * *' },
      jobId: `daily-conv-analysis-${b.id}`,
    });
  }
}
