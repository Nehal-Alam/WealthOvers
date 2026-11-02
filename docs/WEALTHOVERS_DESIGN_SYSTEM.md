# WealthOvers — Design System Specification (v4.0.0)

**Aesthetic Direction**: Warm Ivory + Forest Green + Soft Sage  
**Inspiration**: Leftovers Design Language & Spatial Principles  
**Status**: Formal Token Definition & Component Standard  
**Maintainer**: Principal Fintech Product Designer & Senior Frontend Architect  

---

## 1. Global Color System & Design Tokens

WealthOvers moves away from dark navy blue themes to an organic, calm, warm aesthetic. Color values are defined centrally as HSL CSS variables in `app/globals.css`, supporting automatic light, dark, and system themes with full WCAG 2.1 AA contrast compliance.

### 1.1 Light Theme Tokens (Warm Ivory & Forest Green)

| Token Name | Hex Value | HSL Representation | Semantic Application |
| :--- | :--- | :--- | :--- |
| `--background` | `#F7F7F0` | `60 20% 96%` | Warm ivory paper canvas |
| `--surface` / `--card` | `#FFFFFF` | `0 0% 100%` | Primary solid card surfaces |
| `--surface-secondary` | `#E9EEE5` | `96 22% 92%` | Soft sage green panels, subtle chips, active indicators |
| `--surface-elevated` | `#FFFFFF` | `0 0% 100%` | Floating modals, dropdown menus, popovers |
| `--primary` | `#244B3C` | `157 35% 22%` | Core brand identity: buttons, active tab icons, brand badges |
| `--primary-hover` | `#1B3B2F` | `158 37% 17%` | Hover and active interaction states |
| `--primary-soft` | `#DCE5D9` | `105 20% 88%` | Light tint container backgrounds, subtle pills |
| `--accent` | `#8BA58C` | `123 13% 60%` | Sage accent borders, secondary interactive accents |
| `--text-primary` | `#292F2B` | `140 7% 17%` | High-contrast charcoal headings and primary text |
| `--text-secondary` | `#737C73` | `120 4% 47%` | Earthy grey-green captions, secondary telemetry |
| `--border` | `#E4E7DE` | `82 14% 89%` | Hairline card borders, table dividers |
| `--border-interactive`| `#D1D8C8` | `87 16% 82%` | Focus and hover border states |
| `--success` / `--emerald`| `#39805B` | `149 38% 36%` | Income, investment returns, safe budget state |
| `--danger` / `--coral` | `#C77A65` | `13 46% 59%` | Expenses, debt obligations, budget deficit |
| `--warning` / `--amber`| `#C39148` | `36 51% 52%` | Pending reviews, upcoming bills, alert thresholds |

### 1.2 Dark Theme Tokens (Deep Pine & Moss Slate)

| Token Name | Hex Value | HSL Representation | Semantic Application |
| :--- | :--- | :--- | :--- |
| `--background` | `#151C18` | `146 14% 10%` | Deep forest night canvas |
| `--surface` / `--card` | `#1D2821` | `143 16% 14%` | Rich moss slate cards and sections |
| `--surface-secondary` | `#25352A` | `139 17% 18%` | Dark sage input backings, sunken containers |
| `--surface-elevated` | `#2B3B30` | `140 14% 20%` | Elevated dialogs, popovers, navigation drawer |
| `--primary` | `#9BB99D` | `124 18% 67%` | Pale sage primary brand contrast |
| `--primary-hover` | `#8BAE8E` | `125 18% 61%` | Hover and focused brand state |
| `--primary-soft` | `#314638` | `137 18% 23%` | Muted brand badges and subtle pill fills |
| `--text-primary` | `#EFF3EA` | `97 27% 94%` | Warm off-white primary text |
| `--text-secondary` | `#A9B5A8` | `115 9% 69%` | Mist green captions and metadata |
| `--border` | `#344439` | `139 13% 24%` | Hairline slate structural borders |
| `--border-interactive`| `#44594B` | `140 13% 31%` | Interactive element hover border |
| `--success` | `#85BD91` | `133 30% 63%` | Income and positive growth |
| `--danger` | `#E08D79` | `12 63% 68%` | Expenses and debt liabilities |
| `--warning` | `#D6B16C` | `40 56% 63%` | Warnings and upcoming deadlines |

---

## 2. Typography & Numerical Formatting

WealthOvers uses a clean, modern sans-serif typeface (`Inter` via `next/font/google`), styled with deliberate hierarchy and monospace tabular numerals for all financial data.

### 2.1 Font Scale & Hierarchy

