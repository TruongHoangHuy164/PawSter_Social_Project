import React from 'react';
import { cn } from '../theme.js';

export default function Card({ className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={cn('bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl shadow-sm', className)}
      {...props}
    />
  );
}
