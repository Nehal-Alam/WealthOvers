# WealthOvers — Premium Fintech Design System Specification

**Document Version**: 2.0.0  
**Author**: Principal Fintech Product Designer & UX Specialist  
**Date**: November 2026  
**Product**: WealthOvers — Advanced Personal Money Manager  
**Reference**: Modern Tier-1 Wealth Platforms (Linear, Stripe, Copilot Money, Ramp)

---

## 1. Design Vision & Guiding Principles

The WealthOvers design system elevates the application into a trustworthy, data-dense, yet uncluttered financial control center.

1. **Precision & Restraint**: Avoid decorative gradients, oversized rounded corners, or distracting glassmorphism. Visual accents must always serve a financial semantic purpose.
2. **Surface Depth & Micro-Borders**: Build visual hierarchy through layered surfaces (`ground`, `surface-card`, `surface-elevated`, `surface-sunken`) coupled with crisp 1px borders.
3. **Tabular Numerical Legibility**: All currency, quantities, ratios, and percentages use tabular monospace or tabular numeral figures (`font-variant-numeric: tabular-nums;`), ensuring perfect column alignment.
4. **Ergonomic Accessibility**: WCAG 2.1 AA minimum contrast (>= 4.5:1 for body text, >= 3.0:1 for graphical UI components) across both light and dark themes.
5. **Mobile-First Touch Architecture**: 44px minimum tap targets, thumb-accessible primary actions, and bottom navigation with an anchored action center.

---

## 2. Core Colour Palette & Tokens

### 2.1 Brand & Semantic Palette

| Token Name | Hex Code | Semantic Role | Accessibility Rule |
| :--- | :--- | :--- | :--- |
| **`brand-indigo`** | `#365CF5` | Primary actions, active navigation states, primary buttons, focus rings | Primary interactive signifier |
| **`fin-emerald`** | `#0F9F75` | Income, capital gains, positive cash flow, budget surplus | Paired with `+` sign for positive delta |
| **`fin-coral`** | `#E05B67` | Expenses, debt obligations, negative financial changes, over-budget | Paired with `-` sign for negative delta |
| **`fin-violet`** | `#8B7CF6` | Investment analytics, asset allocation, net-worth growth, insights | Analytical charts and metrics |
| **`fin-amber`** | `#D99A35` | Warnings, upcoming bill dues (<= 7 days), budget utilization (>= 85%) | High-visibility cautionary alerts |

### 2.2 Theme Surface & Text Hierarchy

#### Light Mode (`data-theme="light"` or `.light`)
```css
:root {
  --background: 220 27% 97%;         /* #F5F7FB Canvas */
  --card: 0 0% 100%;                  /* #FFFFFF Card Surface */
  --card-elevated: 216 33% 97%;       /* #F1F4F9 Hover / Dropdowns */
  --card-sunken: 216 28% 95%;         /* #E9EDF5 Insets / Form inputs */
  --card-foreground: 221 37% 15%;     /* #172033 Primary Text */
  --muted-foreground: 215 16% 47%;    /* #64748B Secondary Text */
  --border: 217 28% 92%;              /* #E5EAF2 Structural Borders */
  --border-interactive: 217 20% 84%;  /* Hover borders / Dividers */
  --primary: 228 91% 59%;             /* #365CF5 Primary Indigo */
  --primary-foreground: 0 0% 100%;
}
```

#### Dark Mode (`data-theme="dark"` or `.dark`)
```css
.dark {
  --background: 221 48% 8%;          /* #0B1220 Canvas */
  --card: 219 45% 12%;                /* #111B2E Card Surface */
  --card-elevated: 217 41% 16%;       /* #172338 Elevated / Dropdowns */
  --card-sunken: 222 47% 8%;          /* #080D17 Insets / Form inputs */
  --card-foreground: 218 54% 94%;     /* #E7EDF8 Primary Text */
  --muted-foreground: 214 22% 68%;    /* #9AA9BE Secondary Text */
  --border: 218 33% 22%;              /* #25334A Structural Borders */
  --border-interactive: 218 28% 30%;  /* Hover borders */
  --primary: 228 91% 59%;             /* #365CF5 Primary Indigo */
  --primary-foreground: 0 0% 100%;
}
```

---

## 3. Typography & Spacing Scale

### 3.1 Font Family & Numerical Glyphs
- **Body & Headings**: Inter / System Sans-serif (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Financial Figures**: `font-variant-numeric: tabular-nums;` or JetBrains Mono / Geist Mono for currency arrays and ledger amounts.
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

## 4. Component Library Architecture

### 4.1 Shell & Navigation Components
1. **`AppHeader`**:
   - Breadcrumb navigation path.
   - Command palette trigger (`Cmd+K` / `Ctrl+K`) with search icon and badge.
   - Global Quick Action CTA ("+ New Transaction").
   - Privacy balance toggle, Theme switcher, Notification drawer, and User Profile menu.
2. **`AppSidebar`**:
   - Collapsible desktop drawer (`w-64` expanded, `w-18` collapsed).
   - Tooltips on hover when collapsed.
   - Active route styling with left border accent (`border-l-2 border-primary bg-primary/10`).
3. **`MobileNav`**:
   - Fixed 5-slot bottom bar with elevated center FAB (`+`).
   - Touch targets >= 48px height.
   - Native iOS safe-area inset padding (`pb-safe`).

### 4.2 Financial Display Primitives
1. **`MetricCard`**:
   - Primary metric with tabular font, semantic icon in matching colored container, delta badge (MoM % change), and secondary caption.
2. **`MoneyDisplay`**:
   - Auto-formatting for INR (`₹`) and multi-currency (`$`).
   - Zero-overhead privacy mask integration via `useSyncExternalStore`.
   - Positive/negative semantic coloring (`text-emerald-500` / `text-coral-500`).
3. **`FinancialBadge`**:
   - Low-opacity background container with high-contrast foreground text (e.g., `bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`).

---

## 5. Responsive Breakpoint Rules

- **Mobile (< 640px)**: 1-column KPI grid, bottom navigation active, mobile card feed for transactions, full-screen bottom sheet dialogs.
- **Tablet (640px - 1023px)**: 2-column KPI grid, bottom navigation or sheet drawer, responsive tables with horizontal scroll.
- **Desktop (1024px - 1439px)**: Collapsible sidebar active, 4-column KPI grid, standard modal dialogs.
- **Wide Desktop (>= 1440px)**: Centered `max-w-7xl` container, multi-column dashboard analytics widgets.

