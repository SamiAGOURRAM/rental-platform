type Locale = 'en' | 'fr' | 'es';

interface VerifyEmailData {
  firstName: string;
  verifyUrl: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Confirm your email · Maison Voyageur',
  fr: 'Confirmez votre email · Maison Voyageur',
  es: 'Confirma tu email · Maison Voyageur',
};

export function renderVerifyEmail(data: VerifyEmailData, locale: Locale) {
  const subject = SUBJECTS[locale];
  const greeting =
    locale === 'fr'
      ? `Bonjour ${data.firstName},`
      : locale === 'es'
        ? `Hola ${data.firstName},`
        : `Hi ${data.firstName},`;
  const body =
    locale === 'fr'
      ? 'Confirmez votre adresse email pour finaliser votre compte Maison Voyageur.'
      : locale === 'es'
        ? 'Confirma tu dirección de correo para completar tu cuenta de Maison Voyageur.'
        : 'Confirm your email address to complete your Maison Voyageur account.';
  const cta =
    locale === 'fr'
      ? 'Confirmer mon email'
      : locale === 'es'
        ? 'Confirmar mi email'
        : 'Confirm my email';
  const expiry =
    locale === 'fr'
      ? 'Ce lien expire dans 24 heures.'
      : locale === 'es'
        ? 'Este enlace expira en 24 horas.'
        : 'This link expires in 24 hours.';

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;background:#FAF7F2;padding:32px 24px;color:#1A1A1A;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
    <h1 style="font-family:Cormorant Garamond,Georgia,serif;font-size:24px;margin:0 0 16px;">${greeting}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4A4A4A;">${body}</p>
    <a href="${data.verifyUrl}" style="display:inline-block;margin:24px 0;background:#1A3C34;color:#FAF7F2;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${cta}</a>
    <p style="font-size:12px;color:#9A9A9A;margin-top:24px;">${expiry}</p>
  </div>
</body></html>`;

  const text = `${greeting}\n\n${body}\n\n${cta}: ${data.verifyUrl}\n\n${expiry}`;
  return { subject, html, text };
}
