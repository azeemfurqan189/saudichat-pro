import prisma from '../utils/prisma';
import { sendBotMessage, sendBotOutbound } from '../whatsapp/flows/router-helpers';
import { ToolContext } from './toolExecutor';
import { DetectedLanguage, pickLocalized } from '../ai/language/detector';
import { trackEvent } from '../analytics/eventTracker';
import { trackFunnelStep } from '../analytics/funnelTracker';
import { CartLine, getConversationState, setConversationState } from './conversationState';
import {
  PAYLOAD,
  parsePayload,
  getCatalogCategories,
  getItemsByCategory,
  getAllCatalogItems,
  buildCategoryListSections,
  buildCategoryMenuText,
  buildItemListSections,
  findItemByGlobalIndex,
  formatItemPrice,
  slugifyCategory,
} from './interactiveCatalog';

const TRACK_KEYWORDS = ['track order', 'order status', 'mera order', 'where is my order', 'تتبع', 'حالة الطلب', 'order track', 'track mera'];

const MENU_KEYWORDS = [
  'menu',
  'order',
  'قائمة',
  'طلب',
  'اطلب',
  'monu',
  'kia menu',
  'full menu',
  'burger',
  'pizza',
  'khana',
  'food',
  'منيو',
  'اكل',
  'what do you have',
  'kya hai',
];

export function isTrackOrderIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (/^ORD-[A-Z0-9]+$/i.test(lower) || lower.includes('ord-')) return true;
  if (lower === PAYLOAD.track || lower === 'btn:track') return true;
  const parsed = parsePayload(text);
  if (parsed?.type === 'btn' && parsed.value === 'track') return true;
  if (TRACK_KEYWORDS.some((k) => lower.includes(k))) return true;
  if ((lower === 'track' || lower === 'تتبع') && !isMenuOrOrderIntent(text)) return true;
  return false;
}

export function isMenuOrOrderIntent(text: string): boolean {
  if (parsePayload(text)) {
    const p = parsePayload(text)!;
    if (p.type === 'cat' || p.type === 'item' || p.type === 'pay') return true;
    if (p.type === 'btn') {
      const v = p.value;
      if (['order', 'confirm_item', 'change_item', 'cancel_order', 'confirm_order'].includes(v)) return true;
      if (v.startsWith('more:cats:') || v.startsWith('more:items:')) return true;
    }
  }
  const lower = text.toLowerCase().trim();
  return MENU_KEYWORDS.some((w) => lower.includes(w));
}

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  PENDING: { en: 'Pending confirmation', ar: 'بانتظار التأكيد' },
  CONFIRMED: { en: 'Confirmed', ar: 'تم التأكيد' },
  PREPARING: { en: 'Being prepared', ar: 'قيد التحضير' },
  READY: { en: 'Ready for pickup/delivery', ar: 'جاهز' },
  DELIVERED: { en: 'Delivered', ar: 'تم التوصيل' },
  CANCELLED: { en: 'Cancelled', ar: 'ملغي' },
};

export async function sendWelcomeButtons(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const body = pickLocalized(
    lang,
    'Welcome! How can we help you today?',
    'مرحباً! كيف يمكننا مساعدتك؟',
    'Khush amdeed! Aaj hum aap ki kaise madad kar sakte hain?'
  );

  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'buttons',
      body,
      buttons: [
        { id: PAYLOAD.order, title: pickLocalized(lang, 'View Menu', 'القائمة', 'Menu') },
        { id: PAYLOAD.track, title: pickLocalized(lang, 'Track Order', 'تتبع', 'Track') },
        { id: PAYLOAD.help, title: pickLocalized(lang, 'Help', 'مساعدة', 'Help') },
      ],
    },
    body
  );
}

