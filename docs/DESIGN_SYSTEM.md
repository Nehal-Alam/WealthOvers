# WealthOvers — Premium Fintech Design System Specification
**PREMIUM INDIGO + EMERALD + SLATE**

**Document Version**: 3.0.0  
**Author**: Principal Fintech Product Designer & UX Specialist  
**Date**: November 2026  
**Product**: WealthOvers — Advanced Personal Money Manager  
**Reference**: Linear, Stripe, Copilot Money, Ramp  

---

## 1. Design Vision & Guiding Principles

The WealthOvers design system elevates the application into an ultra-responsive, trustworthy, and visually sophisticated financial control center.

1. **Precision & Restraint**: Avoid decorative gradients, oversized rounded corners, or distracting glassmorphism. Visual accents strictly serve a financial semantic purpose.
2. **Surface Depth & Micro-Borders**: Build visual hierarchy through layered surfaces (`background`, `card`, `elevated`, `sunken`) coupled with crisp 1px borders (`#26364D` dark, `#E2E8F0` light).
3. **Tabular Numerical Legibility**: All currency, quantities, ratios, and percentages use tabular monospace or tabular numeral figures (`font-variant-numeric: tabular-nums;`), ensuring perfect column alignment.
4. **Ergonomic Accessibility**: WCAG 2.1 AA minimum contrast (>= 4.5:1 for body text, >= 3.0:1 for graphical UI components) across both light and dark themes.
5. **Instant Interaction Feedback**: 120ms–150ms transitions for hover and focus states, with full `prefers-reduced-motion` compliance.

---

## 2. Core Colour Palette & Tokens

### 2.1 Brand & Semantic Palette

| Token Name | Hex Code | Semantic Role | Accessibility Rule |
| :--- | :--- | :--- | :--- |
| **`Primary Indigo`** | `#4F46E5` | Primary actions, active navigation states, primary buttons, focus rings | Primary interactive signifier |
| **`Emerald`** | `#10B981` | Income, capital gains, positive cash flow, budget surplus | Paired with `+` sign for positive delta |
| **`Coral`** | `#F87171` | Expenses, debt obligations, negative financial changes, over-budget | Paired with `-` sign for negative delta |
| **`Violet`** | `#8B5CF6` | Investment analytics, asset allocation, net-worth growth, insights | Analytical charts and metrics |
| **`Amber`** | `#F59E0B` | Warnings, upcoming bill dues (<= 7 days), budget utilization (>= 85%) | High-visibility cautionary alerts |

### 2.2 Theme Surfaces & CSS Variables

#### Dark Theme (`.dark` / `data-theme="dark"`)
```css
.dark {
  --background: 220 49% 8.4%;        /* #0B1220 Canvas Background */
  --foreground: 221 47% 93%;         /* #E5EAF5 Primary Text */

  --card: 218 47% 12.5%;             /* #111C2F Card Surface */
  --card-foreground: 221 47% 93%;    /* #E5EAF5 Primary Text */
  --card-elevated: 216 42% 18%;      /* #1A2940 Elevated Surface / Dialogs */
  --card-sunken: 220 52% 6%;         /* Sunken Inputs & Insets */

  --popover: 218 47% 12.5%;          /* #111C2F Popover Surface */
  --popover-foreground: 221 47% 93%;

  --primary: 243 75% 59%;            /* #4F46E5 Primary Indigo */
  --primary-foreground: 0 0% 100%;

  --secondary: 216 42% 18%;          /* #1A2940 */
  --secondary-foreground: 221 47% 93%;

  --muted: 216 42% 18%;
  --muted-foreground: 215 20% 65%;   /* #94A3B8 Secondary Text */

  --accent: 216 42% 18%;
  --accent-foreground: 221 47% 93%;

  --destructive: 0 91% 71%;          /* #F87171 Coral / Expenses & Losses */
  --destructive-foreground: 0 0% 100%;

  --border: 215 34% 23%;             /* #26364D Structural Borders */
  --border-interactive: 215 28% 32%; /* Interactive Hover Borders */
  --input: 215 34% 23%;
  --ring: 243 75% 59%;               /* #4F46E5 Focus Ring */
}
```

