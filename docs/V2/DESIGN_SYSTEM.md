# WEALTHOVERS V2 — BLOOMBERG TERMINAL DESIGN SYSTEM

**Design Direction:** Professional Financial Terminal  
**Lead Designer:** UI/UX Design Specialist (Agent 2)  
**Status:** Approved for Implementation  

---

## 1. Design Philosophy & Aesthetic Core

WealthOvers V2 discards consumer-app trends like giant bubble cards, pastel washes, glassmorphism, and slow decorative animations. In their place, it establishes an institutional-grade financial terminal interface inspired by Bloomberg Professional and FactSet:

* **High Information Density:** Maximize screen real estate with compact row heights, dense tabular grids, and concise data summaries.
* **Precision & Tabular Monospacing:** All monetary amounts, percentages, and dates use tabular numerals (`tabular-nums`) to prevent horizontal jitter and align decimals perfectly down columns.
* **Semantic Indicator Palette:** High-contrast, mathematically unambiguous color cues: Emerald for positive capital inflows/gains, Coral/Ruby for outflows/liabilities, Amber for alerts/delinquencies, and Steel Blue for neutral context.
* **Subtle Elevation & Crisp Borders:** Surfaces are delineated by clean 1px hairline borders (`--border`) and discrete background steps rather than heavy drop shadows.

---

## 2. Centralized CSS Design Tokens

### 2.1 Dark Theme (Primary Terminal Environment)

```css
:root, .dark {
  /* Canvas & Base Backgrounds */
  --app-bg: #101820;           /* Deep Charcoal / Obsidian Canvas */
  --surface: #18232D;          /* Primary Terminal Surface / Module Panels */
  --surface-elevated: #23313D; /* Dropdowns, Tooltips, Modals, Popovers */
  --surface-muted: #1D2933;    /* Table Header Bars, Inset Fields */
  --border: #34424E;           /* Crisp Hairline Dividing Border */

  /* Typography & Text */
  --text-primary: #F1F5F8;     /* Bright Chalk White Primary Text */
  --text-secondary: #A7B4BF;   /* Slate Gray Secondary & Column Labels */
  --text-muted: #6B7C8C;       /* Subdued Metadata / Timestamp Text */

  /* Terminal Accents & Semantics */
  --accent: #F0A52B;           /* Bloomberg Terminal Warm Amber */
  --accent-muted: rgba(240, 165, 43, 0.15);
  --positive: #39B98A;         /* Emerald Inflow / Yield / Profit */
  --positive-muted: rgba(57, 185, 138, 0.15);
  --negative: #EF6A68;         /* Coral Expense / Outflow / Debt */
  --negative-muted: rgba(239, 106, 104, 0.15);
  --info: #62A6E8;             /* Telemetry Blue / Active State */
  --info-muted: rgba(98, 166, 232, 0.15);

  /* Geometry */
  --radius-sm: 4px;            /* Tags, Small Buttons */
  --radius-md: 6px;            /* Standard Inputs, Action Buttons */
  --radius-lg: 8px;            /* Panels, Modals, Terminal Windows */
}
```

### 2.2 Light Theme (High-Contrast Daylight Terminal)

```css
.light {
  /* Canvas & Base Backgrounds */
  --app-bg: #F3F5F7;           /* Cool Slate Off-White Canvas */
  --surface: #FFFFFF;          /* Pure White Module Surface */
  --surface-elevated: #E8EDF1; /* Modals, Menus, Hover States */
  --surface-muted: #E2E8EE;    /* Table Header Bars, Inset Fields */
  --border: #D8E0E6;           /* Crisp Hairline Border */

  /* Typography & Text */
  --text-primary: #17232E;     /* Deep Steel Navy Primary Text */
  --text-secondary: #687783;   /* Slate Gray Secondary */
  --text-muted: #8E9CA8;       /* Subdued Metadata */

  /* Terminal Accents & Semantics */
  --accent: #B77A18;           /* Deep Amber / Gold Accent */
  --accent-muted: rgba(183, 122, 24, 0.12);
  --positive: #16865D;         /* Forest Emerald */
  --positive-muted: rgba(22, 134, 93, 0.12);
  --negative: #CF5353;         /* Crimson / Red */
  --negative-muted: rgba(207, 83, 83, 0.12);
  --info: #397EBA;             /* Classic Terminal Blue */
  --info-muted: rgba(57, 126, 186, 0.12);

  /* Geometry */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

---

## 3. Typography & Numerical Rules

### 3.1 Font Stack
- **Primary Interface Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`.
- **Financial Monospace Font:** `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`.

