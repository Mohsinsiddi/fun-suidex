'use client';

import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: `
    bg-[var(--success-bg)] 
    text-[var(--success)] 
    border-[var(--success)]
  `,
  warning: `
    bg-[var(--warning-bg)] 
    text-[var(--warning)] 
    border-[var(--warning)]
  `,
  error: `
    bg-[var(--error-bg)] 
    text-[var(--error)] 
    border-[var(--error)]
  `,
  info: `
    bg-[var(--info-bg)] 
    text-[var(--info)] 
    border-[var(--info)]
  `,
  neutral: `
    bg-[var(--card)] 
    text-[var(--text-secondary)] 
    border-[var(--border)]
  `,
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  error: 'bg-[var(--error)]',
  info: 'bg-[var(--info)]',
  neutral: 'bg-[var(--text-muted)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', dot = false, className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1.5
          px-2.5 py-1
          text-xs font-semibold uppercase tracking-wider
          rounded-full border
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