export async function sendMenuQuickButtons(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const body = pickLocalized(lang, 'Need the menu or to track an order?', 'تحتاج القائمة أو تتبع الطلب؟', 'Menu ya track chahiye?');
  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'buttons',
      body,
      buttons: [
        { id: PAYLOAD.order, title: pickLocalized(lang, 'View Menu', 'القائمة', 'Menu') },
        { id: PAYLOAD.track, title: pickLocalized(lang, 'Track Order', 'تتبع', 'Track') },
      ],
    },
    body
  );
}

async function getMenuDisplayMode(businessId: string): Promise<string> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings as Record<string, unknown>) || {};
  return String(settings.menuDisplayMode || 'pdf_then_list');
}

async function sendTextMenuCatalog(ctx: ToolContext, lang: DetectedLanguage): Promise<boolean> {
  const categories = await getCatalogCategories(ctx.businessId);
  if (categories.length === 0) return false;

  const allItems = await getAllCatalogItems(ctx.businessId);
  const lines: string[] = [
    pickLocalized(lang, '📋 *Our Menu*', '📋 *قائمتنا*', '📋 *Menu*'),
    pickLocalized(lang, 'Reply with item number to order:', 'رد برقم الصنف للطلب:', 'Order ke liye number reply karein:'),
    '',
  ];

  let globalIndex = 1;
  for (const cat of categories) {
    lines.push(`📂 *${cat}*`);
    const items = allItems.filter((i) => (i.category?.trim() || 'Menu') === cat);
    for (const item of items.slice(0, 25)) {
      const name =
        lang === 'en' && item.nameEn?.trim()
          ? item.nameEn
          : lang === 'ar'
            ? item.nameAr
            : `${item.nameAr}${item.nameEn ? ` / ${item.nameEn}` : ''}`;
      lines.push(`${globalIndex}. ${name} — ${formatItemPrice(item)}`);
      globalIndex++;
    }
    lines.push('');
  }

  await sendBotMessage(ctx.conversationId, lines.join('\n').trim(), ctx.businessId, ctx.phone);
  return true;
}

export async function sendFullMenuExperience(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const mode = await getMenuDisplayMode(ctx.businessId);

  const hasItems = await sendTextMenuCatalog(ctx, lang);
  if (!hasItems) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(
        lang,
        'Our menu is being updated. Add items in Dashboard → Catalog or import from website.',
        'القائمة قيد التحديث — أضف المنتجات من لوحة التحكم.'
      ),
      ctx.businessId,
      ctx.phone
    );
    return;
  }

  // Interactive list (optional — some channels may not render it)
  if (mode !== 'pdf_only') {
    try {
      await sendCategoryPicker(ctx, lang, 0);
    } catch (err) {
      console.warn('[salesFlow] category list skipped:', err instanceof Error ? err.message : err);
    }
  }

  if (mode !== 'list_only') {
    try {
      const { getOrGenerateMenuPdfUrl } = await import('../services/menuPdfService');
      const pdfUrl = await getOrGenerateMenuPdfUrl(ctx.businessId);
      if (pdfUrl) {
        const caption = pickLocalized(
          lang,
          '📄 Full menu PDF — scroll to browse all items.',
          '📄 قائمة PDF كاملة — مرّر لعرض كل الأصناف.',
          '📄 Poori menu PDF — scroll karein.'
        );
        await sendBotOutbound(
          ctx.conversationId,
          ctx.businessId,
          ctx.phone,
          { type: 'document', documentUrl: pdfUrl, filename: 'Menu.pdf', caption },
          caption
        );
      }
    } catch (err) {
      console.warn('[salesFlow] menu PDF skipped:', err instanceof Error ? err.message : err);
    }
  }

  if (mode === 'pdf_only') {
    const hint = pickLocalized(
      lang,
      'Reply with item number from the PDF, or type a category name.',
      'رد برقم الصنف من PDF أو اكتب اسم الفئة.',
      'PDF se item number reply karein.'
    );
    await sendBotMessage(ctx.conversationId, hint, ctx.businessId, ctx.phone);
    await setConversationState(ctx.businessId, ctx.conversationId, { state: 'ordering' });
  }
}

