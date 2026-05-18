# ConversionOps — Frontend Design System
# docs/claude/FRONTEND.md

## DESIGN PHILOSOPHY
Premium. Operational. Calming. Trustworthy. Fast.
References: Linear.app quality + Stripe Dashboard polish + Apple HIG simplicity.

NOT: AI chatbot aesthetic, generic SaaS template, crypto dashboard, Salesforce complexity.

## FONTS
```css
/* Body, UI, labels, buttons — everything default */
font-family: 'DM Sans', -apple-system, sans-serif;
font-weight: 300 | 400 | 500 | 600;

/* Headlines, hero text, display numbers, section titles */
font-family: 'DM Serif Display', Georgia, serif;
font-style: normal | italic;

/* IDs, codes, technical values, timestamps */
font-family: 'JetBrains Mono', monospace;
```

## TYPE SCALE
```
11px  — micro label, uppercase
12px  — caption, hint, timestamp
13px  — body small, table cell
14px  — body default, button, label
15px  — body large
16px  — subtitle
20px  — heading small
24px  — heading medium
32px  — heading large
48px  — display small
64px  — display medium
88px  — display large (marketing hero)
```

## COLOR SYSTEM — CSS VARIABLES
```css
:root {
  --bg:           #0a0a0b;
  --bg-2:         #111114;
  --bg-3:         #18181d;
  --bg-4:         #1e1e24;
  --border:       rgba(255,255,255,0.07);
  --border-light: rgba(255,255,255,0.12);
  --border-focus: rgba(232,255,71,0.4);
  --text:         #f4f4f5;
  --text-2:       #a1a1aa;
  --text-3:       #71717a;
  --text-4:       #52525b;
  --accent:       #e8ff47;
  --accent-hover: #f0ff6a;
  --accent-dim:   rgba(232,255,71,0.12);
  --accent-dim-2: rgba(232,255,71,0.06);
  --green:        #47ff8e;
  --green-dim:    rgba(71,255,142,0.10);
  --red:          #ff4747;
  --red-dim:      rgba(255,71,71,0.10);
  --blue:         #4796ff;
  --blue-dim:     rgba(71,150,255,0.10);
  --amber:        #ffb347;
  --amber-dim:    rgba(255,179,71,0.10);
  --purple:       #a78bfa;
  --purple-dim:   rgba(167,139,250,0.10);
}
```

## SPACING — 4px BASE GRID
```
4px   micro: icon-to-label
8px   xs: related elements
12px  sm: list item gaps
16px  md: compact card padding
20px  lg: standard inner padding
24px  xl: card padding
32px  2xl: section separation
48px  3xl: major section
64px  4xl: page breathing room
80px  5xl: marketing section
120px 6xl: large marketing gaps
```

## BORDER RADIUS
```
4px  — badge, tag
6px  — button sm, input compact
8px  — button default, input default, small card
10px — standard card
12px — modal, drawer
16px — large card
20px — section container
24px — hero card
```

## SHADOWS
```css
--shadow-sm:     0 1px 3px rgba(0,0,0,0.4);
--shadow-md:     0 4px 16px rgba(0,0,0,0.5);
--shadow-lg:     0 8px 32px rgba(0,0,0,0.6);
--shadow-accent: 0 8px 32px rgba(232,255,71,0.2);
--shadow-glow:   0 0 60px rgba(232,255,71,0.08);
```

## ANIMATION — FRAMER MOTION TOKENS (dashboard app only)
```typescript
export const motion = {
  fadeUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
  },
  slideRight: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  hoverLift: { y: -2, transition: { duration: 0.15 } },
  press:     { scale: 0.97, transition: { duration: 0.1 } },
};
export const stagger = {
  container: { transition: { staggerChildren: 0.05 } },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};
// Marketing site: CSS animations ONLY — no Framer Motion (LCP < 2.5s)
```

## COMPONENT REQUIREMENTS (every component)
```
1. WCAG 2.1 AA: keyboard nav, ARIA labels, visible focus rings
2. Loading: Skeleton shimmer (not spinner) where content expected
3. Empty: meaningful illustration + clear CTA (never just "No data")
4. Error: clear message + retry action + support link
5. Responsive: mobile-first, min 375px width
6. No layout shift: images have explicit dimensions
```

