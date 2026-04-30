type Locale = 'en' | 'fr' | 'es';

interface ReturnReminderData {
  orderNumber: string;
  customerName: string;
  rentalEnd: string;
  deliveryMethod: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Time to return your rental 📦',
  fr: 'Il est temps de retourner votre location 📦',
  es: 'Es hora de devolver tu alquiler 📦',
};

export function renderReturnReminder(
  data: ReturnReminderData,
  locale: Locale,
): { subject: string; html: string; text: string } {
  const subject = SUBJECTS[locale];

  const greeting = {
    en: `Hi ${data.customerName},`,
    fr: `Bonjour ${data.customerName},`,
    es: `Hola ${data.customerName},`,
  }[locale];

  const body = {
    en: `Your rental period for order ${data.orderNumber} ends on ${data.rentalEnd}. Please arrange your return.`,
    fr: `Votre période de location pour la commande ${data.orderNumber} se termine le ${data.rentalEnd}. Veuillez organiser votre retour.`,
    es: `Tu período de alquiler para el pedido ${data.orderNumber} termina el ${data.rentalEnd}. Por favor organiza tu devolución.`,
  }[locale];

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2>${greeting}</h2>
  <p>${body}</p>
</body>
</html>`;

  return { subject, html, text: `${greeting}\n\n${body}` };
}
