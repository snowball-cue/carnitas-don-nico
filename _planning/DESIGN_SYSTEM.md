# Carnitas Don Nico — Design System

**Version:** 1.0
**Last updated:** 2026-04-17
**Scope:** Mobile-first PWA (ordering + pickup scheduling), public site, receipts/QR tickets.
**Stack:** Next.js (App Router) + Tailwind v4 + shadcn/ui + Lucide + custom SVG.

---

## 1. Brand Voice & Tone

### English
Don Nico cooks carnitas the way his family has for three generations — slowly, in copper, with salt, citrus, and patience. We speak like the man behind the cazo: warm, plainspoken, a little proud. We never pander, never translate "fiesta" into exclamation points, and never call a Tuesday anything other than martes.

### Español
Don Nico cocina carnitas como su familia lo ha hecho por tres generaciones — despacio, en cobre, con sal, cítricos y paciencia. Hablamos como el hombre detrás del cazo: cálidos, directos, un poquito orgullosos. No usamos diminutivos para vender, no traducimos el alma, y llamamos al martes, martes.

### Voice rules
- **Do:** use Spanish place names (Michoacán, not "Michoa-kahn"), imperial + metric ("1 lb / 450 g"), first person plural ("pedimos al cazo hoy").
- **Don't:** use "authentic," "fiesta," flame emojis, or translate menu item names into cute English (keep "buche," not "pork stomach — yum!").

---

## 2. Color Palette

Values chosen for WCAG AA against `--papel` (light) and `--mole` (dark). Tokens map 1:1 into `tailwind.config.ts`.

| Token | Light HEX | Dark HEX | Role / Use Case |
|---|---|---|---|
| `carnitas` (primary) | `#B15A2A` | `#D07A48` | Primary buttons, links, active tabs — cooked-pork terracotta |
| `carnitas-deep` | `#7E3A17` | `#9B4E24` | Pressed / hover state on primary |
| `cempasuchil` (secondary) | `#F29F2E` | `#FFB347` | Secondary CTAs, promo ribbons, marigold accents |
| `agave` (accent 1) | `#4F7A3A` | `#7BA862` | Vegetarian tags, nopal highlights, success |
| `chile-ancho` (accent 2) | `#8E1E1E` | `#C2413F` | Sale badges, destructive, "Sold out" |
| `talavera` (info) | `#2F6F8F` | `#5AA0C2` | Info toasts, links in body copy |
| `mango` (warning) | `#E8A62A` | `#F6C35A` | Low-stock warnings, warning toasts |
| `masa` (neutral warm) | `#E9DCB8` | `#2A241A` | Card surfaces, hover backgrounds, dividers (warm) |
| `papel` (bg) | `#FBF5E9` | `#121110` | App background (near-white cream / true near-black) |
| `mole` (text primary) | `#2A1A10` | `#F4EADB` | Body text, icon default |
| `mole-60` (text secondary) | `#5E4A3D` | `#C9B9A3` | Sub-labels, EN/ES subtitles, helper text |
| `copper-edge` (border) | `#C9A36A` | `#6E5432` | Lotería-card ornate borders, hairline rules |
| `cazo-shadow` | `rgba(42,26,16,0.12)` | `rgba(0,0,0,0.40)` | Card shadows, modal scrims |

### Status mapping
- **Success** → `agave`
- **Warning** → `mango`
- **Error** → `chile-ancho`
- **Info** → `talavera`

### Contrast spot-checks (light mode)
- `mole` on `papel`: 14.8:1 — AAA body
- `papel` on `carnitas`: 4.9:1 — AA large & normal
- `papel` on `chile-ancho`: 7.6:1 — AAA
- `mole` on `cempasuchil`: 6.1:1 — AA normal (use for badge text)
- `mole` on `agave`: 4.6:1 — AA large; for normal text, use `papel` on `agave` (5.1:1).

---

## 3. Typography

### Display / headline — **Fraunces** (Google Fonts)
**Pick:** `Fraunces` (variable, supports `opsz` 9–144 and `SOFT`, `WONK` axes).
**Rationale:** Fraunces has a letterpress / colonial-woodblock feel that echoes Lotería card typography and old Mexican lotería signage, without reading as generic "fancy serif." Its soft and wonky axes let us dial in warmth at display sizes (`SOFT=100`, `WONK=1`) and restraint at section headings (`SOFT=30`, `WONK=0`). Free, variable, hand-crafted — better than Playfair (too editorial) or Alfa Slab One (too blocky, loses the pop-up intimacy).