export async function sendCategoryPicker(ctx: ToolContext, lang: DetectedLanguage, page = 0): Promise<void> {
  const categories = await getCatalogCategories(ctx.businessId);
  if (categories.length === 0) {
    return;
  }

  if (categories.length === 1 && page === 0) {
    await showCategoryMenu(ctx, categories[0], lang, 0);
    return;
  }

  const body = pickLocalized(
    lang,
    'Tap a category to order:',
    'اضغط على فئة للطلب:',
    'Order ke liye category chunein:'
  );
  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'list',
      body,
      buttonLabel: pickLocalized(lang, 'Categories', 'الفئات', 'Categories'),
      sections: buildCategoryListSections(categories, page),
    },
    body
  );
  await setConversationState(ctx.businessId, ctx.conversationId, { state: 'ordering' });
}

export async function showCategoryMenu(
  ctx: ToolContext,
  categoryName: string,
  lang: DetectedLanguage,
  itemPage = 0
): Promise<void> {
  const slug = slugifyCategory(categoryName);
  const items = await getItemsByCategory(ctx.businessId, slug);
  if (items.length === 0) {
    await sendCategoryPicker(ctx, lang, 0);
    return;
  }

  const allItems = await getAllCatalogItems(ctx.businessId);
  const startIndex = allItems.findIndex((i) => i.id === items[0].id);
  const menuText = buildCategoryMenuText(categoryName, items, lang, startIndex >= 0 ? startIndex : 0);

  if (itemPage === 0) {
    await sendBotMessage(ctx.conversationId, menuText, ctx.businessId, ctx.phone);
    const categoryImage = items.find((i) => i.image?.startsWith('http'))?.image;
    if (categoryImage) {
      await sendBotOutbound(
        ctx.conversationId,
        ctx.businessId,
        ctx.phone,
        {
          type: 'image',
          imageUrl: categoryImage,
          caption: `📂 ${categoryName}`.slice(0, 1024),
        },
        categoryName
      );
    }
  }

  const listBody =
    itemPage > 0
      ? pickLocalized(lang, 'More items:', 'المزيد:', 'Aur items:')
      : menuText.slice(0, 1024);

  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'list',
      body: listBody,
      buttonLabel: pickLocalized(lang, 'Pick item', 'اختر', 'Select'),
      sections: buildItemListSections(items, lang, itemPage, slug),
    },
    listBody
  );

  await setConversationState(ctx.businessId, ctx.conversationId, {
    state: 'ordering',
    selectedCategory: slug,
    categoryItemIds: items.map((i) => i.id),
    categoryStartIndex: startIndex >= 0 ? startIndex : 0,
  });
  await trackEvent({ businessId: ctx.businessId, conversationId: ctx.conversationId, eventType: 'menu_shown' });
  await trackFunnelStep({ businessId: ctx.businessId, conversationId: ctx.conversationId, step: 'menu' });
}

function getActiveCart(state: Awaited<ReturnType<typeof getConversationState>>): CartLine[] {
  if (state.cart?.length) return state.cart;
  if (state.pendingOrder) return [state.pendingOrder];
  return [];
}

function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

function buildCartSummaryText(cart: CartLine[], lang: DetectedLanguage): string {
  const lines = cart.map((line) => `• ${line.name} x${line.quantity} — ${line.price * line.quantity} SAR`);
  const subtotal = cartSubtotal(cart);
  const header = pickLocalized(lang, '🛒 Your cart:', '🛒 سلتك:', '🛒 Aapki cart:');
  return `${header}\n\n${lines.join('\n')}\n\n${pickLocalized(lang, 'Subtotal', 'المجموع', 'Subtotal')}: ${subtotal} SAR`;
}

