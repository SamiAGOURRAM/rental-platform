import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'premium';
type Size = 'sm' | 'default' | 'lg';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: never;
  };

type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover focus-visible:ring-[3px] focus-visible:ring-brand/30',
  secondary: 'bg-linen text-ink hover:bg-sand focus-visible:ring-[3px] focus-visible:ring-brand/30',
  outline:
    'bg-transparent text-ink border-[1.5px] border-sand hover:bg-pearl hover:border-ash focus-visible:ring-[3px] focus-visible:ring-brand/30',
  ghost:
    'bg-transparent text-brand hover:bg-brand/[0.06] focus-visible:ring-[3px] focus-visible:ring-brand/30',
  premium:
    'bg-brand text-accent hover:bg-brand-hover focus-visible:ring-[3px] focus-visible:ring-accent/30',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-4 py-2 text-[13px] min-h-9',
  default: 'px-6 py-3 text-[15px] min-h-11',
  lg: 'px-8 py-4 text-base min-h-[52px]',
};

export function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center font-sans font-medium tracking-[0.2px] rounded-default',
    'transition-all duration-200 ease-out cursor-pointer',
    'active:scale-[0.98]',
    'outline-none',
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].join(' ');

  if ('href' in props && props.href) {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
}
