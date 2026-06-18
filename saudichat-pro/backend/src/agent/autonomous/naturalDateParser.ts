export interface ParsedDateTime {
  date: string;
  time?: string;
  confidence: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseTime(text: string): string | undefined {
  const lower = text.toLowerCase();
  const h24 = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (h24) {
    const h = Math.min(23, parseInt(h24[1], 10));
    return `${pad(h)}:${h24[2]}`;
  }

  const baje = lower.match(/\b(\d{1,2})\s*(?:baje|bajay|bje|بج|باج|ساعة|ساعه)\b/i);
  if (baje) {
    let h = parseInt(baje[1], 10);
    if (h >= 1 && h <= 11 && /\b(pm|shaam|شام|مساء|م|evening)\b/i.test(lower)) h += 12;
    if (h === 12 && /\b(am|subah|صباح|ص)\b/i.test(lower)) h = 12;
    if (h >= 1 && h <= 12 && !/\b(am|pm|subah|shaam|ص|م)\b/i.test(lower) && h <= 7) {
      // assume PM for business hours 1-7 without marker
      if (h < 8) h += 12;
    }
    return `${pad(Math.min(23, h))}:00`;
  }

  const ampm = lower.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    if (ampm[2].toLowerCase() === 'pm' && h < 12) h += 12;
    if (ampm[2].toLowerCase() === 'am' && h === 12) h = 0;
    return `${pad(h)}:00`;
  }

  return undefined;
}

export function parseNaturalDateTime(text: string, now = new Date()): ParsedDateTime | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  const time = parseTime(lower);
  let target = new Date(now);
  let confidence = 0.5;

  if (/\b(kal|tomorrow|غدا|غداً|بكرة|bakra|next day)\b/i.test(lower)) {
    target.setDate(target.getDate() + 1);
    confidence = 0.85;
  } else if (/\b(parson|day after|بعد\s*غد|after tomorrow)\b/i.test(lower)) {
    target.setDate(target.getDate() + 2);
    confidence = 0.8;
  } else if (/\b(aaj|today|اليوم|al\s*yom)\b/i.test(lower)) {
    confidence = 0.75;
  } else {
    const iso = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso) {
      target = new Date(`${iso[1]}T12:00:00`);
      confidence = 0.95;
    } else {
      const dmy = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
      if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = dmy[3] ? parseInt(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3], 10) : now.getFullYear();
        target = new Date(year, month, day);
        confidence = 0.9;
      }
    }
  }

  const bookingWords = /\b(appointment|book|booking|موعد|حجز|slot|available|maujood|mojood)\b/i;
  const hasDateHint = confidence >= 0.75 || time || bookingWords.test(lower);
  if (!hasDateHint) return null;

  if (time) confidence = Math.min(0.98, confidence + 0.1);

  return { date: toIsoDate(target), time, confidence };
}

export function isNaturalBookingRequest(text: string): boolean {
  const lower = text.toLowerCase();
  if (parseNaturalDateTime(text)) return true;
  return /\b(appointment|book|booking|موعد|حجز|slot|available|maujood|mojood|kal|tomorrow|aaj)\b/i.test(lower);
}
