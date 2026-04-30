type Locale = 'en' | 'fr' | 'es';

interface OrderShippedData {
  orderNumber: string;
  customerName: string;
  rentalStart: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Your wardrobe is on its way 🚚',
  fr: 'Votre garde-robe est en route 🚚',
  es: 'Tu vestuario está en camino 🚚',
};

export function renderOrderShipped(
  data: OrderShippedData,
  locale: Locale,
): { subject: string; html: string; text: string } {
  const greeting = {
    en: `Hi ${data.customerName},`,
    fr: `Bonjour ${data.customerName},`,
    es: `Hola ${data.customerName},`,
  }[locale];

  const body = {
    en: `Order ${data.orderNumber} has been dispatched and will arrive by ${data.rentalStart}. We can’t wait for you to wear it.`,
    fr: `La commande ${data.orderNumber} a été expédiée et arrivera d’ici le ${data.rentalStart}. Nous avons hâte de vous voir la porter.`,
    es: `El pedido ${data.orderNumber} ha sido enviado y llegará antes del ${data.rentalStart}. Estamos deseando verte llevarlo.`,
  }[locale];

  const html = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2>${greeting}</h2><p>${body}</p></body></html>`;

  return { subject: SUBJECTS[locale], html, text: `${greeting}\n\n${body}` };
}
