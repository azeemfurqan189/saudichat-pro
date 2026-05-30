type Intent = 'ORDER' | 'BOOKING' | 'INQUIRY' | 'COMPLAINT' | 'URGENT' | 'FAQ';
type Sentiment = 'HAPPY' | 'ANGRY' | 'URGENT' | 'CONFUSED' | 'NEUTRAL';

const ORDER_KEYWORDS = ['طلب', 'اطلب', 'أريد', 'menu', 'order', 'قائمة', 'وجبة', 'اكل'];
const BOOKING_KEYWORDS = ['حجز', 'موعد', 'appointment', 'book', 'booking', 'schedule'];
const COMPLAINT_KEYWORDS = ['شكوى', 'complaint', 'مشكلة', 'problem', 'غاضب', 'سيء'];
const FAQ_KEYWORDS = ['ساعات', 'موقع', 'عنوان', 'hours', 'location', 'address', 'price', 'سعر'];

export async function detectIntent(text: string): Promise<Intent> {
  const lower = text.toLowerCase();

  if (ORDER_KEYWORDS.some((k) => lower.includes(k))) return 'ORDER';
  if (BOOKING_KEYWORDS.some((k) => lower.includes(k))) return 'BOOKING';
  if (COMPLAINT_KEYWORDS.some((k) => lower.includes(k))) return 'COMPLAINT';
  if (FAQ_KEYWORDS.some((k) => lower.includes(k))) return 'FAQ';

  // Try OpenAI if available
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Classify user intent as one of: ORDER, BOOKING, INQUIRY, COMPLAINT, URGENT, FAQ. Reply with only the intent word.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 10,
      });
      const intent = response.choices[0]?.message?.content?.trim().toUpperCase();
      if (intent && ['ORDER', 'BOOKING', 'INQUIRY', 'COMPLAINT', 'URGENT', 'FAQ'].includes(intent)) {
        return intent as Intent;
      }
    } catch {
      // Fallback to keyword matching
    }
  }

  return 'INQUIRY';
}

export async function detectSentiment(text: string): Promise<Sentiment> {
  const lower = text.toLowerCase();
  if (['urgent', 'عاجل', 'فوري', '!!!'].some((k) => lower.includes(k))) return 'URGENT';
  if (['angry', 'غاضب', 'سيء', 'bad', 'terrible'].some((k) => lower.includes(k))) return 'ANGRY';
  if (['confused', 'ما فهمت', '؟؟', 'help'].some((k) => lower.includes(k))) return 'CONFUSED';
  if (['thanks', 'شكر', 'ممتاز', 'great'].some((k) => lower.includes(k))) return 'HAPPY';
  return 'NEUTRAL';
}

export async function generateAIResponse(
  text: string,
  context: string[],
  businessId: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return 'شكراً لتواصلك معنا! كيف يمكنني مساعدتك اليوم؟\nThank you for contacting us! How can I help you today?';
  }

  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful WhatsApp assistant for a Saudi business (ID: ${businessId}). 
          Respond in the same language as the user (Arabic or English). 
          Be polite, professional, and concise. Use Saudi-friendly tone.`,
        },
        ...context.slice(-5).map((c) => ({ role: 'user' as const, content: c })),
        { role: 'user', content: text },
      ],
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'كيف يمكنني مساعدتك؟';
  } catch {
    return 'عذراً، حدث خطأ. سيتواصل معك أحد موظفينا قريباً.\nSorry, an error occurred. An agent will contact you soon.';
  }
}
