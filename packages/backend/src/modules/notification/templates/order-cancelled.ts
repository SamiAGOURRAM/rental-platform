type Locale = 'en' | 'fr' | 'es';

interface OrderCancelledData {
  orderNumber: string;
  customerName: string;
  refundAmount?: number;
  currency?: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Your order has been cancelled',
  fr: 'Votre commande a été annulée',
  es: 'Tu pedido ha sido cancelado',
};

export function renderOrderCancelled(
  data: OrderCancelledData,
  locale: Locale,
): { subject: string; html: string; text: string } {
  const greeting = {
    en: `Hi ${data.customerName},`,
    fr: `Bonjour ${data.customerName},`,
    es: `Hola ${data.customerName},`,
  }[locale];

  const hasRefund = typeof data.refundAmount === 'number' && data.refundAmount > 0;
  const amountStr = hasRefund
    ? `${data.refundAmount!.toFixed(2)} ${(data.currency ?? 'EUR').toUpperCase()}`
    : '';

  const body = {
    en: `Your order ${data.orderNumber} has been cancelled.${hasRefund ? ` A refund of ${amountStr} will appear on your statement within 5–10 business days.` : ''}`,
    fr: `Votre commande ${data.orderNumber} a été annulée.${hasRefund ? ` Un remboursement de ${amountStr} apparaîtra sur votre relevé sous 5 à 10 jours ouvrés.` : ''}`,
    es: `Tu pedido ${data.orderNumber} ha sido cancelado.${hasRefund ? ` Un reembolso de ${amountStr} aparecerá en tu estado de cuenta en 5–10 días hábiles.` : ''}`,
  }[locale];

  const html = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2>${greeting}</h2><p>${body}</p></body></html>`;

  return { subject: SUBJECTS[locale], html, text: `${greeting}\n\n${body}` };
}
