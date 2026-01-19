'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'glass';
  hover?: boolean;
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hover = false, glow = false, className = '', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-[var(--card)] border-[var(--border)]',
      elevated: 'bg-[var(--card-elevated)] border-[var(--border-hover)]',
      glass: 'bg-[rgba(10,26,10,0.8)] backdrop-blur-xl border-[var(--border)]',
    };

    return (
      <motion.div
        ref={ref}
        className={`
          rounded-xl border
          transition-all duration-300
          ${variantStyles[variant]}
          ${hover ? 'hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)]' : ''}
          ${glow ? 'hover:shadow-[0_0_30px_var(--accent-glow)]' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`p-6 border-b border-[var(--border)] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`p-6 border-t border-[var(--border)] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

export default Card;