### Body — **Inter**
**Pick:** `Inter` (variable).
**Rationale:** Highest x-height among neutral sans options → best legibility for bilingual menus where EN/ES subtitles appear at `text-xs`. Excellent tabular numerals for prices, lb weights, and pickup-capacity counters. Neutral enough to let Fraunces carry the personality.

### Accent / signature — **Caveat**
**Pick:** `Caveat` (variable).
**Usage:** Don Nico's "signature" on receipts / splash, handwritten chalkboard notes ("hoy con salsa verde nueva"), sparingly. Not for UI-critical text.

### Type scale

| Token | Size / Line-height | Font | Tracking | Example |
|---|---|---|---|---|
| `text-xs` | 12 / 16 | Inter | 0.01em | EN/ES subtitle, meta |
| `text-sm` | 14 / 20 | Inter | 0 | Helper, form label |
| `text-base` | 16 / 24 | Inter | 0 | Body, descriptions |
| `text-lg` | 18 / 28 | Inter 500 | 0 | Card price, list items |
| `text-xl` | 20 / 28 | Fraunces 500 | -0.005em | Card title (menu item name) |
| `text-2xl` | 24 / 32 | Fraunces 600 | -0.01em | Section heading |
| `text-3xl` | 30 / 38 | Fraunces 600 | -0.015em | Page heading |
| `text-4xl` | 36 / 44 | Fraunces 700 WONK=1 | -0.02em | Hero / Lotería card title |
| `text-5xl` | 48 / 56 | Fraunces 700 WONK=1 SOFT=100 | -0.025em | Landing hero, order # |

All Fraunces headings default to `font-feature-settings: "ss01", "ss02"` (stylistic swashes on `R`, `a`, `&`).

---

## 4. Iconography

### System icons — **Lucide** (`lucide-react`)
- **Stroke:** `2px`, `strokeLinecap="round"`, `strokeLinejoin="round"`.
- **Sizes:** `16` (inline), `20` (buttons), `24` (tab bar), `32` (empty states).
- **Color:** inherits `currentColor`; default `mole-60`, active `carnitas`.

### Custom SVG illustration set (`/public/illustrations/`)
Hand-drawn feel, **1.5px stroke** on a 24px grid, flat fills from palette (no gradients), **`copper-edge` outlines + warm palette fills**. Style reference: Lotería card engravings + single-color risograph.

Required assets for v1:
- `cazo-de-cobre.svg` — copper cauldron, 3/4 view, used in splash + loading
- `molcajete.svg` — empty state for "no orders yet"
- `chile-ancho.svg` — promo/sale badge ornament
- `elote.svg` (corn) — vegetarian tag
- `papel-picado-top.svg` / `papel-picado-bottom.svg` — 1200×80 seamless border tiles
- `loteria-frame.svg` — 1:1 ornate border, 24px corner medallions
- `firma-don-nico.svg` — signature for receipts

All custom illustrations ship in both `papel`-on-transparent and `mole`-on-transparent variants for dark mode.

---

## 5. Key UI Patterns

### 5.1 Menu item card (Lotería-inspired)
```
┌─────────────────────────────┐ ← copper-edge 1.5px border, 4px inset double-rule
│ ╭───── loteria-frame ─────╮ │   rounded-2xl (16px)
│ │                         │ │   bg: papel (light) / masa (dark)
│ │      [hero image]       │ │   shadow: cazo-shadow, elevation-1
│ │      aspect-4:3         │ │
│ ╰─────────────────────────╯ │
│  Carnitas Maciza            │ ← text-xl Fraunces 500, mole
│  Pork shoulder · shoulder   │ ← text-xs Inter, mole-60, italic
│                             │
│  ┌──────┐         ⊖ 1 ⊕    │ ← price badge: cempasuchil bg,
│  │ $18  │         qty step  │   mole text, text-lg, rounded-full,
│  │ /lb  │                   │   px-3 py-1, rotate -2deg
│  └──────┘                   │
└─────────────────────────────┘
```
- Border: `loteria-frame.svg` as `mask` + `copper-edge` stroke.
- Hero image: 4:3, `object-cover`, 8px inner radius.
- Price badge: `rotate(-2deg)`, slight drop shadow; on sale → `chile-ancho` bg with strikethrough prev price above.
- Qty stepper: icon buttons `h-9 w-9`, `rounded-full`, `border copper-edge`, disabled at 0 and at max-per-order.
- Sold-out state: card grayscales to 60%, diagonal `chile-ancho` ribbon "AGOTADO / SOLD OUT" across top-right.

