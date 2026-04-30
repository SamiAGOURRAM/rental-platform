interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>
  );
}
