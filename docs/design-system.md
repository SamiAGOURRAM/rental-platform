# Design System & Visual Identity

> _Luxury is not a price point. It's an experience of care._

---

## 1. Brand Identity & Philosophy

### The Core Tension

**Luxury + Sustainability.** Most green startups communicate sustainability through earthy, rustic visuals that accidentally signal "budget." We invert this. The design language communicates luxury fashion house first — the kind of brand you'd trust with your wardrobe. The sustainability story lives in the substance (lifecycle tracking, carbon calculator, donation flow), not in leaf icons and recycled-paper textures.

### Brand Positioning

- **Category:** Premium travel clothing rental
- **Personality:** Confident, warm, editorial, trustworthy
- **Tone:** A luxury fashion magazine that happens to care deeply about the planet
- **Analogy:** Celine meets Patagonia. The Row meets Veja.

### Design Principles

1. **Photography Is the Product** — Clothing must look stunning. Every pixel of UI exists to frame the garments. Inspired by Airbnb's image-first cards and Pinterest's photo-dominant layouts.

2. **Warmth Builds Trust** — No cold blue-grays, no sterile white. Every surface, shadow, and neutral carries warmth. When someone considers renting clothes from a stranger, warmth is what converts. Drawn from all three inspirations — Airbnb's warm near-black, Anthropic's parchment, Pinterest's olive grays.

3. **Editorial Authority** — Serif headlines create the feeling of a published, established brand. This isn't a tech startup; it's a fashion service. The serif/sans hierarchy (inspired by Anthropic) gives every heading the weight of a magazine masthead.

4. **Quiet Luxury** — The brand accent (Deep Forest Green) appears sparingly. Like a luxury boutique, the environment is restrained, and the product is the star. Bold color is reserved for moments of action — CTAs, confirmations, brand signatures.

5. **Breathe** — Generous whitespace, relaxed line-heights, magazine-like section spacing. The user is browsing, not racing. Inspired by Airbnb's travel-magazine pacing and Anthropic's editorial rhythm.

---

## 2. Color Palette

### Primary Brand

| Name             | Hex       | Role                                                                                                    |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| **Deep Forest**  | `#1A3C34` | Primary brand color. CTAs, brand moments, active states. A rich, dark green that reads luxury, not eco. |
| **Forest Hover** | `#15302A` | Hover/pressed state for Deep Forest elements.                                                           |
| **Forest Light** | `#E8F0ED` | Subtle green-tinted surface for success states, selected items, active filters.                         |

### Premium Accent

| Name               | Hex       | Role                                                                                                                    |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Champagne**      | `#C2A66B` | Premium accent. Trust badges ("Verified Quality"), loyalty rewards, premium collection highlights. Used very sparingly. |
| **Champagne Soft** | `#F5F0E3` | Light champagne wash for premium card backgrounds, featured item badges.                                                |

### Neutrals — The Warm Foundation

Every neutral carries a warm yellow-olive undertone. No cool blue-grays exist in this system.

| Name         | Hex       | Role                                                                                                                                       |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ink**      | `#1C1917` | Primary text color. A warm near-black with brown undertone — inspired by Airbnb's #222222 and Anthropic's #141413. Never use pure #000000. |
| **Charcoal** | `#44403C` | Secondary headings, emphasized UI text.                                                                                                    |
| **Stone**    | `#78716C` | Secondary body text, descriptions, metadata.                                                                                               |
| **Ash**      | `#A8A29E` | Tertiary text, placeholders, disabled text.                                                                                                |
| **Sand**     | `#D6D3D1` | Borders, dividers, input borders at rest.                                                                                                  |
| **Linen**    | `#E7E5E4` | Secondary button backgrounds, card borders, hover surfaces. Warm sand tone inspired by Pinterest's #e5e5e0.                                |
| **Pearl**    | `#F5F5F4` | Card surfaces, secondary backgrounds, elevated containers.                                                                                 |
| **Ivory**    | `#FAFAF9` | Primary page background. A barely-warm white — cleaner than Anthropic's parchment, warmer than pure white.                                 |
| **White**    | `#FFFFFF` | Reserved for input fields, modal surfaces, and maximum-contrast moments only.                                                              |

### Semantic

