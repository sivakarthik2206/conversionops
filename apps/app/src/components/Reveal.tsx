'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
  className?: string;
  style?: React.CSSProperties;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function Reveal({
  children,
  delay = 0,
  as: As = 'div',
  className = '',
  style,
  threshold = 0.12,
  rootMargin = '0px 0px -40px 0px',
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  const Component = As as React.ElementType;
  return (
    <Component
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      style={style}
      data-reveal
      data-reveal-delay={delay || undefined}
    >
      {children}
    </Component>
  );
}