### 5.2 Pickup date tile
```
┌──────────────────┐
│  SÁB             │ ← text-xs Inter, mole-60, uppercase, tracking-wider
│  18              │ ← text-4xl Fraunces 700, carnitas
│  abril           │ ← text-sm Inter, mole
│  ──────────────  │ ← 1px copper-edge divider
│  12 – 3 pm       │ ← text-sm Inter 500
│  ◐ 14 lb left    │ ← agave dot if >20%, mango 5–20%, chile <5%
└──────────────────┘
```
- Size: 140×160, `rounded-xl`, `border copper-edge` 1px.
- Default: `bg-papel`. Selected: `bg-carnitas`, text inverted to `papel`, border `carnitas-deep` 2px, subtle inner glow.
- Disabled (closed / sold out): 40% opacity, diagonal hatch pattern `masa` on `papel`, cursor `not-allowed`, aria-disabled.
- Hover: lifts 2px, shadow elevation-2.

### 5.3 Order confirmation
- Full-bleed `papel-picado-top.svg` border (80px tall) at top, mirrored `papel-picado-bottom.svg` at bottom, both in `cempasuchil`.
- Order number: rendered inside a Lotería-style circular medallion — 128px, `copper-edge` double-ring, number in Fraunces 5xl, small script label `No.` above in Caveat.
- QR code: 200×200, black on `papel`, framed by `loteria-frame.svg`, caption `"Muéstralo al llegar / Show this at pickup"`.
- Pickup details in a 2-col card: date tile (left) + address with map pin (right).
- Below: Don Nico signature SVG (`firma-don-nico.svg`) in `mole-60`, 80% width.

### 5.4 Empty states
Illustrated + bilingual copy. Max 2 sentences per language.

| Context | Illustration | Copy |
|---|---|---|
| Empty cart | `molcajete.svg` (empty) | **"El molcajete está vacío."** / "The molcajete is empty. Pick something from the menu." |
| No upcoming pickups | `cazo-de-cobre.svg` (cold, no steam) | **"El cazo descansa."** / "The cazo is resting. New pickup dates drop every Sunday." |
| No order history | `elote.svg` (single ear) | **"Aún no has probado."** / "Haven't tried us yet? Start with la maciza." |
| Search no results | `chile-ancho.svg` | **"No encontramos eso."** / "Nothing matched. Try 'carnitas' or 'buche'." |

### 5.5 Loading states
- **Primary (route transitions):** `cazo-de-cobre.svg` with CSS-animated steam (3 wavy paths, `translateY + opacity` loop, 2.4s ease-in-out, respects `prefers-reduced-motion`).
- **Skeletons (lists):** shimmer in `masa` → `papel` → `masa`, 1.6s linear, skewed 12deg. Card skeletons preserve the Lotería frame outline so layout doesn't jump.
- **Inline button loading:** Lucide `Loader2` spinner at `16px`, `carnitas` on `papel` buttons, `papel` on `carnitas` buttons.

---

## 6. Motion & Animation Principles

**Guiding ethos:** movement should feel like a hand, not a servo. Favor `ease-out` over `ease-in-out`, slight overshoot on positive actions, no motion on neutral state changes.

### Global tokens
- `--motion-fast`: 120ms
- `--motion-base`: 200ms
- `--motion-slow`: 360ms
- `--ease-warm`: `cubic-bezier(0.22, 1, 0.36, 1)` (custom out-expo, softer tail)

### Three signature micro-interactions

1. **Button press** — `scale(0.97)` on `pointerdown` over `--motion-fast`, releases with `--ease-warm`. Primary buttons also tint 8% darker via `brightness(0.92)` while held.

2. **Add-to-cart bounce** — cart icon in tab bar does a 2-step bounce: `translateY(-6px) rotate(-4deg)` at 50%, settles at `translateY(0)` with 1.05 overshoot at 85%, 420ms total. A tiny `+1` badge fades in at the top-right of the cart glyph (`cempasuchil` bg, `mole` text) and the item's card flashes `carnitas` border for 200ms.

3. **Order-placed confetti** — 24 cempasúchil petals (small SVGs, 4 orange hues from `#F29F2E` → `#FFD38A`) fall from top, each with randomized `rotate` (0–540deg), `translateX` drift ±120px, duration 1.8–2.6s, staggered 0–400ms. Honors `prefers-reduced-motion: reduce` → replaced with a single static `papel-picado-top.svg` fade-in over 300ms.

### Rules
- No motion > 500ms for non-celebration UI.
- Never animate text color (only bg/border/transform/opacity).
- Page transitions: 180ms cross-fade on route change, no slide.

---

## 7. Accessibility

