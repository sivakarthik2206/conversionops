'use client';
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Loader2, type LucideProps } from 'lucide-react';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/* --- Button ------------------------------------------------ */
const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:     'bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]',
        secondary:   'border border-[var(--border-light)] bg-transparent text-[var(--text)] hover:bg-[var(--bg-3)]',
        ghost:       'bg-transparent text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-3)]',
        destructive: 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red-dim)] hover:bg-[rgba(255,71,71,0.2)]',
      },
      size: {
        sm: 'h-7 px-3 text-xs rounded-md gap-1.5',
        md: 'h-9 px-4 text-sm rounded-lg gap-2',
        lg: 'h-11 px-6 text-base rounded-xl gap-2.5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type SafeButtonMotionProps = Omit<HTMLMotionProps<'button'>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop' | 'onAnimationStart'>;

export interface ButtonProps extends Omit<SafeButtonMotionProps, 'children'>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...rest }, ref) => {
    const { onDrag: _d, onDragStart: _ds, onDragEnd: _de, ...props } = rest as Record<string, unknown>;
    void _d; void _ds; void _de;
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" size={14} /> : children}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';

/* --- Input ------------------------------------------------- */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref} id={inputId}
          className={cn(
            'w-full h-9 px-3 text-sm rounded-lg bg-[var(--bg-3)] border transition-colors',
            'placeholder:text-[var(--text-3)] text-[var(--text)] focus:outline-none focus:ring-1',
            error
              ? 'border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-dim)]'
              : 'border-[var(--border)] focus:border-[var(--border-focus)] focus:ring-[var(--accent-dim)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[11px]" style={{ color: 'var(--red)' }}>{error}</p>}
        {hint && !error && <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* --- Badge ------------------------------------------------- */
const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium rounded-[4px] uppercase tracking-wide',
  {
    variants: {
      variant: {
        success:     'bg-[var(--green-dim)] text-[var(--green)]',
        warning:     'bg-[var(--amber-dim)] text-[var(--amber)]',
        error:       'bg-[var(--red-dim)] text-[var(--red)]',
        info:        'bg-[var(--blue-dim)] text-[var(--blue)]',
        ai:          'bg-[var(--purple-dim)] text-[var(--purple)]',
        neutral:     'bg-[var(--bg-3)] text-[var(--text-2)]',
        accent:      'bg-[var(--accent-dim)] text-[var(--accent)]',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2 py-1 text-[11px]',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/* --- Card -------------------------------------------------- */
type SafeDivMotionProps = Omit<HTMLMotionProps<'div'>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop' | 'onAnimationStart'>;

export interface CardProps extends SafeDivMotionProps {
  children?: ReactNode;
  hover?: boolean;
  interactive?: boolean;
  padding?: string;
}

export function Card({ className, hover, interactive, padding = 'p-6', children, ...props }: CardProps) {
  const base = cn('rounded-[10px] border bg-[var(--bg-2)] border-[var(--border)]', interactive && 'cursor-pointer', padding, className);
  if (hover || interactive) {
    return (
      <motion.div className={base} whileHover={{ y: -2, boxShadow: 'var(--shadow-accent)' }} transition={{ duration: 0.15 }} {...props}>
        {children}
      </motion.div>
    );
  }
  return <div className={base} {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
}

/* --- Skeleton ---------------------------------------------- */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = 'text', width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[var(--bg-3)]',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:animate-shimmer',
        variant === 'text' && 'h-3.5 rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'rect' && 'rounded-lg',
        className,
      )}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

/* --- Avatar ------------------------------------------------ */
const avatarSizes = { sm: 24, md: 32, lg: 40 } as const;
const avatarTextSizes = { sm: '10px', md: '12px', lg: '14px' } as const;

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof avatarSizes;
  online?: boolean;
  className?: string;
}

export function Avatar({ name, src, size = 'md', online, className }: AvatarProps) {
  const px = avatarSizes[size];
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() : '?';
  return (
    <div className={cn('relative inline-flex shrink-0', className)} style={{ width: px, height: px }}>
      {src ? (
        <img src={src} alt={name ?? 'Avatar'} className="rounded-full object-cover w-full h-full" />
      ) : (
        <div className="rounded-full flex items-center justify-center font-medium bg-[var(--accent-dim)]"
          style={{ width: px, height: px, fontSize: avatarTextSizes[size], color: 'var(--accent)' }}>
          {initials}
        </div>
      )}
      {online && <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg-2)]" style={{ width: 8, height: 8, background: 'var(--green)' }} />}
    </div>
  );
}

/* --- Spinner ----------------------------------------------- */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} style={{ color: 'var(--accent)' }} />;
}

/* --- Tooltip ----------------------------------------------- */
export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-xs pointer-events-none z-50"
            style={{ background: 'var(--bg-4)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Modal ------------------------------------------------- */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = '480px' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof window === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
          <div className="absolute inset-0 backdrop-blur-xl bg-black/60" />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[12px] w-full p-6 z-10"
            style={{ maxWidth, background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}>
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
                <button onClick={onClose} className="rounded-md p-1 hover:bg-[var(--bg-3)]" style={{ color: 'var(--text-3)' }}><X size={16} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* --- Toast ------------------------------------------------- */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export interface ToastItem { id: string; message: string; variant: ToastVariant; }

type LucideIconComponent = React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;

const toastIcons: Record<ToastVariant, LucideIconComponent> = {
  success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info,
};
const toastColors: Record<ToastVariant, string> = {
  success: 'var(--green)', error: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)',
};

function SingleToast({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const Icon = toastIcons[item.variant];
  const color = toastColors[item.variant];
  useEffect(() => {
    const total = 4000; const interval = 50; const step = (interval / total) * 100;
    const timer = setInterval(() => {
      setProgress(p => { if (p <= 0) { clearInterval(timer); onRemove(item.id); return 0; } return p - step; });
    }, interval);
    return () => clearInterval(timer);
  }, [item.id, onRemove]);
  return (
    <motion.div layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[10px] p-3 pr-8 min-w-[280px] max-w-[380px]"
      style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-start gap-3">
        <Icon size={16} style={{ color, flexShrink: 0 } as React.CSSProperties} />
        <p className="text-sm" style={{ color: 'var(--text)' }}>{item.message}</p>
      </div>
      <button onClick={() => onRemove(item.id)} className="absolute top-2 right-2 rounded p-0.5 hover:bg-[var(--bg-4)]" style={{ color: 'var(--text-3)' }}><X size={12} /></button>
      <div className="absolute bottom-0 left-0 h-0.5" style={{ width: `${progress}%`, background: color, transition: 'width 50ms linear' }} />
    </motion.div>
  );
}

type ToastContextType = { addToast: (message: string, variant?: ToastVariant) => void };
export const ToastContext = createContext<ToastContextType>({ addToast: () => undefined });
export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2 items-end">
          <AnimatePresence mode="popLayout">
            {toasts.map(t => <SingleToast key={t.id} item={t} onRemove={removeToast} />)}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function Toaster() { return null; }

