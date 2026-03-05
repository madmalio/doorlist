import { Input } from './Input';

export function MeasurementInput({ helperText, ...props }) {
  return (
    <div>
      <Input type="text" inputMode="decimal" {...props} />
      {helperText ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p> : null}
    </div>
  );
}
