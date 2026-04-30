import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) =>
    sonnerToast.success(message, {
      style: {
        background: 'var(--color-linen)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-sand)',
      },
    }),
  error: (message: string) =>
    sonnerToast.error(message, {
      style: {
        background: 'var(--color-linen)',
        color: 'var(--color-error)',
        border: '1px solid var(--color-sand)',
      },
    }),
  info: (message: string) =>
    sonnerToast.info(message, {
      style: {
        background: 'var(--color-linen)',
        color: 'var(--color-charcoal)',
        border: '1px solid var(--color-sand)',
      },
    }),
};
