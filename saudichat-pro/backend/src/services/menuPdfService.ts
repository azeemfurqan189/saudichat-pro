import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const MENU_DIR = path.join(process.cwd(), 'uploads', 'menus');

export function getPublicBaseUrl(): string {
  if (process.env.PUBLIC_API_URL?.trim()) {
    return process.env.PUBLIC_API_URL.trim().replace(/\/$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`;
  }
  const port = process.env.PORT || '4000';
  return `http://localhost:${port}`;
}

function ensureMenuDir(): void {
  if (!fs.existsSync(MENU_DIR)) {
    fs.mkdirSync(MENU_DIR, { recursive: true });
  }
}

function menuFilePath(businessId: string): string {
  return path.join(MENU_DIR, `${businessId}.pdf`);
}

export function getMenuPdfPublicUrl(businessId: string): string {
  return `${getPublicBaseUrl()}/public/menu/${businessId}.pdf`;
}

export async function generateMenuPdf(businessId: string): Promise<string> {
  ensureMenuDir();

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const items = await prisma.catalogItem.findMany({
    where: { businessId, isAvailable: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    take: 200,
  });

  const outPath = menuFilePath(businessId);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  doc.fontSize(20).text(business?.name || 'Menu', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text('Full menu — reply with item number or tap list in chat to order', { align: 'center' });
  doc.moveDown(1);
  doc.fillColor('#000');

  let lastCategory = '';
  let globalIndex = 1;

  for (const item of items) {
    const cat = item.category?.trim() || 'Menu';
    if (cat !== lastCategory) {
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#111').text(cat.toUpperCase(), { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#000');
      lastCategory = cat;
    }

    const name = item.nameEn || item.nameAr;
    const priceStr =
      item.discountPrice != null && item.discountPrice < item.price
        ? `${item.discountPrice} SAR (was ${item.price})`
        : `${item.price} SAR`;

    doc.text(`${globalIndex}. ${name} — ${priceStr}`);
    if (item.descriptionEn || item.descriptionAr) {
      doc.fontSize(9).fillColor('#555').text((item.descriptionEn || item.descriptionAr || '').slice(0, 120));
      doc.fontSize(11).fillColor('#000');
    }
    globalIndex++;
  }

  if (items.length === 0) {
    doc.text('Menu is empty. Please check back later.');
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  const pdfUrl = getMenuPdfPublicUrl(businessId);
  const prev = (business?.settings as Record<string, unknown>) || {};
  await prisma.business.update({
    where: { id: businessId },
    data: {
      settings: {
        ...prev,
        menuPdfUrl: pdfUrl,
        menuPdfGeneratedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  return pdfUrl;
}

export async function getOrGenerateMenuPdfUrl(businessId: string): Promise<string | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true, updatedAt: true },
  });
  if (!business) return null;

  const settings = (business.settings as Record<string, unknown>) || {};
  const cachedUrl = String(settings.menuPdfUrl || '');
  const generatedAt = settings.menuPdfGeneratedAt ? Date.parse(String(settings.menuPdfGeneratedAt)) : 0;
  const filePath = menuFilePath(businessId);
  const fileExists = fs.existsSync(filePath);
  const stale = !generatedAt || Date.now() - generatedAt > 24 * 60 * 60 * 1000;

  if (fileExists && cachedUrl && !stale) {
    return cachedUrl;
  }

  try {
    return await generateMenuPdf(businessId);
  } catch (err) {
    console.warn('[menuPdf] generate failed:', err instanceof Error ? err.message : err);
    return fileExists ? cachedUrl || getMenuPdfPublicUrl(businessId) : null;
  }
}

export function menuPdfExists(businessId: string): boolean {
  return fs.existsSync(menuFilePath(businessId));
}
