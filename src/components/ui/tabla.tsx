import { cn } from '@/lib/util';

export function Tabla({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ right, className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement> & { right?: boolean }) {
  return (
    <th
      className={cn('h-10 bg-muted px-3 text-xs sm:px-5 font-medium whitespace-nowrap text-muted-foreground', right ? 'text-right' : 'text-left', className)}
      {...p}
    />
  );
}

export function Td({
  right, suave, fuerte, className, ...p
}: React.TdHTMLAttributes<HTMLTableCellElement> & { right?: boolean; suave?: boolean; fuerte?: boolean }) {
  return (
    <td
      className={cn(
        'border-b border-border px-3 py-3 align-middle sm:px-5',
        right && 'text-right tabular-nums',
        suave && 'text-muted-foreground',
        fuerte && 'font-medium',
        className,
      )}
      {...p}
    />
  );
}
