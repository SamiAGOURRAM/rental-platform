type Locale = 'en' | 'fr' | 'es';

interface MagicLinkData {
  firstName: string;
  magicUrl: string;
}

const SUBJECTS: Record<Locale, string> = {
  en: 'Sign in to Maison Voyageur · Magic link',
  fr: 'Connexion à Maison Voyageur · Lien magique',
  es: 'Iniciar sesión en Maison Voyageur · Enlace mágico',
};

export function renderMagicLink(data: MagicLinkData, locale: Locale) {
  const subject = SUBJECTS[locale];
  const greeting =
    locale === 'fr'
      ? `Bonjour ${data.firstName},`
      : locale === 'es'
        ? `Hola ${data.firstName},`
        : `Hi ${data.firstName},`;
  const body =
    locale === 'fr'
      ? 'Cliquez ci-dessous pour vous connecter à votre compte Maison Voyageur. Aucun mot de passe requis.'
      : locale === 'es'
        ? 'Haz clic a continuación para iniciar sesión en tu cuenta de Maison Voyageur. No se necesita contraseña.'
        : 'Click below to sign in to your Maison Voyageur account. No password required.';
  const cta = locale === 'fr' ? 'Se connecter' : locale === 'es' ? 'Iniciar sesión' : 'Sign in';
  const ignore =
    locale === 'fr'
      ? "Si vous n'avez pas fait cette demande, ignorez ce message en toute sécurité."
      : locale === 'es'
        ? 'Si no solicitaste esto, ignora este mensaje de forma segura.'
        : "If you didn't request this, safely ignore this message.";
  const expiry =
    locale === 'fr'
      ? 'Ce lien expire dans 15 minutes.'
      : locale === 'es'
        ? 'Este enlace expira en 15 minutos.'
        : 'This link expires in 15 minutes.';

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;background:#FAF7F2;padding:32px 24px;color:#1A1A1A;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
    <h1 style="font-family:Cormorant Garamond,Georgia,serif;font-size:24px;margin:0 0 16px;">${greeting}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4A4A4A;">${body}</p>
    <a href="${data.magicUrl}" style="display:inline-block;margin:24px 0;background:#1A3C34;color:#FAF7F2;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">${cta}</a>
    <p style="font-size:13px;color:#4A4A4A;">${ignore}</p>
    <p style="font-size:12px;color:#9A9A9A;margin-top:24px;">${expiry}</p>
  </div>
</body></html>`;

  const text = `${greeting}\n\n${body}\n\n${cta}: ${data.magicUrl}\n\n${ignore}\n\n${expiry}`;
  return { subject, html, text };
}
