import type { SVGProps } from 'react';

type IconName =
  | 'bolt' | 'clock' | 'moon' | 'phone-off' | 'runner' | 'cash'
  | 'cpu' | 'target' | 'calendar' | 'sync' | 'message' | 'chart'
  | 'lock' | 'home' | 'shield' | 'check' | 'check-circle'
  | 'arrow-right' | 'arrow-down' | 'sparkle' | 'fire' | 'phone'
  | 'mail' | 'plus' | 'minus' | 'star' | 'play' | 'reload'
  | 'zap' | 'eye' | 'mic' | 'globe' | 'logo-mark';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'> {
  name: IconName;
  size?: number;
  stroke?: number;
}

export function Icon({ name, size = 20, stroke = 1.6, ...rest }: Props) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };

  switch (name) {
    case 'bolt':
      return <svg {...common}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'moon':
      return <svg {...common}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
    case 'phone-off':
      return <svg {...common}><path d="M10.7 13.3a14 14 0 0 1-3-3M2 2l20 20M5.5 15.5l1.4-1.4a2 2 0 0 1 2.3-.4l1.6.8a2 2 0 0 0 2.3-.4l3.4-3.4M15 4.1l1.5-.4a2 2 0 0 1 2.5 1.5l.4 1.6" /></svg>;
    case 'runner':
      return <svg {...common}><circle cx="13" cy="4" r="2" /><path d="M5 22l3-7 4-1-3-3 4-3 3 3h3M11 13l-2 4" /></svg>;
    case 'cash':
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>;
    case 'cpu':
      return <svg {...common}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>;
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /><circle cx="12" cy="14" r="1.2" fill="currentColor" /></svg>;
    case 'sync':
      return <svg {...common}><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 12a9 9 0 0 1 15.4-6.4L21 8" /><path d="M21 3v5h-5M3 21v-5h5" /></svg>;
    case 'message':
      return <svg {...common}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" /></svg>;
    case 'chart':
      return <svg {...common}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-7" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case 'home':
      return <svg {...common}><path d="M3 11.5L12 4l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-7h-6v7H4.5A1.5 1.5 0 0 1 3 20z" /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'check':
      return <svg {...common}><path d="M5 12.5L10 17.5L19 7.5" /></svg>;
    case 'check-circle':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>;
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case 'arrow-down':
      return <svg {...common}><path d="M12 5v14M5 13l7 7 7-7" /></svg>;
    case 'sparkle':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>;
    case 'fire':
      return <svg {...common}><path d="M12 2c0 4-4 5-4 9a4 4 0 1 0 8 0c0-2-1-3-1-5 3 1 5 4 5 8a8 8 0 0 1-16 0c0-5 4-7 4-12 2 0 4 1 4 5z" /></svg>;
    case 'phone':
      return <svg {...common}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
    case 'mail':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'minus':
      return <svg {...common}><path d="M5 12h14" /></svg>;
    case 'star':
      return <svg {...common}><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z" /></svg>;
    case 'play':
      return <svg {...common}><path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" /></svg>;
    case 'reload':
      return <svg {...common}><path d="M21 12a9 9 0 1 1-3.5-7.1" /><path d="M21 3v6h-6" /></svg>;
    case 'zap':
      return <svg {...common}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" stroke="none" /></svg>;
    case 'eye':
      return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'mic':
      return <svg {...common}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case 'globe':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
    case 'logo-mark':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest as SVGProps<SVGSVGElement>}>
          <path d="M12 2L22 7v10l-10 5L2 17V7l10-5z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
          <path d="M7 9.5l5 2.5 5-2.5M12 12v10" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