async function promptItemConfirm(ctx: ToolContext, itemId: string, lang: DetectedLanguage): Promise<void> {
  const item = await prisma.catalogItem.findFirst({
    where: { id: itemId, businessId: ctx.businessId, isAvailable: true },
  });
  if (!item) {
    await sendBotMessage(ctx.conversationId, pickLocalized(lang, 'Item not found.', 'المنتج غير موجود.'), ctx.businessId, ctx.phone);
    return;
  }

  const price = item.discountPrice ?? item.price;
  await setConversationState(ctx.businessId, ctx.conversationId, {
    state: 'confirming_item',
    pendingItem: { catalogItemId: item.id, name: item.nameAr, price },
  });

  const name = lang === 'en' && item.nameEn ? item.nameEn : item.nameAr;
  const msg = pickLocalized(
    lang,
    `${name}\n${formatItemPrice(item)}\n\nOrder this item?`,
    `${item.nameAr}\n${formatItemPrice(item)}\n\nتأكيد الطلب؟`,
    `${item.nameAr}\n${formatItemPrice(item)}\n\nYeh item order karni hai?`
  );

  const buttons = [
    { id: PAYLOAD.confirmItem, title: pickLocalized(lang, 'Confirm', 'تأكيد', 'Confirm') },
    { id: PAYLOAD.changeItem, title: pickLocalized(lang, 'Change', 'تغيير', 'Change') },
    { id: PAYLOAD.cancelOrder, title: pickLocalized(lang, 'Cancel', 'إلغاء', 'Cancel') },
  ];

  if (item.image?.startsWith('http')) {
    await sendBotOutbound(ctx.conversationId, ctx.businessId, ctx.phone, { type: 'image', imageUrl: item.image, caption: msg.slice(0, 1024) }, msg);
    await sendBotOutbound(ctx.conversationId, ctx.businessId, ctx.phone, { type: 'buttons', body: pickLocalized(lang, 'Confirm your order:', 'أكّد طلبك:', 'Confirm karein:'), buttons }, msg);
  } else {
    await sendBotOutbound(ctx.conversationId, ctx.businessId, ctx.phone, { type: 'buttons', body: msg, buttons }, msg);
  }
}

async function promptQuantitySelection(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const pending = state.pendingItem;
  if (!pending) {
    await sendWelcomeButtons(ctx, lang);
    return;
  }

  const body = pickLocalized(
    lang,
    `How many × ${pending.name}?`,
    `كم عدد × ${pending.name}؟`,
    `Kitne × ${pending.name}?`
  );

  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'buttons',
      body,
      buttons: [
        { id: PAYLOAD.qty(1), title: '1' },
        { id: PAYLOAD.qty(2), title: '2' },
        { id: PAYLOAD.qty(3), title: '3' },
      ],
    },
    body
  );

  await sendBotMessage(
    ctx.conversationId,
    pickLocalized(lang, 'Or reply with a number (1–10).', 'أو رد برقم (1–10).', 'Ya number reply karein (1–10).'),
    ctx.businessId,
    ctx.phone
  );

  await setConversationState(ctx.businessId, ctx.conversationId, { state: 'selecting_quantity' });
}

async function addItemToCart(ctx: ToolContext, quantity: number, lang: DetectedLanguage): Promise<void> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const pending = state.pendingItem;
  if (!pending) {
    await sendWelcomeButtons(ctx, lang);
    return;
  }

  const qty = Math.min(Math.max(quantity, 1), 10);
  const cart = [...getActiveCart(state)];
  const existing = cart.find((line) => line.catalogItemId === pending.catalogItemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ catalogItemId: pending.catalogItemId, quantity: qty, name: pending.name, price: pending.price });
  }

  await setConversationState(ctx.businessId, ctx.conversationId, {
    state: 'viewing_cart',
    cart,
    pendingItem: undefined,
    pendingOrder: cart.length === 1 ? cart[0] : undefined,
  });

  await showCartAndActions(ctx, lang);
}