### 3.2 Tabular Numerals Enforcement
All financial numbers, rates, currency strings, dates, and account numbers must apply:
```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```
This guarantees that numbers of differing widths (e.g. `1` vs `8`) occupy identical character pitches, ensuring decimal points align down rows without visual distortion.

### 3.3 Type Scale Hierarchy

| Role | Size | Weight | Tracking | Case |
| :--- | :--- | :--- | :--- | :--- |
| **Terminal Ticker** | `10px` | Medium (500) | `+0.05em` | All-Caps |
| **Table Column Headers** | `11px` | SemiBold (600) | `+0.04em` | All-Caps |
| **Table Cell Data** | `13px` | Regular (400) / Medium (500) | Normal | Mixed / Tabular |
| **KPI Metric Value** | `20px` – `24px` | Bold (700) | `-0.02em` | Tabular |
| **Module Section Title**| `14px` | SemiBold (600) | `-0.01em` | Title Case |
| **Window / Page Header**| `18px` | Bold (700) | `-0.02em` | Title Case |

---

## 4. Terminal Component Specifications

### 4.1 Reusable Terminal KPI Card (`MetricCard`)
* **Layout:** Compact panel with 1px border (`--border`) and surface fill (`--surface`).
* **Header:** 11px uppercase label with optional info tooltip and tiny sparkline indicator.
* **Value:** 20px bold tabular amount with currency prefix (`₹`).
* **Sub-metric:** 11px delta badge (`+12.4% MoM` in emerald or `-4.2%` in coral).

### 4.2 Terminal Data Grid (`AdvancedTable`)
* **Row Height:** Dense 36px row height with hairline divider lines.
* **Sticky Header:** Sticky column header row with background `--surface-muted` and 1-click column sorting.
* **Alignment Standards:** Text and categories are left-aligned; financial numbers, balances, and dates are right-aligned.
* **Keyboard Shortcuts:** Arrow up/down to navigate rows; `Enter` to open transaction detail drawer; `Escape` to dismiss.

### 4.3 Real-Time Terminal Ticker Bar
* **Position:** Fixed or collapsible strip directly below the top application header.
* **Telemetry Display:**
  - Net Worth: `₹ 24,50,000` (`+₹ 35,000` / `+1.45%`)
  - Liquid Cash: `₹ 3,42,150`
  - Credit Utilization: `14.2%`
  - Safe-to-Spend / Day: `₹ 1,850`
  - Nifty 50 Index: `24,285.50` (`+0.32%`)

### 4.4 Modals & Slide-Over Drawers
* **Modal Shell:** Clean rectangular dialog with `--surface-elevated` background, `--border` outline, and sharp 8px corners.
* **Form Inputs:** Sunken inset fields with `--surface-muted` background, active focus ring in terminal amber (`--accent`), and inline field errors.

---

## 5. Responsive Viewport Strategy

### 5.1 Desktop (1024px and wider)
* Collapsible left sidebar (width: 240px expanded, 64px icon-only).
* Multi-column grid layouts (2 to 4 columns of KPI cards and analytics charts).
* High-density tables showing all metadata columns (Date, Number, Merchant, Category, Account, Status, Amount).

### 5.2 Tablet (768px – 1023px)
* Sidebar defaults to collapsed icon-only mode to preserve table canvas.
* Two-column widget grids.

### 5.3 Mobile (375px – 767px)
* Sidebar converts to a **bottom navigation bar** featuring 4 primary anchors:
  1. `Command` (Dashboard / Net Worth)
  2. `Activity` (Transactions)
  3. `Plan` (Budgets & Bills)
  4. `More` (Opens bottom slide-up drawer containing Investments, Debt, Assets, Intelligence, Settings).
* Table rows adapt into compact 2-line financial list items with swipe gestures for Edit / Reversal.

Proceed to **`TEST_STRATEGY.md`** for the verification protocol.

