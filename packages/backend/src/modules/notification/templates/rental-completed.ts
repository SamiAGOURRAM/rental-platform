type Locale = 'en' | 'fr' | 'es';

interface RentalCompletedData {
  orderNumber: string;
  customerName: string;
  carbonSavedKg?: number;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Thanks for renting with us',
  fr: 'Merci d’avoir loué chez nous',
  es: 'Gracias por alquilar con nosotros',
};

export function renderRentalCompleted(
  data: RentalCompletedData,
  locale: Locale,
): { subject: string; html: string; text: string } {
  const greeting = {
    en: `Hi ${data.customerName},`,
    fr: `Bonjour ${data.customerName},`,
    es: `Hola ${data.customerName},`,
  }[locale];

  const co2 = data.carbonSavedKg && data.carbonSavedKg > 0 ? data.carbonSavedKg.toFixed(1) : null;

  const body = {
    en: `Your rental ${data.orderNumber} is now complete — deposit released in full.${co2 ? ` You saved about ${co2} kg CO₂ by renting instead of buying. Thank you.` : ''}`,
    fr: `Votre location ${data.orderNumber} est terminée — caution restituée intégralement.${co2 ? ` Vous avez économisé environ ${co2} kg de CO₂ en louant plutôt qu’en achetant. Merci.` : ''}`,
    es: `Tu alquiler ${data.orderNumber} está completo — depósito liberado íntegramente.${co2 ? ` Ahorraste unos ${co2} kg de CO₂ alquilando en lugar de comprar. Gracias.` : ''}`,
  }[locale];

  const html = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2>${greeting}</h2><p>${body}</p></body></html>`;

  return { subject: SUBJECTS[locale], html, text: `${greeting}\n\n${body}` };
}