async function showCartAndActions(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const cart = getActiveCart(state);
  if (cart.length === 0) {
    await sendCategoryPicker(ctx, lang, 0);
    return;
  }

  const summary = buildCartSummaryText(cart, lang);
  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'buttons',
      body: summary,
      buttons: [
        { id: PAYLOAD.addMore, title: pickLocalized(lang, 'Add More', 'المزيد', 'Aur') },
        { id: PAYLOAD.checkout, title: pickLocalized(lang, 'Checkout', 'إتمام', 'Checkout') },
        { id: PAYLOAD.cancelOrder, title: pickLocalized(lang, 'Cancel', 'إلغاء', 'Cancel') },
      ],
    },
    summary
  );
}

async function startCheckout(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const cart = getActiveCart(state);
  if (cart.length === 0) {
    await sendWelcomeButtons(ctx, lang);
    return;
  }

  const itemNames = cart.map((c) => c.name).join(', ');
  const total = cartSubtotal(cart);

  const { scheduleAbandonedCartReminder } = await import('../jobs/scheduler');
  await scheduleAbandonedCartReminder({
    type: 'abandoned_cart',
    businessId: ctx.businessId,
    conversationId: ctx.conversationId,
    customerId: ctx.customerId,
    phone: ctx.phone,
    itemName: itemNames,
    price: total,
  });

  await setConversationState(ctx.businessId, ctx.conversationId, { state: 'collecting_address' });

  await sendBotMessage(
    ctx.conversationId,
    pickLocalized(
      lang,
      `✅ ${cart.length} item(s) — ${total} SAR\n\nPlease send your delivery address.`,
      `✅ ${cart.length} صنف — ${total} ريال\n\nأرسل عنوان التوصيل.`,
      `✅ ${cart.length} items — ${total} SAR\n\nDelivery address bhejein.`
    ),
    ctx.businessId,
    ctx.phone
  );
}

async function showOrderSummaryAndConfirmCod(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const cart = getActiveCart(state);
  if (cart.length === 0) {
    await sendWelcomeButtons(ctx, lang);
    return;
  }

  const { getPaymentSettings } = await import('../services/paymentConfigService');
  const { deliveryFee } = await getPaymentSettings(ctx.businessId);
  const subtotal = cartSubtotal(cart);
  const total = subtotal + deliveryFee;
  const address = state.deliveryAddress || '—';
  const itemLines = cart.map((line) => `• ${line.name} x${line.quantity} — ${line.price * line.quantity} SAR`).join('\n');

  const summary = pickLocalized(
    lang,
    `📋 Order summary\n\n${itemLines}\n• Delivery — ${deliveryFee} SAR\n\n📍 ${address}\n\n💰 Total: ${total} SAR\n💵 Payment: Cash on Delivery`,
    `📋 ملخص الطلب\n\n${itemLines}\n• التوصيل — ${deliveryFee} ريال\n\n📍 ${address}\n\n💰 المجموع: ${total} ريال\n💵 الدفع: نقد عند التوصيل`,
    `📋 Order summary\n\n${itemLines}\n• Delivery — ${deliveryFee} SAR\n\n📍 ${address}\n\n💰 Total: ${total} SAR\n💵 COD (delivery par pay)`
  );

  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'buttons',
      body: summary,
      buttons: [
        { id: PAYLOAD.confirmOrder, title: pickLocalized(lang, 'Confirm Order', 'تأكيد الطلب', 'Confirm') },
        { id: PAYLOAD.cancelOrder, title: pickLocalized(lang, 'Cancel', 'إلغاء', 'Cancel') },
      ],
    },
    summary
  );
  await setConversationState(ctx.businessId, ctx.conversationId, { state: 'confirming_order' });
}

