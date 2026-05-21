import type { SVGProps } from 'react';

type IconName =
  | 'home' | 'activity' | 'layers' | 'inbox' | 'cpu' | 'flask'
  | 'building' | 'search' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down'
  | 'check' | 'check-circle' | 'x' | 'x-circle' | 'reload' | 'loader'
  | 'play' | 'pause' | 'plus' | 'minus' | 'chevron-down' | 'chevron-up'
  | 'chevron-right' | 'sparkle' | 'bot' | 'user' | 'shield' | 'lock'
  | 'eye' | 'edit' | 'trash' | 'copy' | 'external' | 'bell' | 'clock'
  | 'fire' | 'target' | 'logo-mark' | 'sliders' | 'download' | 'menu'
  | 'bolt' | 'globe' | 'message' | 'phone' | 'database' | 'queue';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'> {
  name: IconName;
  size?: number;
  stroke?: number;
}

export function Icon({ name, size = 16, stroke = 1.6, ...rest }: Props) {
  const c: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  };

  switch (name) {
    case 'home':         return <svg {...c}><path d="M3 11.5L12 4l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-7h-6v7H4.5A1.5 1.5 0 0 1 3 20z" /></svg>;
    case 'activity':     return <svg {...c}><path d="M3 12h4l3-9 4 18 3-9h4" /></svg>;
    case 'layers':       return <svg {...c}><path d="M12 2l10 5-10 5L2 7l10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
    case 'inbox':        return <svg {...c}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13a2 2 0 0 1 2 1.8L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6L3.5 6.8A2 2 0 0 1 5.5 5z" /></svg>;
    case 'cpu':          return <svg {...c}><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>;
    case 'flask':        return <svg {...c}><path d="M10 2v6L4 19a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 19l-6-11V2M8 2h8" /><path d="M7 14h10" /></svg>;
    case 'building':     return <svg {...c}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" /></svg>;
    case 'search':       return <svg {...c}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case 'arrow-right':  return <svg {...c}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case 'arrow-left':   return <svg {...c}><path d="M19 12H5M11 5l-7 7 7 7" /></svg>;
    case 'arrow-up':     return <svg {...c}><path d="M12 19V5M5 11l7-7 7 7" /></svg>;
    case 'arrow-down':   return <svg {...c}><path d="M12 5v14M5 13l7 7 7-7" /></svg>;
    case 'check':        return <svg {...c}><path d="M5 12.5l4 4L19 7" /></svg>;
    case 'check-circle': return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>;
    case 'x':            return <svg {...c}><path d="M6 6l12 12M6 18L18 6" /></svg>;
    case 'x-circle':     return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M9 15l6-6" /></svg>;
    case 'reload':       return <svg {...c}><path d="M21 12a9 9 0 1 1-3.5-7.1" /><path d="M21 3v6h-6" /></svg>;
    case 'loader':       return <svg {...c}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>;
    case 'play':         return <svg {...c}><path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" /></svg>;
    case 'pause':        return <svg {...c}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
    case 'plus':         return <svg {...c}><path d="M12 5v14M5 12h14" /></svg>;
    case 'minus':        return <svg {...c}><path d="M5 12h14" /></svg>;
    case 'chevron-down': return <svg {...c}><path d="M6 9l6 6 6-6" /></svg>;
    case 'chevron-up':   return <svg {...c}><path d="M6 15l6-6 6 6" /></svg>;
    case 'chevron-right':return <svg {...c}><path d="M9 6l6 6-6 6" /></svg>;
    case 'sparkle':      return <svg {...c}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>;
    case 'bot':          return <svg {...c}><rect x="4" y="7" width="16" height="12" rx="3" /><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" /><path d="M12 3v4" /></svg>;
    case 'user':         return <svg {...c}><circle cx="12" cy="8" r="3.5" /><path d="M5 21c0-3.5 3-6.5 7-6.5s7 3 7 6.5" /></svg>;
    case 'shield':       return <svg {...c}><path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'lock':         return <svg {...c}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case 'eye':          return <svg {...c}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'edit':         return <svg {...c}><path d="M3 21h4l11-11-4-4L3 17v4z" /><path d="M14 6l4 4" /></svg>;
    case 'trash':        return <svg {...c}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" /></svg>;
    case 'copy':         return <svg {...c}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
    case 'external':     return <svg {...c}><path d="M14 4h6v6M20 4l-9 9M11 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" /></svg>;
    case 'bell':         return <svg {...c}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 13 6 8zM10 19a2 2 0 0 0 4 0" /></svg>;
    case 'clock':        return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'fire':         return <svg {...c}><path d="M12 2c0 4-4 5-4 9a4 4 0 1 0 8 0c0-2-1-3-1-5 3 1 5 4 5 8a8 8 0 0 1-16 0c0-5 4-7 4-12 2 0 4 1 4 5z" /></svg>;
    case 'target':       return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>;
    case 'sliders':      return <svg {...c}><path d="M4 6h11M19 6h1M4 12h6M14 12h6M4 18h13M21 18h-1" /><circle cx="17" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="18" r="2" /></svg>;
    case 'download':     return <svg {...c}><path d="M12 4v12M6 12l6 6 6-6M4 20h16" /></svg>;
    case 'menu':         return <svg {...c}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case 'bolt':         return <svg {...c}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>;
    case 'globe':        return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
    case 'message':      return <svg {...c}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" /></svg>;
    case 'phone':        return <svg {...c}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
    case 'database':     return <svg {...c}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" /></svg>;
    case 'queue':        return <svg {...c}><rect x="3" y="6" width="18" height="3" rx="1" /><rect x="3" y="11" width="14" height="3" rx="1" /><rect x="3" y="16" width="10" height="3" rx="1" /></svg>;
    case 'logo-mark':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest as SVGProps<SVGSVGElement>}>
          <path d="M12 2L22 7v10l-10 5L2 17V7l10-5z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
          <path d="M7 9.5l5 2.5 5-2.5M12 12v10" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
        </svg>
      );
    default: return null;
  }
}
