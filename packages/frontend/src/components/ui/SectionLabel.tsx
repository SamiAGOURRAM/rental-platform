interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export function SectionLabel({ children, className = '', dark = false }: SectionLabelProps) {
  return (
    <span
      className={`inline-block font-sans text-[11px] font-semibold uppercase tracking-[1.5px] ${
        dark ? 'text-ash' : 'text-stone'
      } ${className}`}
    >
      {children}
    </span>
  );
}
