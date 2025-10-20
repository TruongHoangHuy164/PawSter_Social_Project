import React from 'react';
import { cn } from '../theme.js';

export default function Button({
  children,
  variant = 'solid', // solid | outline | ghost
  size = 'md', // sm | md
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-2xl font-medium transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30';
  const variants = {
    solid: 'bg-black text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200',
    outline: 'border border-black/15 text-black hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5',
    ghost: 'text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm'
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
