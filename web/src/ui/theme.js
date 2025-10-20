// Minimalism theme tokens and helpers
export const tokens = {
  radius: {
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px'
  },
  motion: {
    fast: '150ms',
    normal: '200ms'
  }
};

export const classes = {
  // panels/cards with minimalist outline
  card:
    'bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl shadow-sm transition-all duration-200',
  // typography
  heading:
    'text-black dark:text-white font-semibold',
  body: 'text-neutral-800 dark:text-neutral-200',
  muted: 'text-neutral-500 dark:text-neutral-400',
  // buttons
  btn:
    'inline-flex items-center justify-center rounded-2xl px-3.5 py-2 text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30',
  btnSolid:
    'bg-black text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200',
  btnOutline:
    'border border-black/15 text-black hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5',
  btnGhost:
    'text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5'
};

export function cn(...arr) {
  return arr.filter(Boolean).join(' ');
}