async function sendPostOrderButtons(ctx: ToolContext, lang: DetectedLanguage): Promise<void> {
  const body = pickLocalized(lang, 'Anything else?', 'هل تحتاج شيئاً آخر؟', 'Aur kuch?');
  await sendBotOutbound(
    ctx.conversationId,
    ctx.businessId,
    ctx.phone,
    {
      type: 'buttons',
      body,
      buttons: [
        { id: PAYLOAD.track, title: pickLocalized(lang, 'Track Order', 'تتبع', 'Track') },
        { id: PAYLOAD.order, title: pickLocalized(lang, 'View Menu', 'القائمة', 'Menu') },
      ],
    },
    body
  );
}

async function finalizeOrder(ctx: ToolContext, paymentMethod: string, lang: DetectedLanguage): Promise<void> {
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const cart = getActiveCart(state);
  if (cart.length === 0) {
    await sendWelcomeButtons(ctx, lang);
    return;
  }

  const { executeTool } = await import('./toolExecutor');
  const result = await executeTool(
    { ...ctx, state: 'confirming_order' },
    'createOrder',
    {
      items: cart.map((line) => ({ catalogItemId: line.catalogItemId, quantity: line.quantity })),
      paymentMethod: paymentMethod || 'Cash on Delivery',
      deliveryAddress: state.deliveryAddress,
    }
  );

  await setConversationState(ctx.businessId, ctx.conversationId, {
    state: 'idle',
    cart: undefined,
    pendingOrder: undefined,
    pendingItem: undefined,
    deliveryAddress: undefined,
    paymentMethod: undefined,
    lastOrderId: result.success && result.result ? (result.result as { orderId: string }).orderId : undefined,
  });

  if (result.success && result.result) {
    const r = result.result as { orderNumber: string; total: number; orderId: string };
    await trackEvent({
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      eventType: 'order_created',
      metadata: { orderNumber: r.orderNumber, total: r.total },
    });
    await trackFunnelStep({
      businessId: ctx.businessId,
      conversationId: ctx.conversationId,
      step: 'order_created',
      metadata: { orderNumber: r.orderNumber },
    });
    if (state.deliveryAddress) {
      const { fulfillOrderAfterCreate } = await import('./autonomous/orderFulfillment');
      await fulfillOrderAfterCreate(ctx.businessId, r.orderId, ctx.phone, lang);
    } else {
      await sendBotMessage(
        ctx.conversationId,
        pickLocalized(
          lang,
          `🎉 Order confirmed!\n\nOrder #: ${r.orderNumber}\nTotal: ${r.total} SAR\nPayment: Cash on Delivery\n\nPay when your order arrives. We will update you on status.`,
          `🎉 تم تأكيد الطلب!\n\nرقم الطلب: ${r.orderNumber}\nالمجموع: ${r.total} ريال\nالدفع: نقد عند التوصيل`,
          `🎉 Order confirm!\n\n#${r.orderNumber}\nTotal: ${r.total} SAR\nCOD — delivery par pay karein.`
        ),
        ctx.businessId,
        ctx.phone
      );
    }
    await sendPostOrderButtons(ctx, lang);
    const { suggestUpsell } = await import('../revenue/revenueAI');
    await suggestUpsell(ctx.businessId, ctx.conversationId, ctx.customerId, ctx.phone, r.total);
    return;
  }

  await sendBotMessage(ctx.conversationId, pickLocalized(lang, 'Could not place order. Try again.', 'تعذر إتمام الطلب.'), ctx.businessId, ctx.phone);
}

