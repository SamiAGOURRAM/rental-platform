type Locale = 'en' | 'fr' | 'es';

interface OrderConfirmedData {
  orderNumber: string;
  customerName: string;
  rentalStart: string;
  rentalEnd: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  deliveryMethod: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Your rental order is confirmed 🌿',
  fr: 'Votre location est confirmée 🌿',
  es: '¡Tu alquiler está confirmado! 🌿',
};

const HEADINGS: Record<Locale, (data: OrderConfirmedData) => string> = {
  en: (d) => `Hi ${d.customerName}, your order ${d.orderNumber} is confirmed!`,
  fr: (d) => `Bonjour ${d.customerName}, votre commande ${d.orderNumber} est confirmée !`,
  es: (d) => `Hola ${d.customerName}, ¡tu pedido ${d.orderNumber} está confirmado!`,
};

export function renderOrderConfirmed(
  data: OrderConfirmedData,
  locale: Locale,
): { subject: string; html: string; text: string } {
  const subject = SUBJECTS[locale];
  const heading = HEADINGS[locale](data);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a;">${heading}</h2>
  <p style="color: #555;">
    ${
      locale === 'fr'
        ? 'Vos vêtements vous attendront à votre arrivée. Voyagez léger !'
        : locale === 'es'
          ? '¡Tu ropa te estará esperando cuando llegues. Viaja ligero!'
          : 'Your clothes will be waiting for you when you arrive. Travel light!'
    }
  </p>
  <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">
        ${locale === 'fr' ? 'Commande' : locale === 'es' ? 'Pedido' : 'Order'}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${data.orderNumber}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">
        ${locale === 'fr' ? 'Période' : locale === 'es' ? 'Período' : 'Period'}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.rentalStart} → ${data.rentalEnd}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #888;">
        ${locale === 'fr' ? 'Articles' : locale === 'es' ? 'Artículos' : 'Items'}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.itemCount}</td>
    </tr>
    <tr>
      <td style="padding: 8px; color: #888;">
        ${locale === 'fr' ? 'Total' : 'Total'}
      </td>
      <td style="padding: 8px; font-weight: bold;">${data.totalAmount} ${data.currency.toUpperCase()}</td>
    </tr>
  </table>
  <p style="margin-top: 32px; font-size: 12px; color: #aaa;">
    © ${new Date().getFullYear()} Rental Platform
  </p>
</body>
</html>`;

  const text = `${heading}\n\nOrder: ${data.orderNumber}\nPeriod: ${data.rentalStart} → ${data.rentalEnd}\nItems: ${data.itemCount}\nTotal: ${data.totalAmount} ${data.currency.toUpperCase()}`;

  return { subject, html, text };
}