| Name              | Hex       | Role                                                                                |
| ----------------- | --------- | ----------------------------------------------------------------------------------- |
| **Error**         | `#B91C1C` | Error states, destructive actions. Deep warm red, not alarming neon.                |
| **Error Light**   | `#FEF2F2` | Error surface background.                                                           |
| **Success**       | `#1A3C34` | Success states reuse Deep Forest — reinforces brand while communicating positivity. |
| **Success Light** | `#E8F0ED` | Success surface background (same as Forest Light).                                  |
| **Info**          | `#1E40AF` | Informational states, links in body text.                                           |
| **Info Light**    | `#EFF6FF` | Informational surface background.                                                   |
| **Warning**       | `#A16207` | Warning states, attention-needed moments. Warm amber.                               |
| **Warning Light** | `#FEFCE8` | Warning surface background.                                                         |
| **Focus Ring**    | `#1A3C34` | Focus indicator rings for accessibility. Uses brand green for consistency.          |

### Dark Sections (for hero areas, feature sections, footer)

| Name                     | Hex       | Role                                                                                                                      |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Night**                | `#1C1917` | Dark section background. Same as Ink — creates chapter-like page rhythm (inspired by Anthropic's light/dark alternation). |
| **Night Elevated**       | `#292524` | Elevated surfaces on dark backgrounds — cards, inputs on dark sections.                                                   |
| **Night Border**         | `#44403C` | Borders on dark surfaces.                                                                                                 |
| **Night Text Primary**   | `#FAFAF9` | Primary text on dark surfaces (Ivory).                                                                                    |
| **Night Text Secondary** | `#A8A29E` | Secondary text on dark surfaces (Ash).                                                                                    |

---

## 3. Typography System

### Font Families

| Role          | Font               | Fallback Stack                                                                      | Source                               |
| ------------- | ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------ |
| **Headlines** | Cormorant Garamond | `Georgia, 'Times New Roman', serif`                                                 | Google Fonts (free, premium feel)    |
| **Body / UI** | Inter              | `-apple-system, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | Google Fonts (excellent readability) |

**Why this pairing:** Cormorant Garamond is an elegant, high-contrast serif with fashion-editorial DNA — it's used by luxury brands and literary magazines. Inter is the gold standard for UI readability with excellent OpenType features. Together, they create the same editorial authority as Anthropic's serif/sans split, but with freely available fonts. The contrast between the two families creates instant visual hierarchy without relying on size alone.

### Type Scale

| Role            | Font               | Size             | Weight | Line Height | Letter Spacing | CSS Class                    |
| --------------- | ------------------ | ---------------- | ------ | ----------- | -------------- | ---------------------------- |
| **Display**     | Cormorant Garamond | 56px (3.5rem)    | 600    | 1.10        | -0.5px         | `.text-display`              |
| **H1**          | Cormorant Garamond | 44px (2.75rem)   | 600    | 1.15        | -0.4px         | `.text-h1`                   |
| **H2**          | Cormorant Garamond | 36px (2.25rem)   | 600    | 1.20        | -0.3px         | `.text-h2`                   |
| **H3**          | Cormorant Garamond | 28px (1.75rem)   | 600    | 1.25        | -0.2px         | `.text-h3`                   |
| **H4**          | Cormorant Garamond | 22px (1.375rem)  | 600    | 1.30        | normal         | `.text-h4`                   |
| **H5**          | Inter              | 18px (1.125rem)  | 600    | 1.35        | normal         | `.text-h5`                   |
| **Body Large**  | Inter              | 18px (1.125rem)  | 400    | 1.65        | normal         | `.text-body-lg`              |
| **Body**        | Inter              | 16px (1rem)      | 400    | 1.60        | normal         | `.text-body`                 |
| **Body Medium** | Inter              | 16px (1rem)      | 500    | 1.60        | normal         | `.text-body-md`              |
| **Body Small**  | Inter              | 14px (0.875rem)  | 400    | 1.50        | normal         | `.text-body-sm`              |
| **Caption**     | Inter              | 13px (0.8125rem) | 400    | 1.40        | 0.1px          | `.text-caption`              |
| **Label**       | Inter              | 12px (0.75rem)   | 500    | 1.35        | 0.3px          | `.text-label`                |
| **Overline**    | Inter              | 11px (0.6875rem) | 600    | 1.25        | 1.5px          | `.text-overline` (uppercase) |
| **Button**      | Inter              | 15px (0.9375rem) | 500    | 1.25        | 0.2px          | `.text-button`               |
| **Nav**         | Inter              | 15px (0.9375rem) | 500    | 1.00        | normal         | `.text-nav`                  |
| **Price**       | Inter              | 18px (1.125rem)  | 600    | 1.25        | normal         | `.text-price`                |
| **Price Small** | Inter              | 14px (0.875rem)  | 600    | 1.25        | normal         | `.text-price-sm`             |

### Typography Principles

1. **Serif for editorial, sans for functional.** Cormorant Garamond carries all Display through H4 headlines — these are the "magazine" layer. Inter handles everything the user interacts with — buttons, labels, body, navigation. Inspired by Anthropic's serif/sans split.

2. **Negative tracking on headlines.** Display and H1-H3 use negative letter-spacing (-0.2px to -0.5px) for an intimate, luxurious feel. Inspired by Airbnb's cozy heading treatment.

3. **Generous body line-height.** Body text at 1.60 line-height creates a relaxed reading pace — closer to a book than a dashboard. Inspired by Anthropic's 1.60 standard.

4. **No lightweight headings.** Minimum weight 600 on all serif headings. The type should feel confident and substantial, never thin or fragile. Aligned with all three inspirations (Airbnb 500-700, Anthropic 500, Pinterest 600-700).

5. **Overline for category labels.** 11px, uppercase, letter-spaced Inter for category labels above headings ("WOMEN'S COLLECTION", "SUMMER ESSENTIALS"). Creates a fashion-editorial cadence.

6. **Price typography is distinct.** Prices use Inter at weight 600 — they should be immediately scannable without competing with editorial headlines.

---

## 4. Component Styles

### Buttons

**Primary (Deep Forest)**

```
Background: #1A3C34 (Deep Forest)
Text: #FFFFFF
Font: Inter 15px / weight 500 / letter-spacing 0.2px
Padding: 12px 24px
Border-radius: 10px
Border: none
Hover: #15302A (Forest Hover)
Active: #15302A + scale(0.98)
Focus: 0 0 0 3px rgba(26, 60, 52, 0.3)
Transition: all 200ms ease
```

**Secondary (Linen)**

```
Background: #E7E5E4 (Linen)
Text: #1C1917 (Ink)
Font: Inter 15px / weight 500 / letter-spacing 0.2px
Padding: 12px 24px
Border-radius: 10px
Border: none
Hover: #D6D3D1 (Sand)
Active: #D6D3D1 + scale(0.98)
Focus: 0 0 0 3px rgba(26, 60, 52, 0.3)
```

Inspired by Pinterest's warm Sand Gray (#e5e5e0) secondary buttons.

**Outline**

```
Background: transparent
Text: #1C1917 (Ink)
Font: Inter 15px / weight 500 / letter-spacing 0.2px
Padding: 12px 24px
Border-radius: 10px
Border: 1.5px solid #D6D3D1 (Sand)
Hover: background #F5F5F4 (Pearl) + border #A8A29E (Ash)
Active: background #E7E5E4 (Linen) + scale(0.98)
Focus: 0 0 0 3px rgba(26, 60, 52, 0.3)
```

**Ghost / Text**

```
Background: transparent
Text: #1A3C34 (Deep Forest)
Font: Inter 15px / weight 500
Padding: 8px 12px
Border: none
Hover: background rgba(26, 60, 52, 0.06)
Underline on hover for text links
```

**Circular Action** (for carousel controls, close buttons)

```
Background: #F5F5F4 (Pearl)
Icon color: #1C1917 (Ink)
Size: 40px x 40px
Border-radius: 50%
Hover: shadow rgba(0,0,0,0.08) 0px 4px 12px
Active: scale(0.95)
```

Inspired by Airbnb's circular nav controls.

**Premium CTA** (for special moments — "Start Renting", hero CTA)

```
Background: #1A3C34 (Deep Forest)
Text: #C2A66B (Champagne)
Font: Inter 15px / weight 500 / letter-spacing 0.3px
Padding: 14px 32px
Border-radius: 10px
Hover: #15302A + champagne text glow
```

Used sparingly — only for the single most important action on a page.

### Button Sizes

| Size    | Padding   | Font Size | Min Height |
| ------- | --------- | --------- | ---------- |
| Small   | 8px 16px  | 13px      | 36px       |
| Default | 12px 24px | 15px      | 44px       |
| Large   | 16px 32px | 16px      | 52px       |

### Cards

**Product / Garment Card**

```
Background: #FFFFFF
Border-radius: 16px
Overflow: hidden (for image)
Shadow: rgba(0,0,0,0.02) 0px 0px 0px 1px,
        rgba(0,0,0,0.03) 0px 2px 8px,
        rgba(0,0,0,0.06) 0px 4px 16px
Hover: translateY(-2px) + shadow upgrade:
       rgba(0,0,0,0.02) 0px 0px 0px 1px,
       rgba(0,0,0,0.05) 0px 4px 12px,
       rgba(0,0,0,0.08) 0px 8px 24px
Transition: all 300ms ease

Image area: top of card, aspect-ratio 3:4 (portrait — fashion standard)
Content area: 16px padding
  - Overline: category label (text-overline, Stone)
  - Title: garment name (H4 or text-body-md, Ink)
  - Description: size/style (text-body-sm, Stone)
  - Price: "€30 / 5 days" (text-price-sm, Ink)
```

Shadow system inspired by Airbnb's three-layer warm lift approach, softened for luxury feel.

**Feature / Info Card**

```
Background: #F5F5F4 (Pearl)
Border: 1px solid #E7E5E4 (Linen)
Border-radius: 16px
Padding: 32px
Shadow: none (flat — depth from surface color)
```

Inspired by Anthropic's contained (Level 1) cards.

**Premium / Featured Card**

```
Background: #FAFAF9 (Ivory)
Border: 1px solid #E7E5E4 (Linen)
Border-radius: 20px
Padding: 0 (image bleeds) / 24px (content)
Shadow: rgba(0,0,0,0.05) 0px 4px 24px
Champagne accent: thin top border or badge background (#F5F0E3)
```

**Dark Section Card**

```
Background: #292524 (Night Elevated)
Border: 1px solid #44403C (Night Border)
Border-radius: 16px
Padding: 32px
Text: #FAFAF9 (Night Text Primary)
```

### Inputs & Forms

**Text Input**

```
Background: #FFFFFF
Text: #1C1917 (Ink)
Placeholder: #A8A29E (Ash)
Font: Inter 15px / weight 400
Padding: 12px 16px
Border: 1.5px solid #D6D3D1 (Sand)
Border-radius: 10px
Min height: 44px
Focus: border-color #1A3C34 (Deep Forest) + ring 0 0 0 3px rgba(26, 60, 52, 0.15)
Error: border-color #B91C1C + ring 0 0 0 3px rgba(185, 28, 28, 0.15)
Transition: border-color 200ms ease, box-shadow 200ms ease
```

**Select / Dropdown**
Same styling as text input with chevron icon in Stone (#78716C).

**Search Bar** (prominent, Airbnb-inspired)

```
Background: #FFFFFF
Border-radius: 14px
Shadow: rgba(0,0,0,0.02) 0px 0px 0px 1px,
        rgba(0,0,0,0.03) 0px 2px 8px,
        rgba(0,0,0,0.06) 0px 4px 16px
Padding: 14px 20px
Font: Inter 16px
Focus: shadow upgrade + border-color Deep Forest
Inner search icon: Stone (#78716C)
```

**Date Picker Input** (critical for rental dates)
Same base as text input. Calendar icon in Stone. Selected date range highlighted in Forest Light (#E8F0ED) with Deep Forest text.

**Checkbox / Radio**

```
Unchecked: 1.5px solid #D6D3D1, border-radius 4px (checkbox) / 50% (radio)
Checked: background #1A3C34, white checkmark/dot
Focus: 0 0 0 3px rgba(26, 60, 52, 0.15)
Size: 20px x 20px
```

### Navigation

**Header**

```
Background: #FAFAF9 (Ivory) with 60% opacity + backdrop-filter: blur(12px)
Height: 64px
Position: sticky top
Border-bottom: 1px solid #E7E5E4 (Linen)
Max-width content: 1280px, centered
Logo: left-aligned, brand wordmark in Ink (#1C1917)
Nav links: Inter 15px / weight 500 / Charcoal (#44403C)
Active link: Ink (#1C1917) + 2px bottom border in Deep Forest
CTA: Primary button (Deep Forest) — "Start Renting" or "Sign In"
```

Inspired by Anthropic's warm sticky nav and Airbnb's clean header structure.

**Mobile Navigation**

```
Hamburger menu icon: Ink (#1C1917)
Slide-in panel from right
Background: #FFFFFF
Full-height overlay
Links: Inter 18px / weight 500 / vertical stacked / 56px row height
Close: circular action button (top right)
```

### Badges & Tags

**Category Tag**

```
Background: #E7E5E4 (Linen)
Text: #44403C (Charcoal)
Font: Inter 12px / weight 500 / letter-spacing 0.3px
Padding: 4px 10px
Border-radius: 6px
```

**Status Badge** (e.g., "Available", "Rented", "In Transit")

```
Available: bg #E8F0ED, text #1A3C34
Rented: bg #FEF2F2, text #B91C1C
In Transit: bg #EFF6FF, text #1E40AF
Returned: bg #F5F0E3, text #92750E
Font: Inter 11px / weight 600 / letter-spacing 0.5px / uppercase
Padding: 3px 8px
Border-radius: 4px
```

**Premium Badge**

```
Background: #F5F0E3 (Champagne Soft)
Text: #92750E (dark gold)
Font: Inter 11px / weight 600 / letter-spacing 0.5px / uppercase
Padding: 3px 8px
Border-radius: 4px
Icon: small star or diamond
```

### Wishlist / Favorite Heart

```
Position: top-right of garment image (12px offset)
Background: rgba(255,255,255,0.85) + backdrop-filter blur(4px)
Border-radius: 50%
Size: 36px
Icon: heart outline (Stone), filled heart (Deep Forest) when active
Hover: scale(1.08)
```

Inspired by Airbnb's heart overlay on listing images.

### Dividers

```
Color: #E7E5E4 (Linen)
Height: 1px
Margin: contextual (16px for tight, 32px for sections)
Dark sections: #44403C (Night Border)
```

---

## 5. Layout Principles

### Spacing Scale (8px base)

| Token      | Value | Use                                       |
| ---------- | ----- | ----------------------------------------- |
| `space-1`  | 4px   | Tight gaps (icon to label, badge padding) |
| `space-2`  | 8px   | Default element gap                       |
| `space-3`  | 12px  | Input padding, small card gaps            |
| `space-4`  | 16px  | Card content padding, grid gap (mobile)   |
| `space-5`  | 20px  | Comfortable padding                       |
| `space-6`  | 24px  | Section inner padding, card content area  |
| `space-8`  | 32px  | Card padding (featured), section gaps     |
| `space-10` | 40px  | Section title to content                  |
| `space-12` | 48px  | Between page sections (mobile)            |
| `space-16` | 64px  | Between page sections (tablet)            |
| `space-20` | 80px  | Between major page sections (desktop)     |
| `space-24` | 96px  | Hero section padding                      |
| `space-32` | 128px | Maximum section spacing                   |

### Grid System

```
Max container width: 1280px
Centered with auto margins
Horizontal padding: 20px (mobile), 32px (tablet), 48px (desktop)

Product grid:
  Mobile (<640px): 2 columns, 12px gap
  Tablet (640-1024px): 3 columns, 16px gap
  Desktop (1024-1280px): 4 columns, 20px gap
  Large (>1280px): 4 columns, 24px gap (capped at max-width)

Feature grid:
  Mobile: 1 column
  Tablet: 2 columns
  Desktop: 3 columns
```

### Whitespace Philosophy

**Magazine Pacing** — Sections breathe like spreads in a fashion editorial. Between hero and first content section: 80-128px. Between content sections: 64-96px. This creates the travel-magazine browsing pace inspired by Airbnb, where scrolling feels leisurely.

**Content Density** — Product grids are moderately dense (inspired by Pinterest), but each card has generous internal spacing. The garment image is hero; metadata is compact and scannable.

**Asymmetric Rhythm** — Not every section is centered. Feature highlights can use offset layouts (image left, text right; text left, image right). This breaks grid monotony and creates editorial dynamism.

### Page Rhythm: Light/Dark Alternation

Inspired by Anthropic's chapter-like sectioning:

- **Hero:** Dark (Night #1C1917) with Ivory text — dramatic, premium first impression
- **Product Grid:** Light (Ivory #FAFAF9) — clean canvas for photography
- **How It Works:** Pearl (#F5F5F4) — subtle background shift for visual separation
- **Trust/Testimonials:** Dark (Night) — creates gravitas
- **Footer:** Dark (Night) — grounds the page

This alternation creates distinct "rooms" that prevent visual fatigue on long pages.

---

## 6. Depth & Elevation

| Level | Name         | Shadow Value                                                                                      | Use                                                                                                              |
| ----- | ------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0     | **Flat**     | none                                                                                              | Page backgrounds, inline text, flat cards                                                                        |
| 1     | **Ring**     | `0px 0px 0px 1px rgba(0,0,0,0.04)`                                                                | Subtle containment — replacing visible borders with a shadow-border hybrid. Inspired by Anthropic's ring system. |
| 2     | **Lifted**   | `rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.03) 0px 2px 8px, rgba(0,0,0,0.06) 0px 4px 16px`   | Product cards, search bar, elevated containers. Inspired by Airbnb's three-layer warm lift.                      |
| 3     | **Hover**    | `rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.05) 0px 4px 12px, rgba(0,0,0,0.08) 0px 8px 24px`  | Card hover state, interactive lift.                                                                              |
| 4     | **Floating** | `rgba(0,0,0,0.04) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 8px 24px, rgba(0,0,0,0.12) 0px 16px 48px` | Modals, dropdowns, overlays.                                                                                     |
| 5     | **Focus**    | `0 0 0 3px rgba(26, 60, 52, 0.3)`                                                                 | Focus rings — accessibility. Brand-colored for visual consistency.                                               |

### Shadow Philosophy

Three-layer shadows (inspired by Airbnb) create depth that feels like natural light, not CSS:

- **Layer 1** (ring): Ultra-subtle border replacement at 0.02-0.04 opacity
- **Layer 2** (ambient): Soft near-shadow at 0.03-0.05 opacity, small offset
- **Layer 3** (lift): Primary elevation at 0.06-0.12 opacity, larger offset/blur

All shadows use pure black with very low opacity. The warm surface colors underneath ensure the shadows read warm even though they're technically neutral.

---

## 7. Border Radius Scale

| Token            | Value | Use                                      |
| ---------------- | ----- | ---------------------------------------- |
| `radius-sm`      | 4px   | Status badges, checkboxes, tiny elements |
| `radius-md`      | 8px   | Tags, small buttons, compact cards       |
| `radius-default` | 10px  | Buttons, inputs — the workhorse radius   |
| `radius-lg`      | 14px  | Search bar, medium containers            |
| `radius-xl`      | 16px  | Product cards, standard cards            |
| `radius-2xl`     | 20px  | Featured cards, large containers         |
| `radius-3xl`     | 28px  | Hero containers, large feature blocks    |
| `radius-full`    | 50%   | Circular buttons, avatars, icons         |

### Radius Philosophy

Generous but not pill-shaped. 10px for interactive elements (buttons, inputs) creates a soft, approachable feel without looking bubbly. 16px for cards is the sweet spot — rounded enough to feel modern, structured enough to feel premium. Inspired by the convergence across all three inspirations (Airbnb 8-20px, Anthropic 8-32px, Pinterest 12-40px).

---

## 8. Responsive Behavior

### Breakpoints

| Name        | Width       | Key Changes                                                             |
| ----------- | ----------- | ----------------------------------------------------------------------- |
| **Mobile**  | < 640px     | 2-col product grid, hamburger nav, stacked features, compact typography |
| **Tablet**  | 640–1024px  | 3-col products, expanded nav (still condensed), 2-col features          |
| **Desktop** | 1024–1280px | 4-col products, full horizontal nav, 3-col features, max hero type      |
| **Large**   | > 1280px    | Capped at max-width 1280px, centered with generous side margins         |

### Typography Scaling

| Role       | Mobile | Tablet | Desktop |
| ---------- | ------ | ------ | ------- |
| Display    | 36px   | 44px   | 56px    |
| H1         | 32px   | 36px   | 44px    |
| H2         | 28px   | 32px   | 36px    |
| H3         | 22px   | 24px   | 28px    |
| Body       | 16px   | 16px   | 16px    |
| Body Small | 14px   | 14px   | 14px    |

### Touch Targets

- All interactive elements: minimum 44px x 44px touch target (WCAG)
- Buttons: minimum height 44px (small: 36px with padding compensation)
- Nav links on mobile: 56px row height
- Product cards: full-card tap target on mobile

### Collapsing Strategy

- **Product grid:** 4 → 3 → 2 columns
- **Navigation:** Full horizontal → hamburger slide-in
- **Hero:** Max serif display → scaled proportionally
- **Feature sections:** Multi-column → stacked single column
- **Section spacing:** 128px → 96px → 64px → 48px
- **Date picker:** Inline calendar → full-screen overlay on mobile
- **Search:** Inline bar → expandable overlay on mobile

### Image Behavior

- Product photos: maintain 3:4 aspect ratio at all sizes
- Hero images: full-bleed with responsive art direction
- Garment detail: carousel with swipe on mobile (inspired by Airbnb)
- Lazy loading for all product grid images

---

## 9. Do's and Don'ts

### Do

- Use **Ivory (#FAFAF9)** as primary page background — never pure white for the page
- Use **Ink (#1C1917)** for primary text — warm near-black, never #000000
- Use **Cormorant Garamond at weight 600** for all headlines — the serif is the luxury signal
- Use **Inter** for all functional UI — buttons, labels, body text, navigation
- Apply **three-layer warm shadows** for elevated cards (ring + ambient + lift)
- Use **Deep Forest (#1A3C34)** sparingly — only for CTAs, brand moments, active states
- Maintain **1.60 line-height** for body text — the leisurely reading pace builds trust
- Use **3:4 portrait aspect ratio** for garment photography — fashion standard
- Apply **10px radius** on buttons/inputs, **16px** on cards — generous but not bubbly
- Alternate **light/dark sections** on long pages for editorial rhythm
- Use **overline labels** (uppercase, letter-spaced) for category markers
- Reserve **Champagne (#C2A66B)** for premium moments only — it loses power if overused

### Don't

- Don't use pure black (#000000) for text — always Ink (#1C1917)
- Don't use pure white (#FFFFFF) as page background — always Ivory (#FAFAF9)
- Don't use cool blue-grays — every neutral must carry warm undertone
- Don't use bright/neon green — the brand green is dark and rich, not eco-cliché
- Don't use thin font weights (300) for headlines — minimum 600 on serif, 500 on sans
- Don't use heavy drop shadows (opacity > 0.12) — keep shadows soft and warm
- Don't use sharp corners (< 8px) on cards — the generous rounding is the premium signal
- Don't put serif fonts on buttons or labels — serif is editorial, sans is functional
- Don't use leaf/tree/recycle icons as decoration — sustainability is communicated through the product story, not icons
- Don't introduce additional brand colors — Deep Forest + Champagne + warm neutrals is the complete palette
- Don't reduce section spacing below 48px — the breathing room is what makes it feel luxury
- Don't use stock photos with obvious "eco" styling — garments should look high-fashion, not thrift-store

---

## 10. Photography & Image Guidelines

### Product Photography Style

**The Standard:** Fashion editorial, not e-commerce catalog. Garments should look like they belong in a Vogue spread, not an Amazon listing.

**Lighting:** Warm, natural light. Soft shadows. Never harsh flash. Inspired by the warmth of the entire design system — the photography should feel like it was shot at golden hour.

**Backgrounds:** Clean, warm-neutral backgrounds. Off-white linen, warm concrete, light wood. Never cold gray or pure white seamless paper.

**Composition Types:**

1. **Flat Lay** — Garments laid artfully with minimal props (a leather bag corner, sunglasses, a passport). Top-down shot. For product cards.
2. **On Model** — Editorial styling, natural poses. Models mid-movement or in-context (cafe, street, train station). For hero sections and feature highlights.
3. **Detail / Texture** — Close-up of fabric, stitching, label. For product detail pages and trust-building.
4. **In Context** — The garment in a travel context: packed in a suitcase, worn at a landmark, hanging in a hotel room. For storytelling sections.

### Image Specifications

| Context                 | Aspect Ratio   | Min Resolution | Border Radius                 |
| ----------------------- | -------------- | -------------- | ----------------------------- |
| Product card            | 3:4 (portrait) | 600 x 800px    | 16px (top corners, with card) |
| Product detail hero     | 3:4            | 900 x 1200px   | 0px (full-bleed) or 20px      |
| Product detail carousel | 3:4            | 900 x 1200px   | 0px                           |
| Hero background         | 16:9           | 1920 x 1080px  | 0px (full-bleed)              |
| Feature section         | 4:3 or 1:1     | 800 x 600px    | 20px                          |
| Avatar / user photo     | 1:1            | 200 x 200px    | 50% (circle)                  |

### Image Overlays

- **Wishlist heart:** Top-right, 12px offset, frosted glass circle
- **Status badge:** Top-left, 12px offset (e.g., "New", "Last One")
- **Gradient for text overlay on hero:** `linear-gradient(to top, rgba(28, 25, 23, 0.7) 0%, transparent 60%)` — warm, not cold black

---

## 11. Accessibility

### Color Contrast

All text/background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text):

- Ink on Ivory: ~16:1 (exceeds AAA)
- Ink on Pearl: ~15:1 (exceeds AAA)
- Stone on Ivory: ~4.6:1 (meets AA)
- Deep Forest on White: ~9:1 (exceeds AAA)
- Ivory on Night: ~14:1 (exceeds AAA)
- Ash on Night: ~7:1 (exceeds AAA)

### Focus States

- All interactive elements have a visible focus indicator: `0 0 0 3px rgba(26, 60, 52, 0.3)`
- Focus ring uses brand color (Deep Forest) at 30% opacity — visible but not jarring
- Never remove focus outlines — only restyle them
- `focus-visible` for keyboard-only focus indicators

### Motion

- Respect `prefers-reduced-motion`: disable hover transforms, carousel auto-play, parallax
- All transitions: 200-300ms ease — fast enough to feel responsive, slow enough to feel smooth
- No animation purely for decoration — motion should communicate state changes

### Typography

- Minimum body text: 14px (never smaller for readable content)
- Minimum touch target: 44px x 44px
- Line height never below 1.35 for body text
- Sufficient color contrast on all status badges

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3, never skip levels)
- Buttons for actions, links for navigation
- Alt text on all garment images (describe the garment, not "photo of dress")
- ARIA labels on icon-only buttons (wishlist heart, circular controls)
- Form labels always visible or properly associated via `htmlFor`

---

## 12. CSS Custom Properties (Design Tokens)

For implementation, the design system translates to CSS custom properties:

```css
:root {
  /* Brand */
  --color-brand: #1a3c34;
  --color-brand-hover: #15302a;
  --color-brand-light: #e8f0ed;
  --color-accent: #c2a66b;
  --color-accent-soft: #f5f0e3;

  /* Neutrals */
  --color-ink: #1c1917;
  --color-charcoal: #44403c;
  --color-stone: #78716c;
  --color-ash: #a8a29e;
  --color-sand: #d6d3d1;
  --color-linen: #e7e5e4;
  --color-pearl: #f5f5f4;
  --color-ivory: #fafaf9;
  --color-white: #ffffff;

  /* Semantic */
  --color-error: #b91c1c;
  --color-error-light: #fef2f2;
  --color-success: #1a3c34;
  --color-success-light: #e8f0ed;
  --color-info: #1e40af;
  --color-info-light: #eff6ff;
  --color-warning: #a16207;
  --color-warning-light: #fefce8;

  /* Dark */
  --color-night: #1c1917;
  --color-night-elevated: #292524;
  --color-night-border: #44403c;
  --color-night-text: #fafaf9;
  --color-night-text-secondary: #a8a29e;

  /* Typography */
  --font-serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --font-sans:
    'Inter', -apple-system, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-default: 10px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-3xl: 28px;
  --radius-full: 50%;

  /* Shadows */
  --shadow-ring: 0px 0px 0px 1px rgba(0, 0, 0, 0.04);
  --shadow-lifted:
    rgba(0, 0, 0, 0.02) 0px 0px 0px 1px, rgba(0, 0, 0, 0.03) 0px 2px 8px,
    rgba(0, 0, 0, 0.06) 0px 4px 16px;
  --shadow-hover:
    rgba(0, 0, 0, 0.02) 0px 0px 0px 1px, rgba(0, 0, 0, 0.05) 0px 4px 12px,
    rgba(0, 0, 0, 0.08) 0px 8px 24px;
  --shadow-floating:
    rgba(0, 0, 0, 0.04) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08) 0px 8px 24px,
    rgba(0, 0, 0, 0.12) 0px 16px 48px;
  --shadow-focus: 0 0 0 3px rgba(26, 60, 52, 0.3);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-default: 200ms ease;
  --transition-slow: 300ms ease;
}
```

---

## 13. Quick Reference Card

### At a Glance

- **Page background:** Ivory `#FAFAF9`
- **Primary text:** Ink `#1C1917`
- **Secondary text:** Stone `#78716C`
- **Brand accent:** Deep Forest `#1A3C34`
- **Premium accent:** Champagne `#C2A66B`
- **Headlines:** Cormorant Garamond, 600 weight
- **Body/UI:** Inter, 400-500 weight
- **Button radius:** 10px
- **Card radius:** 16px
- **Card shadow:** Three-layer warm lift
- **Body line-height:** 1.60
- **Photo aspect:** 3:4 portrait
- **Max width:** 1280px

### The 5-Second Test

If someone sees this design for 5 seconds, they should think:

1. "This looks expensive" (luxury positioning)
2. "I trust this" (editorial authority from serif typography)
3. "The clothes look beautiful" (photography-first)
4. "This feels warm" (warm neutrals, no cold grays)
5. "This is a real brand" (not a side project, not a Shopify template)