#### Light Theme (`:root` / `data-theme="light"`)
```css
:root {
  --background: 216 47% 97%;         /* #F4F7FB Canvas Background */
  --foreground: 221 38% 15%;         /* #172033 Primary Text */

  --card: 0 0% 100%;                 /* #FFFFFF Card Surface */
  --card-foreground: 221 38% 15%;    /* #172033 Primary Text */
  --card-elevated: 210 40% 98%;      /* #F8FAFC Elevated Surface */
  --card-sunken: 214 32% 94%;        /* Form inputs / sunken surface */

  --popover: 0 0% 100%;              /* #FFFFFF Popover Surface */
  --popover-foreground: 221 38% 15%;

  --primary: 243 75% 59%;            /* #4F46E5 Primary Indigo */
  --primary-foreground: 0 0% 100%;

  --secondary: 210 40% 96%;
  --secondary-foreground: 221 38% 15%;

  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;   /* #64748B Secondary Text */

  --accent: 210 40% 96%;
  --accent-foreground: 221 38% 15%;

  --destructive: 0 91% 71%;          /* #F87171 Coral / Expenses & Losses */
  --destructive-foreground: 0 0% 100%;

  --border: 214 32% 91%;             /* #E2E8F0 Structural Borders */
  --border-interactive: 214 25% 82%; /* Interactive Hover Borders */
  --input: 214 32% 91%;
  --ring: 243 75% 59%;               /* #4F46E5 Focus Ring */
}
```

---

## 3. Typography & Spacing Scale

### 3.1 Font Family & Numerical Glyphs
- **Body & Headings**: Inter variable font (`--font-sans`).
- **Financial Figures**: `font-variant-numeric: tabular-nums;` globally active on all numeric displays.
- **Privacy Mask**: Uniform 5-dot glyph (`•••••`) or CSS `filter: blur(8px);` with `transition: filter 0.2s ease;`.

### 3.2 Standardized Typography Scale

| Token | Size | Line Height | Weight | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `display-lg` | 32px (2.00rem) | 38px | 700 Bold | Top-level Net Worth & hero metrics |
| `heading-lg` | 24px (1.50rem) | 30px | 700 Bold | Page headers (Dashboard, Portfolio) |
| `heading-md` | 18px (1.125rem)| 24px | 600 SemiBold | Section titles, modal titles |
| `heading-sm` | 15px (0.9375rem)| 20px | 600 SemiBold | Card titles, widget headings |
| `body-base` | 14px (0.875rem)| 20px | 400/500 | Table cells, form labels, dialog text |
| `caption-sm` | 12px (0.75rem) | 16px | 500 Medium | Subtitles, date stamps, status badges |
| `mono-xs` | 11px (0.6875rem)| 14px | 600 Mono | Account numbers, transaction hashes |

---

## 4. Component Ergonomics

1. **Cards**: 12px border radius (`rounded-xl` / `var(--radius)`), subtle 1px border (`border-border/80`), `shadow-xs`.
2. **Buttons**: 8px border radius (`rounded-lg`), 150ms micro-transition (`active:scale-[0.98]`).
3. **Inputs & Selects**: 8px border radius (`rounded-lg`), `border-border/80 bg-card focus-visible:ring-primary`.
4. **Dialogs & Modals**: 16px border radius (`sm:rounded-2xl`), `bg-card border-border/80 shadow-xl`.
5. **Badges**: Semantic color tokens with subtle 10% translucent background and 20% border.
6. **Charts**: Coordinated color mapping across all Recharts and CSS bars (Indigo `#4F46E5`, Emerald `#10B981`, Violet `#8B5CF6`, Coral `#F87171`).
