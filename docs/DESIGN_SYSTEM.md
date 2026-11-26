# MY CHAPTERS — NEO-BRUTALIST DESIGN SYSTEM

## 1. Philosophy & Visual Language

My Chapters employs a **Neo-Brutalist** product design language:
- **High-contrast, functional, confident, and tactile.**
- **Strict 2px and 3px solid Deep Navy (`#252943`) outlines on every component.**
- **Hard offset shadows with ZERO blur** (`3px 3px 0 #252943`, `4px 4px 0 #252943`, `6px 6px 0 #252943`).
- **Tactile micro-interactions**: Hover lifts (`translate(-2px, -2px)`), Active presses down (`translate(2px, 2px)` with zero shadow).
- **Zero gradients, zero blur, zero soft glow shadows, and zero backdrop-filters.**
- **Retro-modern UI elements**: Window-card headers with 3 square dots, folder-tab cards, drop-zone empty states with dashed borders, and scrolling ticker strips.

---

## 2. Strict Brand Color Palette

No colors outside this official brand palette are permitted anywhere in the application:

| Token Name | Hex Code | Role & Usage Rules |
| :--- | :--- | :--- |
| **White** | `#FFFFFF` | Primary card surfaces, clean backgrounds, input fields, modals. |
| **Canvas** | `#F5F7FB` | Main page background with subtle 6% Deep Navy dot-grid pattern (`20px 20px`). |
| **Primary Blue** | `#3A4EFB` | Primary call-to-actions, hero cards, prominent links (Text: `#FFFFFF`). Flat fill only. |
| **Secondary Blue** | `#33A4FA` | Secondary elements, info states, planned/pending markers (Text: `#252943`). |
| **Fresh Green** | `#168B68` | Success states, completed tasks, purchased items, finished workouts (Text: `#FFFFFF`). |
| **Deep Navy** | `#252943` | All borders/outlines, primary text, icons, and hard shadows. The anchoring ink of the app. |
| **Subtle Border** | `#DEE0ED` | Subtle dividers, disabled background fills, empty track backgrounds. |
| **Accent Lime** | `#E3FF3B` | Highlighting stickers, active segmented tabs, "Today" markers. **ALWAYS `#252943` Deep Navy text** (WCAG AA). Never use Lime as text color on white. |
| **Error Red** | `#DC2626` | Destructive actions, validation errors, rest day markers (Text: `#FFFFFF`). |
| **Muted Text** | `rgba(37, 41, 67, 0.70)` | Secondary labels, descriptions, timestamps, counters. |

---

## 3. Borders, Shadows & Radii

### Borders
- **Standard**: `2px solid #252943` on all cards, inputs, buttons, and chips.
- **Thick**: `3px solid #252943` on hero cards, modals, top navigation, and bottom navigation.
- **Dashed**: `2px dashed #252943` on empty drop-zone cards and ghost buttons.

### Hard Shadows (Zero Blur)
- **Small (Chips, small buttons, stat cards)**: `3px 3px 0 #252943`
- **Medium (Standard cards, inputs on focus)**: `4px 4px 0 #252943`
- **Large (Hero cards, modals, dropdowns)**: `6px 6px 0 #252943`
- **Mobile overrides**: Maximum `3px` normal, `4px` hero/modal.

### Corner Radii
- **Inputs & Chips**: `6px` (`$radius-input`, `$radius-chip`)
- **Buttons, Cards & Modals**: `10px` (`$radius-button`, `$radius-card`, `$radius-modal`)
- **Pill / Circular (`9999px`)**: Strictly reserved for user avatars and small status dots.

---

## 4. Typography

- **Headings**: `Plus Jakarta Sans` (fallback `Outfit`), Weight `800` (Extrabold) and `700` (Bold) with tight letter-spacing (`-0.03em`).
- **Body & Inputs**: `Inter` (fallback `Outfit`), Weight `500` / `600`, line-height `1.5`.
- **Labels & Badges**: Weight `800`, Uppercase, tracking `0.05em`, size `11px` - `12px`.
- **Mobile Inputs**: Strictly `16px` font-size to prevent iOS Safari auto-zoom.

---

## 5. Signature Components

### WindowCard
Retro desktop window style card with a top header bar:
- Left: 3 small square Navy dots (`8px x 8px`).
- Center/Left: Uppercase bold title.
- Header background variants: Canvas (`#F5F7FB`), Lime (`#E3FF3B`), Blue (`#3A4EFB`), White (`#FFFFFF`).

### FolderCard
Folder-tabbed card with a distinct tab sitting above the top border in Lime, Secondary Blue, or Navy.

### Ticker
High-contrast marquee ticker strip:
- Background: Lime (`#E3FF3B`).
- Borders: `2px solid #252943` top and bottom.
- Bullets: Small square Navy blocks (`■`).
- Content: Uppercase bold motivational and status items.

### EmptyState Drop Zone
- Border: `2px dashed #252943`.
- Background: `#F5F7FB`.
- Icon: Enclosed inside a bordered Lime square tile (`box-shadow: 2px 2px 0 #252943`).

---

## 6. Do's and Don'ts

### DO:
1. Use 2px solid Deep Navy borders on every interactive and container element.
2. Ensure active states and highlights use Lime (`#E3FF3B`) with Deep Navy text.
3. Keep tap targets >= 44px on mobile viewports (360px - 430px).
4. Provide hard offset shadows (`translate(-2px, -2px)` on hover, `translate(2px, 2px)` on active).
5. Wrap long text and ensure responsive layout never overflows viewport width.

### DO NOT:
1. **NO GRADIENTS**: Never use CSS linear gradients for backgrounds or text.
2. **NO BLUR**: Never use `backdrop-filter: blur(...)` or `filter: blur(...)`.
3. **NO SOFT SHADOWS**: Never use diffuse box-shadows like `rgba(0,0,0,0.1) 0 4px 16px`.
4. **NO OFF-PALETTE COLORS**: Do not introduce purple, coral, pink, yellow, or teal.
5. **NO 1px BORDERS**: Borders must be 2px (or 3px for hero/modals).
