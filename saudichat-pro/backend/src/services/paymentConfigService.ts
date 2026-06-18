import prisma from '../utils/prisma';

export type PaymentMethodKey = 'cod' | 'transfer' | 'online';

export interface PaymentSettings {
  enabledMethods: PaymentMethodKey[];
  deliveryFee: number;
  vatEnabled: boolean;
  vatRate: number;
}

const COD_ONLY: PaymentMethodKey[] = ['cod'];

export async function getPaymentSettings(businessId: string): Promise<PaymentSettings> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = (business?.settings as Record<string, unknown>) || {};
  const payment = (settings.payment as Record<string, unknown>) || {};

  const deliveryFee =
    typeof settings.deliveryFee === 'number'
      ? settings.deliveryFee
      : typeof payment.deliveryFee === 'number'
        ? (payment.deliveryFee as number)
        : 0;

  const vatEnabled = payment.vatEnabled !== false;
  const vatRate = typeof payment.vatRate === 'number' ? payment.vatRate : 0.15;

  return { enabledMethods: COD_ONLY, deliveryFee, vatEnabled, vatRate };
}

export function paymentMethodLabel(key: PaymentMethodKey): string {
  const labels: Record<PaymentMethodKey, string> = {
    cod: 'Cash on Delivery',
    transfer: 'Bank Transfer',
    online: 'Card / Mada',
  };
  return labels[key];
}
