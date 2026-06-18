export interface CountryCode {
  code: string;
  country: string;
  countryAr: string;
  flag: string;
  placeholder: string;
}

/** GCC first, then MENA, South Asia, then global */
export const COUNTRY_CODES: CountryCode[] = [
  // GCC
  { code: "+966", country: "Saudi Arabia", countryAr: "السعودية", flag: "🇸🇦", placeholder: "501234567" },
  { code: "+971", country: "UAE", countryAr: "الإمارات", flag: "🇦🇪", placeholder: "501234567" },
  { code: "+965", country: "Kuwait", countryAr: "الكويت", flag: "🇰🇼", placeholder: "50123456" },
  { code: "+973", country: "Bahrain", countryAr: "البحرين", flag: "🇧🇭", placeholder: "36123456" },
  { code: "+968", country: "Oman", countryAr: "عُمان", flag: "🇴🇲", placeholder: "92123456" },
  { code: "+974", country: "Qatar", countryAr: "قطر", flag: "🇶🇦", placeholder: "33123456" },
  // MENA
  { code: "+20", country: "Egypt", countryAr: "مصر", flag: "🇪🇬", placeholder: "1012345678" },
  { code: "+962", country: "Jordan", countryAr: "الأردن", flag: "🇯🇴", placeholder: "791234567" },
  { code: "+961", country: "Lebanon", countryAr: "لبنان", flag: "🇱🇧", placeholder: "71123456" },
  { code: "+964", country: "Iraq", countryAr: "العراق", flag: "🇮🇶", placeholder: "7901234567" },
  { code: "+967", country: "Yemen", countryAr: "اليمن", flag: "🇾🇪", placeholder: "712345678" },
  { code: "+963", country: "Syria", countryAr: "سوريا", flag: "🇸🇾", placeholder: "944567890" },
  { code: "+970", country: "Palestine", countryAr: "فلسطين", flag: "🇵🇸", placeholder: "599123456" },
  { code: "+212", country: "Morocco", countryAr: "المغرب", flag: "🇲🇦", placeholder: "612345678" },
  { code: "+213", country: "Algeria", countryAr: "الجزائر", flag: "🇩🇿", placeholder: "551234567" },
  { code: "+216", country: "Tunisia", countryAr: "تونس", flag: "🇹🇳", placeholder: "20123456" },
  { code: "+218", country: "Libya", countryAr: "ليبيا", flag: "🇱🇾", placeholder: "912345678" },
  { code: "+249", country: "Sudan", countryAr: "السودان", flag: "🇸🇩", placeholder: "912345678" },
  { code: "+90", country: "Turkey", countryAr: "تركيا", flag: "🇹🇷", placeholder: "5321234567" },
  { code: "+98", country: "Iran", countryAr: "إيران", flag: "🇮🇷", placeholder: "9123456789" },
  // South Asia
  { code: "+92", country: "Pakistan", countryAr: "باكستان", flag: "🇵🇰", placeholder: "3001234567" },
  { code: "+91", country: "India", countryAr: "الهند", flag: "🇮🇳", placeholder: "9876543210" },
  { code: "+880", country: "Bangladesh", countryAr: "بنغلاديش", flag: "🇧🇩", placeholder: "1712345678" },
  { code: "+94", country: "Sri Lanka", countryAr: "سريلانكا", flag: "🇱🇰", placeholder: "712345678" },
  { code: "+93", country: "Afghanistan", countryAr: "أفغانستان", flag: "🇦🇫", placeholder: "701234567" },
  // Southeast Asia
  { code: "+60", country: "Malaysia", countryAr: "ماليزيا", flag: "🇲🇾", placeholder: "123456789" },
  { code: "+62", country: "Indonesia", countryAr: "إندونيسيا", flag: "🇮🇩", placeholder: "8123456789" },
  { code: "+63", country: "Philippines", countryAr: "الفلبين", flag: "🇵🇭", placeholder: "9123456789" },
  { code: "+65", country: "Singapore", countryAr: "سنغافورة", flag: "🇸🇬", placeholder: "81234567" },
  { code: "+66", country: "Thailand", countryAr: "تايلاند", flag: "🇹🇭", placeholder: "812345678" },
  // Africa
  { code: "+234", country: "Nigeria", countryAr: "نيجيريا", flag: "🇳🇬", placeholder: "8012345678" },
  { code: "+254", country: "Kenya", countryAr: "كينيا", flag: "🇰🇪", placeholder: "712345678" },
  { code: "+27", country: "South Africa", countryAr: "جنوب أفريقيا", flag: "🇿🇦", placeholder: "821234567" },
  // Europe
  { code: "+44", country: "United Kingdom", countryAr: "بريطانيا", flag: "🇬🇧", placeholder: "7911123456" },
  { code: "+49", country: "Germany", countryAr: "ألمانيا", flag: "🇩🇪", placeholder: "15123456789" },
  { code: "+33", country: "France", countryAr: "فرنسا", flag: "🇫🇷", placeholder: "612345678" },
  { code: "+39", country: "Italy", countryAr: "إيطاليا", flag: "🇮🇹", placeholder: "3123456789" },
  { code: "+34", country: "Spain", countryAr: "إسبانيا", flag: "🇪🇸", placeholder: "612345678" },
  { code: "+31", country: "Netherlands", countryAr: "هولندا", flag: "🇳🇱", placeholder: "612345678" },
  { code: "+41", country: "Switzerland", countryAr: "سويسرا", flag: "🇨🇭", placeholder: "791234567" },
  { code: "+46", country: "Sweden", countryAr: "السويد", flag: "🇸🇪", placeholder: "701234567" },
  { code: "+47", country: "Norway", countryAr: "النرويج", flag: "🇳🇴", placeholder: "41234567" },
  { code: "+48", country: "Poland", countryAr: "بولندا", flag: "🇵🇱", placeholder: "512345678" },
  { code: "+7", country: "Russia", countryAr: "روسيا", flag: "🇷🇺", placeholder: "9123456789" },
  // Americas
  { code: "+1", country: "USA / Canada", countryAr: "أمريكا / كندا", flag: "🇺🇸", placeholder: "2025551234" },
  { code: "+52", country: "Mexico", countryAr: "المكسيك", flag: "🇲🇽", placeholder: "5512345678" },
  { code: "+55", country: "Brazil", countryAr: "البرازيل", flag: "🇧🇷", placeholder: "11912345678" },
  { code: "+54", country: "Argentina", countryAr: "الأرجنتين", flag: "🇦🇷", placeholder: "91123456789" },
  // Oceania
  { code: "+61", country: "Australia", countryAr: "أستراليا", flag: "🇦🇺", placeholder: "412345678" },
  { code: "+64", country: "New Zealand", countryAr: "نيوزيلندا", flag: "🇳🇿", placeholder: "211234567" },
  // East Asia
  { code: "+86", country: "China", countryAr: "الصين", flag: "🇨🇳", placeholder: "13123456789" },
  { code: "+81", country: "Japan", countryAr: "اليابان", flag: "🇯🇵", placeholder: "9012345678" },
  { code: "+82", country: "South Korea", countryAr: "كوريا الجنوبية", flag: "🇰🇷", placeholder: "1012345678" },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0];

export function parsePhoneValue(full: string): { countryCode: string; localNumber: string } {
  const trimmed = full.trim();
  if (!trimmed) return { countryCode: DEFAULT_COUNTRY.code, localNumber: "" };

  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (trimmed.startsWith(c.code)) {
      return {
        countryCode: c.code,
        localNumber: trimmed.slice(c.code.length).replace(/\D/g, ""),
      };
    }
  }

  const digits = trimmed.replace(/\D/g, "");
  return { countryCode: DEFAULT_COUNTRY.code, localNumber: digits };
}

export function buildFullPhone(countryCode: string, localNumber: string): string {
  const local = localNumber.replace(/\D/g, "");
  return local ? `${countryCode}${local}` : countryCode;
}

export function isValidInternationalPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && phone.startsWith("+");
}

export function getCountryByCode(code: string): CountryCode {
  return COUNTRY_CODES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}
