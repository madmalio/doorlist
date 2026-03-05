import { cn } from '../../lib/utils';

export function Card({ children, className }) {
  return <div className={cn('rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900', className)}>{children}</div>;
}

export function CardHeader({ children, className }) {
  return <div className={cn('border-b border-zinc-200 px-4 py-3 dark:border-zinc-700', className)}>{children}</div>;
}

export function CardContent({ children, className }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }) {
  return <div className={cn('border-t border-zinc-200 px-4 py-3 dark:border-zinc-700', className)}>{children}</div>;
}