export async function runOrderTrackingAgent(ctx: ToolContext, text: string, lang: DetectedLanguage): Promise<void> {
  const orderNumMatch = text.match(/ORD-[A-Z0-9]+/i);
  let order;

  if (orderNumMatch) {
    order = await prisma.order.findFirst({
      where: { businessId: ctx.businessId, orderNumber: orderNumMatch[0].toUpperCase(), customerId: ctx.customerId },
    });
  } else {
    order = await prisma.order.findFirst({
      where: { businessId: ctx.businessId, customerId: ctx.customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!order) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(lang, 'No orders found. Type "menu" to order.', 'لا توجد طلبات. اكتب "قائمة" للطلب.'),
      ctx.businessId,
      ctx.phone
    );
    return;
  }

  const status = STATUS_LABELS[order.status] || { en: order.status, ar: order.status };
  const items = order.items as Array<{ name?: string; quantity?: number; price?: number }>;
  const itemLines = items.map((i) => `• ${i.quantity ?? 1}x ${i.name ?? 'Item'} — ${i.price ?? 0} SAR`).join('\n');

  const msg = pickLocalized(
    lang,
    `📦 Order #${order.orderNumber}\nStatus: ${status.en}\nPayment: ${order.paymentMethod || 'N/A'} (${order.paymentStatus})\n\n${itemLines}\n\nTotal: ${order.total} SAR`,
    `📦 طلب #${order.orderNumber}\nالحالة: ${status.ar}\nالدفع: ${order.paymentMethod || '—'}\n\n${itemLines}\n\nالمجموع: ${order.total} ريال`
  );

  await sendBotMessage(ctx.conversationId, msg, ctx.businessId, ctx.phone);
}

export async function runInteractiveSalesAgent(
  ctx: ToolContext,
  text: string,
  normalizedText: string,
  lang: DetectedLanguage = 'mixed'
): Promise<void> {
  const payload = parsePayload(normalizedText);
  const state = await getConversationState(ctx.businessId, ctx.conversationId);
  const numMatch = normalizedText.match(/^(\d+)$/);

  if (payload?.type === 'btn') {
    if (payload.value === 'order') {
      await sendFullMenuExperience(ctx, lang);
      return;
    }
    if (payload.value === 'track') {
      await runOrderTrackingAgent(ctx, normalizedText, lang);
      return;
    }
    if (payload.value === 'help') {
      await sendBotMessage(
        ctx.conversationId,
        pickLocalized(lang, 'Ask any question, type "menu" to order, or tap Track Order.', 'اسأل أي سؤال أو اكتب "قائمة".'),
        ctx.businessId,
        ctx.phone
      );
      return;
    }
    if (payload.value === 'confirm_item') {
      await promptQuantitySelection(ctx, lang);
      return;
    }
    if (payload.value === 'add_more') {
      await sendCategoryPicker(ctx, lang, 0);
      return;
    }
    if (payload.value === 'checkout') {
      await startCheckout(ctx, lang);
      return;
    }
    if (payload.value === 'change_item') {
      await sendCategoryPicker(ctx, lang, 0);
      return;
    }
    if (payload.value === 'cancel_order') {
      await setConversationState(ctx.businessId, ctx.conversationId, { state: 'idle', cart: undefined, pendingOrder: undefined, pendingItem: undefined });
      await sendWelcomeButtons(ctx, lang);
      return;
    }
    if (payload.value === 'confirm_order') {
      await finalizeOrder(ctx, 'Cash on Delivery', lang);
      return;
    }
    if (payload.value.startsWith('more:cats:')) {
      const page = parseInt(payload.value.split(':')[2] || '0', 10);
      await sendCategoryPicker(ctx, lang, page);
      return;
    }
    if (payload.value.startsWith('more:items:')) {
      const parts = payload.value.split(':');
      const slug = parts[2] || '';
      const page = parseInt(parts[3] || '0', 10);
      const items = await getItemsByCategory(ctx.businessId, slug);
      const catName = items[0]?.category || slug;
      await showCategoryMenu(ctx, catName, lang, page);
      return;
    }
  }

  if (payload?.type === 'cat') {
    const items = await getItemsByCategory(ctx.businessId, payload.value);
    const catName = items[0]?.category || payload.value;
    await showCategoryMenu(ctx, catName, lang, 0);
    return;
  }

  if (payload?.type === 'item') {
    await promptItemConfirm(ctx, payload.value, lang);
    return;
  }

  if (payload?.type === 'qty') {
    const qty = parseInt(payload.value, 10);
    if (qty >= 1 && qty <= 10) {
      await addItemToCart(ctx, qty, lang);
      return;
    }
  }

  if (payload?.type === 'pay') {
    if (payload.value === 'cod') {
      await finalizeOrder(ctx, 'Cash on Delivery', lang);
    }
    return;
  }

  if (state.state === 'confirming_item') {
    const lower = normalizedText.toLowerCase();
    if (lower.includes('yes') || lower.includes('confirm') || lower.includes('ok') || lower.includes('نعم') || lower.includes('تأكيد')) {
      await promptQuantitySelection(ctx, lang);
      return;
    }
    if (lower.includes('cancel') || lower.includes('no') || lower.includes('إلغاء')) {
      await setConversationState(ctx.businessId, ctx.conversationId, { state: 'idle', pendingItem: undefined });
      await sendWelcomeButtons(ctx, lang);
      return;
    }
  }

  if (state.state === 'selecting_quantity') {
    const qtyMatch = normalizedText.match(/^(\d{1,2})$/);
    if (qtyMatch) {
      const qty = parseInt(qtyMatch[1], 10);
      if (qty >= 1 && qty <= 10) {
        await addItemToCart(ctx, qty, lang);
        return;
      }
    }
  }

  if (state.state === 'viewing_cart') {
    const lower = normalizedText.toLowerCase();
    if (lower.includes('checkout') || lower.includes('done') || lower.includes('إتمام') || lower.includes('تأكيد')) {
      await startCheckout(ctx, lang);
      return;
    }
    if (lower.includes('more') || lower.includes('add') || lower.includes('مزيد') || lower.includes('المزيد')) {
      await sendCategoryPicker(ctx, lang, 0);
      return;
    }
  }

  if (state.state === 'collecting_address' && normalizedText.length > 3 && !numMatch) {
    await setConversationState(ctx.businessId, ctx.conversationId, {
      deliveryAddress: text.trim(),
    });
    await showOrderSummaryAndConfirmCod(ctx, lang);
    return;
  }

  if (state.state === 'confirming_order') {
    const lower = normalizedText.toLowerCase();
    if (lower.includes('yes') || lower.includes('confirm') || lower.includes('ok') || lower.includes('نعم') || lower.includes('تأكيد')) {
      await finalizeOrder(ctx, 'Cash on Delivery', lang);
      return;
    }
    if (lower.includes('cancel') || lower.includes('no') || lower.includes('إلغاء')) {
      await setConversationState(ctx.businessId, ctx.conversationId, { state: 'idle', cart: undefined, pendingOrder: undefined });
      await sendWelcomeButtons(ctx, lang);
      return;
    }
  }

  if (state.state === 'selecting_payment') {
    await finalizeOrder(ctx, 'Cash on Delivery', lang);
    return;
  }

  if (numMatch && (state.state === 'ordering' || state.state === 'confirming_order' || state.state === 'idle')) {
    const index = parseInt(numMatch[1], 10);
    const item = await findItemByGlobalIndex(ctx.businessId, index);
    if (item) {
      await promptItemConfirm(ctx, item.id, lang);
      return;
    }
  }

  if (isMenuOrOrderIntent(normalizedText)) {
    await sendFullMenuExperience(ctx, lang);
    return;
  }

  if (isTrackOrderIntent(normalizedText)) {
    await runOrderTrackingAgent(ctx, normalizedText, lang);
    return;
  }

  const categories = await getCatalogCategories(ctx.businessId);
  if (categories.length === 0) {
    await sendBotMessage(
      ctx.conversationId,
      pickLocalized(
        lang,
        'Our menu is being updated. Add items in Dashboard → Catalog or import from website.',
        'القائمة قيد التحديث — أضف المنتجات من لوحة التحكم.'
      ),
      ctx.businessId,
      ctx.phone
    );
    return;
  }

  await sendWelcomeButtons(ctx, lang);
}
