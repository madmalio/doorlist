import { cn } from '../../lib/utils';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-100 dark:focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'border-blue-500/80 bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400',
    secondary: 'border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    danger: 'border-rose-500/80 bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-400',
    ghost: 'border-transparent bg-transparent text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 focus:ring-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
