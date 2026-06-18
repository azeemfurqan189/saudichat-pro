import prisma from '../../utils/prisma';

export async function validatePricesInResponse(text: string, businessId: string): Promise<string> {
  const priceMatches = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:SAR|riyal|ريال)/gi);
  if (!priceMatches) return text;

  const items = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    select: { price: true, discountPrice: true },
  });
  const validPrices = new Set(
    items.flatMap((i) => [i.price, i.discountPrice].filter((p): p is number => p != null).map(String))
  );

  let result = text;
  for (const match of priceMatches) {
    const num = match.match(/(\d+(?:\.\d{1,2})?)/)?.[1];
    if (num && validPrices.size > 0 && !validPrices.has(num) && !validPrices.has(parseFloat(num).toFixed(2))) {
      result = result.replace(match, '[price — see menu]');
    }
  }
  return result;
}

export async function verifyCatalogMentions(text: string, businessId: string): Promise<string> {
  const itemNames = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    select: { nameAr: true, nameEn: true },
    take: 50,
  });

  let result = text;
  for (const item of itemNames) {
    for (const name of [item.nameAr, item.nameEn]) {
      if (!name || name.length < 4) continue;
      const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (re.test(result)) {
        const exists = itemNames.some(
          (i) => i.nameAr.toLowerCase() === name.toLowerCase() || i.nameEn?.toLowerCase() === name.toLowerCase()
        );
        if (!exists) {
          result = result.replace(re, '[item — see menu]');
        }
      }
    }
  }
  return result;
}
