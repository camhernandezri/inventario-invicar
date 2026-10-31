import Link from 'next/link';
import { cn } from '@/lib/util';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent';

const variantes = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'bg-card text-foreground border border-border hover:bg-muted',
  danger: 'bg-card text-destructive border border-destructive-soft hover:bg-destructive-soft',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
};
const tamanos = { md: 'px-3.5 py-2.5', sm: 'px-2.5 py-1.5', icon: 'size-9 sm:size-8' };

type Variante = keyof typeof variantes;
type Tamano = keyof typeof tamanos;

export function botonClases(variante: Variante = 'primary', tamano: Tamano = 'md', extra?: string) {
  return cn(base, variantes[variante], tamanos[tamano], extra);
}

export function Button({
  variant = 'primary', size = 'md', className, type = 'button', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante; size?: Tamano }) {
  return <button type={type} className={botonClases(variant, size, className)} {...props} />;
}

export function LinkButton({
  href, variant = 'primary', size = 'md', className, ...props
}: Omit<React.ComponentProps<typeof Link>, 'className'> & { variant?: Variante; size?: Tamano; className?: string }) {
  return <Link href={href} className={botonClases(variant, size, className)} {...props} />;
}