## DASHBOARD LAYOUT
```
Topbar:   height 64px, fixed, backdrop-blur-xl, border-bottom var(--border)
Sidebar:  width 240px, fixed left, border-right var(--border), bg var(--bg-2)
Content:  flex-1, overflow-y auto, padding 32px, max-width 1280px centered
Mobile:   sidebar → bottom navigation at < 768px
```

## SIDEBAR NAVIGATION ORDER
```
Overview          /                    (all roles)
Conversations     /conversations       (all roles)
Leads             /leads               (all roles)
Appointments      /appointments        (all roles)
Analytics         /analytics           (VIEWER+)
─────────────────────────────────────
Routing           /routing             (ADMIN+ only)
Agents            /agents              (ADMIN+ only)
Integrations      /integrations        (ADMIN+ only)
─────────────────────────────────────
Settings          /settings/workspace  (all)
```

## KEY COMPONENT SPECS

### ConversationThread
```
AI messages:      left-aligned, var(--bg-3), 2px left border var(--purple)
Human messages:   right-aligned, var(--accent-dim), accent border
System notes:     centered, var(--text-3), 12px italic
Typing indicator: 3 bouncing dots, var(--bg-3) background
Real-time:        Socket.IO subscription, new message fadeIn
Takeover button:  fixed top-right, always visible, accent color
Lead score badge: always visible top of thread, color-coded ring
```

### LeadCard
```
Score ring:       circular 0-100, green>79, amber 30-79, red<30
Status pill:      color matches status
Source icon:      Zillow Z / phone (missed call) / globe (web)
Time:             relative "2 min ago", absolute on hover
Qual progress:    linear progress bar (filled fields / total fields)
Agent avatar:     24px circle, initials fallback
```

### MetricCard
```
Number:     DM Serif Display 40px, var(--text)
Trend:      arrow + % vs prior period (green up, red down)
Sparkline:  28px height, 7-day, accent color line
Hover:      accent glow shadow, y:-2 lift
```

### DataTable
```
Header:     sticky, var(--bg-3), var(--text-3), 12px uppercase
Row hover:  var(--bg-2) → var(--bg-3), 150ms
Sort:       chevron, accent when active
Pagination: cursor-based
Selection:  checkbox column, bulk action toolbar on select
Empty:      illustration + CTA, min-height 200px
```

## ONBOARDING FLOW
```
Layout:    Full viewport, no sidebar, max-width 520px centered
Progress:  minimal dot indicator top-center
Animation: slide + fade 200ms between steps (next=right, back=left)
Each step: ONE primary action, ONE secondary (skip/back)

Step 1: Workspace name + timezone
        Headline (DM Serif italic): "Let's set up your workspace"
Step 2: Connect Twilio phone number (shows provisioning live)
Step 3: Connect CRM — Follow Up Boss (skip option)
Step 4: Configure AI persona (name + tone, live message preview)
Step 5: Test lead simulator (LIVE AI, connects to real API)
Step 6: Celebration (Framer Motion confetti, "You're live")
```

## MARKETING SITE SPECS
```
Color system:   same dark theme as dashboard (brand consistency)
Noise overlay:  SVG filter, 3-4% opacity, hero background texture
Animations:     CSS ONLY — no Framer Motion (keeps LCP < 2.5s)
Core Web Vitals: LCP < 2.5s, CLS < 0.1

Section order:
1. Hero
   - Badge: "Now live in Miami, Orlando, Tampa, San Diego" + pulse dot
   - Headline: DM Serif Display italic 88px "Every lead answered. Every deal captured."
   - Sub: DM Sans 20px var(--text-2)
   - CTAs: accent "See it live →" + ghost "View pricing"
   - Stats bar: 60s response | 3x appointments | 78% first-responder | $0 staff

2. PainPoints — 6 cards, red-dim background, specific statistics

3. LiveDemo — NO SIGNUP
   - Split panel: lead form (Miami preset) + live AI conversation
   - Timer: counts seconds since "lead arrived"
   - Lead score: animates 0→94 during conversation
   - Status pills update in real-time

4. Features — 2-col grid, 7 cards numbered 01-07

5. Pricing — 3-col, middle featured with accent border

6. CTA — radial gradient, DM Serif headline, two buttons

7. Footer
```
