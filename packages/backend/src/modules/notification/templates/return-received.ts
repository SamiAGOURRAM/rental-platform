type Locale = 'en' | 'fr' | 'es';

interface ReturnReceivedData {
  orderNumber: string;
  customerName: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'We’ve received your return',
  fr: 'Nous avons bien reçu votre retour',
  es: 'Hemos recibido tu devolución',
};

export function renderReturnReceived(
  data: ReturnReceivedData,
  locale: Locale,
): { subject: string; html: string; text: string } {
  const greeting = {
    en: `Hi ${data.customerName},`,
    fr: `Bonjour ${data.customerName},`,
    es: `Hola ${data.customerName},`,
  }[locale];

  const body = {
    en: `Your return for order ${data.orderNumber} has arrived back with us. We’re inspecting the pieces now and will release your deposit once that’s done — usually within 1–2 business days.`,
    fr: `Votre retour pour la commande ${data.orderNumber} nous est bien parvenu. Nous inspectons les pièces et libérerons votre caution dès que c’est terminé — généralement sous 1 à 2 jours ouvrés.`,
    es: `Tu devolución del pedido ${data.orderNumber} ha llegado. Estamos inspeccionando las piezas y liberaremos tu depósito en cuanto terminemos — normalmente en 1–2 días hábiles.`,
  }[locale];

  const html = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2>${greeting}</h2><p>${body}</p></body></html>`;

  return { subject: SUBJECTS[locale], html, text: `${greeting}\n\n${body}` };
}
