'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]
    text-[var(--background)] font-bold
    shadow-[0_0_20px_var(--accent-glow)]
    hover:shadow-[0_0_40px_var(--accent-glow)]
    hover:-translate-y-0.5
    active:translate-y-0
  `,
  secondary: `
    bg-transparent border border-[var(--accent-primary)]
    text-[var(--accent-primary)]
    hover:bg-[rgba(0,255,136,0.1)]
    hover:shadow-[0_0_20px_var(--accent-glow)]
  `,
  ghost: `
    bg-transparent border border-[var(--border)]
    text-[var(--text-secondary)]
    hover:text-[var(--text-primary)]
    hover:border-[var(--border-hover)]
    hover:bg-[var(--card)]
  `,
  danger: `
    bg-gradient-to-r from-[var(--error)] to-red-600
    text-white font-bold
    shadow-[0_0_20px_rgba(255,68,68,0.3)]
    hover:shadow-[0_0_40px_rgba(255,68,68,0.4)]
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-8 py-3.5 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        className={`
          inline-flex items-center justify-center
          font-[var(--font-display)] font-semibold
          uppercase tracking-wider
          rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
