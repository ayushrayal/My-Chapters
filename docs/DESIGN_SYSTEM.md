# MY CHAPTERS — Brand Design System & UI/UX Specification (Phase 3)

## 1. Brand Identity & Principles

- **Application**: MY CHAPTERS
- **Tagline**: *Your life. Your choices. Your space.*
- **Personality**: Modern, Minimal, Personal, Elegant, Clean, Geometric, Friendly, Premium.
- **Language**: English only throughout the entire UI.

---

## 2. Strict 5-Color Palette

The application strictly uses **only** the following five brand colors or their opacity variations (`rgba`). No pure white (`#FFFFFF`), no generic grey, no black, no green, and no red.

| Token | Hex | RGB | Primary Usage | Contrast Ratio |
|---|---|---|---|---|
| **PRIMARY BLUE** | `#3A4EFB` | `rgb(58, 78, 251)` | Primary action buttons, active navigation, focus rings | 4.6 : 1 on Soft Lavender |
| **SECONDARY BLUE** | `#33A4FA` | `rgb(51, 164, 250)` | Supporting highlights, button hover states, error alert titles | High contrast on Navy |
| **LIME ACCENT** | `#E3FF3B` | `rgb(227, 255, 59)` | Selected navigation states, active badges, primary button text | **12.5 : 1** on Navy, **5.8 : 1** on Blue |
| **DEEP NAVY** | `#252943` | `rgb(37, 41, 67)` | Primary typography, dark surfaces, navigation bars, cards | **10.5 : 1** on Soft Lavender |
| **SOFT LAVENDER GREY** | `#DEE0ED` | `rgb(222, 224, 237)` | App background canvas, card surfaces, text on dark surfaces | High luminance canvas (~0.74) |

### Feedback State Palette Mapping (Strictly NO Red / NO Green)
- **Error Feedback**:
  - Alert Card Background: Deep Navy (`#252943`)
  - Border: Primary Blue (`#3A4EFB`)
  - Title: Secondary Blue (`#33A4FA`)
  - Body Text: Soft Lavender Grey (`#DEE0ED`)
  - Inline Field Error: Primary Blue (`#3A4EFB`) with bullet marker
- **Success Feedback**:
  - Alert Card Background: Deep Navy (`#252943`)
  - Border: Lime Accent (`#E3FF3B`)
  - Title: Lime Accent (`#E3FF3B`)
  - Body Text: Soft Lavender Grey (`#DEE0ED`)

---

## 3. Typography — Outfit Font Family

- **Font Family**: `Outfit`
- **License**: SIL Open Font License 1.1 (`client/src/assets/fonts/outfit/OFL.txt`)
- **Origin**: Local static assets (`client/src/assets/fonts/outfit/`)
- **Zero Runtime Dependencies**: No external Google Fonts CDN requests.
- **Font Display**: `font-display: swap`

### Bundled Font Weights:
- `400`: Regular body copy (`outfit-latin-400-normal.woff2`)
- `500`: Medium form labels & table headers (`outfit-latin-500-normal.woff2`)
- `600`: SemiBold buttons, links & section subtitles (`outfit-latin-600-normal.woff2`)
- `700`: Bold headings & card titles (`outfit-latin-700-normal.woff2`)
- `800`: ExtraBold brand logotype & display headers (`outfit-latin-800-normal.woff2`)

---

## 4. Mobile Bottom Navigation & Responsive Layout

### iPhone-Style Mobile Navigation (`BottomNavigation.jsx`):
- **Fixed Position**: Docked at bottom of viewport (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 900`).
- **Surface**: Deep Navy (`#252943`) with subtle border `rgba(222, 224, 237, 0.16)`.
- **Safe Area Inset**: `padding-bottom: env(safe-area-inset-bottom, 0px)` supporting iPhone home indicators.
- **Touch Targets**: Min-height `48px`, container height `62px`.
- **Items**:
  1. **Home** (`/dashboard`): Home icon + "Home" label
  2. **Profile** (`/profile`): User icon + "Profile" label
- **Active State**: Lime Accent (`#E3FF3B`) icon and text, with pill indicator `rgba(58, 78, 251, 0.28)`.
- **Responsive Display**: Active on mobile; hidden on tablet and desktop (`@media (min-width: 768px)`).
- **Clearance**: Mobile page content features `padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px))` so navigation never obscures content.

### Desktop Navigation (`DashboardLayout.jsx`):
- Top sticky header in Deep Navy (`#252943`).
- Navigation links for "Home" and "Profile".
- Active route indicator with Lime Accent pill.
- Space indicator badge.
- Secondary Sign Out button.

---

## 5. Responsive Viewport Testing Benchmarks

| Viewport Width | Device Category | Layout Behavior |
|---|---|---|
| **320px** | Ultra-compact Mobile | Single-column form, touch targets >= 44px, no horizontal scroll |
| **360px – 390px** | Modern Mobile (iPhone, Galaxy) | Fluid card width, bottom tab bar active, safe-area padded |
| **414px – 480px** | Large Mobile | Form padding 24px, welcome banner text scales cleanly |
| **768px** | Tablet | Two-column overview grid, top header desktop nav visible, bottom nav hidden |
| **1024px** | Laptop | Constrained 1040px max-width, balanced spacing |
| **1280px – 1440px** | Desktop & Ultrawide | Centered layout, high-contrast typography, generous gutters |