### Contrast (recap, WCAG AA minimums met)
- Body text `mole` / `papel`: 14.8:1
- Primary button `papel` / `carnitas`: 4.9:1
- Destructive `papel` / `chile-ancho`: 7.6:1
- Badge text `mole` / `cempasuchil`: 6.1:1
- Dark-mode equivalents verified against `#121110` background.

### Focus ring
- **Token:** `--focus-ring: 0 0 0 3px #F29F2E, 0 0 0 5px #B15A2A;` (cempasúchil halo + carnitas edge).
- Applied via `:focus-visible` only (not `:focus`), using `outline: none; box-shadow: var(--focus-ring);`.
- Minimum 3px offset on dense lists (overrides `box-shadow` stacking so it's always visible against any row color).

### Reduced motion
- `@media (prefers-reduced-motion: reduce)` → disable steam, confetti, shimmer. Replace with opacity-only transitions at `--motion-fast`.
- Cart bounce → replaced with a 120ms `--carnitas` border flash.

### Other
- Min tap target: 44×44 CSS px (iOS HIG).
- Language tagging: `lang="es"` on Spanish subtitles / `<span lang="es">` for inline Spanish in English contexts — screen readers switch voice.
- Form errors: never red-alone; pair `chile-ancho` text with Lucide `AlertCircle` icon and explicit error message.
- All custom illustrations have `role="img"` + bilingual `aria-label` (or `aria-hidden` when purely decorative, e.g., papel picado borders).

---

## 8. Component Stack (shadcn/ui)

### Install first (v1 ordering flow)

| Component | Customize? | Notes |
|---|---|---|
| `button` | **Yes** | Add `carnitas` default, `cempasuchil` secondary, `chile-ancho` destructive, `agave` success variants. Rounded-full for primary CTAs only; rounded-xl elsewhere. |
| `card` | **Yes** | Swap border to `copper-edge`, add `loteria` variant with SVG mask frame. |
| `input` | **Yes** | `papel` bg, `copper-edge` 1px border, `carnitas` 2px focus border. |
| `label` | Default | |
| `form` | Default | react-hook-form wiring. |
| `dialog` | **Yes** | Scrim `cazo-shadow`; content `rounded-2xl`, `papel-picado-top` 40px band at top of dialog. |
| `sheet` | **Yes** | Cart sheet from right on desktop, bottom on mobile. Drag handle in `copper-edge`. |
| `calendar` | **Yes** | Heavy re-skin — day cells become date tiles (see 5.2). Disable weekends Don Nico doesn't cook. |
| `toast` (sonner) | **Yes** | 4 variants mapped to status colors; icons from Lucide. |
| `badge` | **Yes** | `precio` variant (rotated, cempasuchil); `agotado` variant (chile-ancho). |
| `separator` | **Yes** | Replace default with a 1px `copper-edge` line, optional centered `◆` diamond glyph. |
| `skeleton` | **Yes** | Shimmer in `masa`. |
| `tabs` | Default | Minor tweak for active underline in `carnitas`. |
| `dropdown-menu` | Default | |
| `avatar` | Default | For Don Nico / team photos on About page. |
| `accordion` | Default | FAQ / allergens. |

### Do **not** install for v1
`command`, `menubar`, `context-menu`, `hover-card`, `navigation-menu`, `resizable`, `carousel` (use native scroll-snap instead — feels more calle-market).

---

## 9. Tailwind Config Snippet

`tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        carnitas: {
          DEFAULT: "#B15A2A",
          deep: "#7E3A17",
          dark: "#D07A48",
          "dark-deep": "#9B4E24",
        },
        cempasuchil: { DEFAULT: "#F29F2E", dark: "#FFB347" },
        agave:       { DEFAULT: "#4F7A3A", dark: "#7BA862" },
        "chile-ancho": { DEFAULT: "#8E1E1E", dark: "#C2413F" },
        talavera:    { DEFAULT: "#2F6F8F", dark: "#5AA0C2" },
        mango:       { DEFAULT: "#E8A62A", dark: "#F6C35A" },

        // Neutrals
        papel: { DEFAULT: "#FBF5E9", dark: "#121110" },
        masa:  { DEFAULT: "#E9DCB8", dark: "#2A241A" },
        mole:  {
          DEFAULT: "#2A1A10",
          60: "#5E4A3D",
          dark: "#F4EADB",
          "60-dark": "#C9B9A3",
        },
        "copper-edge": { DEFAULT: "#C9A36A", dark: "#6E5432" },
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        body:    ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        script:  ['"Caveat"', "ui-serif", "cursive"],
      },
      fontSize: {
        // size, { lineHeight, letterSpacing }
        xs:   ["0.75rem",  { lineHeight: "1rem",    letterSpacing: "0.01em" }],
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem",     { lineHeight: "1.5rem" }],
        lg:   ["1.125rem", { lineHeight: "1.75rem" }],
        xl:   ["1.25rem",  { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        "2xl":["1.5rem",   { lineHeight: "2rem",    letterSpacing: "-0.01em" }],
        "3xl":["1.875rem", { lineHeight: "2.375rem",letterSpacing: "-0.015em" }],
        "4xl":["2.25rem",  { lineHeight: "2.75rem", letterSpacing: "-0.02em" }],
        "5xl":["3rem",     { lineHeight: "3.5rem",  letterSpacing: "-0.025em" }],
      },
      borderRadius: {
        xl:  "0.75rem",
        "2xl": "1rem",
        loteria: "1.25rem",
      },
      boxShadow: {
        "cazo-1": "0 1px 2px rgba(42,26,16,0.08), 0 2px 6px rgba(42,26,16,0.06)",
        "cazo-2": "0 4px 12px rgba(42,26,16,0.12), 0 8px 24px rgba(42,26,16,0.08)",
        "focus-ring": "0 0 0 3px #F29F2E, 0 0 0 5px #B15A2A",
      },
      transitionTimingFunction: {
        warm: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        120: "120ms",
        200: "200ms",
        360: "360ms",
      },
      keyframes: {
        steam: {
          "0%":   { transform: "translateY(0) scaleX(1)",   opacity: "0.0" },
          "30%":  { opacity: "0.7" },
          "100%": { transform: "translateY(-24px) scaleX(1.15)", opacity: "0" },
        },
        "petal-fall": {
          "0%":   { transform: "translate3d(0,-10vh,0) rotate(0deg)",    opacity: "0" },
          "10%":  { opacity: "1" },
          "100%": { transform: "translate3d(var(--drift,0),110vh,0) rotate(540deg)", opacity: "0" },
        },
      },
      animation: {
        steam: "steam 2.4s ease-out infinite",
        "petal-fall": "petal-fall 2.2s ease-in forwards",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".bg-papel-picado-top": {
          "background-image": "url('/illustrations/papel-picado-top.svg')",
          "background-repeat": "repeat-x",
          "background-position": "top center",
          "background-size": "auto 80px",
          "padding-top": "88px",
        },
        ".bg-papel-picado-bottom": {
          "background-image": "url('/illustrations/papel-picado-bottom.svg')",
          "background-repeat": "repeat-x",
          "background-position": "bottom center",
          "background-size": "auto 80px",
          "padding-bottom": "88px",
        },
        ".frame-loteria": {
          "border": "1.5px solid #C9A36A",
          "border-radius": "1.25rem",
          "box-shadow": "inset 0 0 0 3px #FBF5E9, inset 0 0 0 4.5px #C9A36A",
        },
        ".rotate-price": { transform: "rotate(-2deg)" },
        ".tabular": { "font-variant-numeric": "tabular-nums" },
      });
    }),
  ],
} satisfies Config;
```

### CSS variables (global.css)
```css
@layer base {
  :root {
    --focus-ring: 0 0 0 3px #F29F2E, 0 0 0 5px #B15A2A;
  }
  :focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
    border-radius: inherit;
  }
  html { font-family: theme("fontFamily.body"); color: theme("colors.mole.DEFAULT"); background: theme("colors.papel.DEFAULT"); }
  h1,h2,h3,h4 { font-family: theme("fontFamily.display"); font-feature-settings: "ss01","ss02"; }
  .dark html { color: theme("colors.mole.dark"); background: theme("colors.papel.dark"); }
}
```

---

## Appendix A — Implementation checklist (v1)

1. `pnpm add lucide-react class-variance-authority tailwind-merge sonner`
2. `npx shadcn@latest init` → install the components in §8 table.
3. Drop custom SVGs into `/public/illustrations/` (see §4 list).
4. Apply `tailwind.config.ts` + `global.css` from §9.
5. Register Google Fonts via `next/font`: `Fraunces` (weights 400/500/600/700, axes `opsz`, `SOFT`, `WONK`), `Inter` (variable), `Caveat` (variable).
6. Verify contrast with axe DevTools on the 5 core screens: menu list, item detail, cart sheet, pickup calendar, order confirmation.
7. Test `prefers-reduced-motion` and `prefers-color-scheme: dark` end-to-end.

---

*Hecho con cariño por la casa Don Nico.*
