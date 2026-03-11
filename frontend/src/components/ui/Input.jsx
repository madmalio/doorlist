import { cn } from '../../lib/utils';

export function Input({ label, error, className, id, suffix, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100',
            'focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500',
            suffix ? 'pr-10' : '',
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : '',
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