| Element | Class / Token | Font Weight | Line Height | Tracking | Purpose |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Hero Big Amount** | `text-4xl sm:text-5xl` | `750` | `1.0` | `-0.035em` | Safe to Spend Today hero amount |
| **Section Title** | `text-xl sm:text-2xl` | `700` | `1.15` | `-0.025em` | Page and major section headers |
| **Card Header** | `text-base` | `650` | `1.25` | `-0.015em` | Module titles, account names |
| **Body Primary** | `text-sm` | `500` | `1.5` | `normal` | Transaction descriptions, notes, standard text |
| **Label / Badge** | `text-xs` | `600` | `1.3` | `0.01em` | Category badges, status tags, form labels |
| **Micro Caption** | `text-[11px]` | `500` | `1.2` | `0.02em` | Helper hints, dates, account numbers |

### 2.2 Tabular Numerals Guarantee
Every financial amount rendered via `MoneyDisplay` or `MetricCard` strictly enforces:
```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1, "cv05" 1;
```
This guarantees that numbers do not jitter during updates, and multi-row ledgers align cleanly on decimal points.

---

## 3. Spatial System, Radii & Elevation

### 3.1 Radii System
- **Pills / Buttons**: `rounded-full` (`9999px`) for action buttons, category filters, and quick tags.
- **Cards & Modules**: `rounded-2xl` (`16px` to `20px`) for all financial panels and metric containers.
- **Small Controls / Inputs**: `rounded-xl` (`12px`) for text inputs, selects, and dropdown items.

### 3.2 Elevation & Shadow Hierarchy
Leftovers relies on **surface tone separation** rather than heavy drop shadows:
- **Level 0 (Flat)**: Hairline border `border border-border/80`, `bg-card`, no shadow. (Used for 90% of dashboard panels).
- **Level 1 (Subtle)**: `shadow-xs` (`0 1px 2px rgba(20, 25, 20, 0.04)`). (Used for clickable cards and buttons).
- **Level 2 (Floating)**: `shadow-md` (`0 4px 16px -2px rgba(20, 25, 20, 0.08)`). (Used for the mobile action FAB and command palette).

---

## 4. Core Component Standards

### 4.1 Buttons
Buttons answer immediately on press with subtle scale compression:
- **Primary Pill**: `bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150`
- **Quiet / Secondary Pill**: `bg-surface-secondary text-foreground hover:bg-surface-secondary/80 active:scale-[0.97]`
- **Ghost Action**: `hover:bg-muted/50 text-muted-foreground hover:text-foreground`

### 4.2 Form Inputs & Keypad
- **Inputs**: Clean inset container with `bg-surface-secondary/60 focus:bg-surface border-border focus:border-primary focus:ring-1 focus:ring-primary`.
- **Fast Numeric Keypad**:
  - $3 \times 4$ grid: digits $1$ through $9$, decimal point `.`, $0$, and backspace $\backspace$.
  - Large touch targets ($64\text{px} \times 54\text{px}$) with immediate haptic-like active feedback.
  - Dedicated currency selector pill and transaction type segmented toggle (Expense / Income / Transfer).

### 4.3 Safe to Spend Meter
- Hero visual component showing:
  - Top: Label `"Safe to spend today"`
  - Center: Giant formatted currency (e.g. `₹2,450`)
  - Middle: Continuous pill progress track (`bg-surface-secondary` with a fill of `bg-primary`)
  - Bottom footnote: Left: `"₹18,500 spent of ₹45,000 budget"`, Right: `"14 days remaining in cycle"`

### 4.4 Date-Grouped Transaction Items
Transactions are displayed as a clean timeline:
- **Header**: Sticky/subtle date divider with relative human date (`"Today, 2 Nov"`, `"Yesterday"`, `"Thu, 30 Oct"`), showing daily subtotal on the right.
- **Row**:
  - Left: Clean category icon in a soft sage or terracotta square rounded pill.
  - Center: Bold merchant/description with category & account badge underneath.
  - Right: High-contrast tabular amount (positive amounts in botanical green `+₹X`, negative in charcoal `₹X`).

### 4.5 Goal Progress Rings
- Clean SVG circle with background track (`border-surface-secondary`) and stroke fill (`stroke-primary` or `stroke-emerald-600`).
- Inner text: Percentage achieved (e.g. `68%`) with target date indicator.
- Monthly required contribution calculator with one-click quick deposit trigger.

---

## 5. Motion, Springs & Accessibility

- **Standard Timing**: $150\text{ms}$ cubic-bezier (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Zero Layout Shift**: Skeletons match exact final component dimensions.
- **Prefers Reduced Motion**: Automatically collapses transition durations to $0.01\text{ms}$ when active in OS.
- **Color Contrast**: 
  - Light mode primary text on warm ivory: **$11.8:1$** (WCAG AAA).
  - Forest green on warm ivory: **$7.4:1$** (WCAG AAA).
  - Dark mode off-white on pine night: **$14.2:1$** (WCAG AAA).

