# Design System Strategy: Cognitive Slate

## 1. Overview & Creative North Star

### The Creative North Star: "The Clinical Curator"
Modern pharmaceutical management is often bogged down by legacy interfaces that prioritize data density over human cognition. This design system rejects the "spreadsheet-as-a-UI" philosophy. Instead, it adopts the persona of **The Clinical Curator**: an interface that feels like a premium, high-end medical journal—authoritative, airy, and hyper-organized.

We break the standard "template" look by utilizing **intentional asymmetry** and **depth-based containment**. By using a sophisticated mix of high-contrast display typography (Manrope) against utilitarian body type (Inter), we create a rhythmic hierarchy that guides the pharmacist's eye through critical data without cognitive overload. 

The system moves away from rigid grid lines in favor of **Tonal Layering**, where importance is defined by the "physical" height of a component in a stacked digital space.

---

## 2. Colors

The palette is anchored in deep Teals and clinical Blues, providing a sense of sterile reliability and professional calm.

### Key Color Roles
- **Primary (#006565):** Reserved for high-intent actions and primary brand touchpoints.
- **Secondary (#296767):** Used for supporting UI elements and navigational accents.
- **Tertiary (#8b4823):** An "earth-tone" contrast used sparingly to highlight non-critical but important specialized data.
- **Surface Tiers:** From `surface-container-lowest` (#ffffff) to `surface-dim` (#d8dadc), these define the physical topography of the interface.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off parts of the UI. Structure must be achieved through background shifts. A card (`surface-container-lowest`) should sit on a section background (`surface-container-low`) to define its boundary. Lines create visual noise; color shifts create "zones."

### The Glass & Gradient Rule
To ensure the UI feels "bespoke" and not "off-the-shelf," use Glassmorphism for floating overlays (e.g., Modals, Search Dropdowns). 
- **Effect:** Apply `surface` color at 70% opacity with a 12px-20px backdrop-blur.
- **CTAs:** Use a subtle linear gradient from `primary` (#006565) to `primary_container` (#008080) at a 135-degree angle to give buttons a "gem-like" tactile quality.

---

## 3. Typography

The typographic strategy balances **Manrope** (Editorial/Display) with **Inter** (Data/Utility).

| Level | Font | Role |
| :--- | :--- | :--- |
| **Display** | Manrope | Large-scale metrics (e.g., Total Revenue, Inventory Count). Bold and authoritative. |
| **Headline** | Manrope | Page titles and major section headers. Sets the tone of the "Curated" experience. |
| **Title** | Inter | Card titles and modal headers. High legibility for quick scanning. |
| **Body** | Inter | Patient names, drug descriptions, and general data. Optimized for long-form reading. |
| **Label** | Inter | Statuses, micro-copy, and table headers. Always uppercase or medium-weight for distinction. |

---

## 4. Elevation & Depth

We eschew traditional "Drop Shadows" for **Tonal Layering** and **Ambient Light Physics**.

### The Layering Principle
Depth is achieved by "stacking" the `surface-container` tiers. 
- **L1 (Base):** `surface` (#f7f9fb)
- **L2 (Content Area):** `surface-container-low` (#f2f4f6)
- **L3 (Interactive Cards):** `surface-container-lowest` (#ffffff)

### Ambient Shadows
When an element must float (like a persistent "Add to Sale" fab), use a shadow tinted with `on-surface`:
- **Shadow Property:** `0px 12px 32px rgba(25, 28, 30, 0.06)`
- This 6% opacity ensures the shadow feels like ambient light blockage rather than a "glow."

### The "Ghost Border" Fallback
If WCAG contrast requirements demand a container edge in a low-contrast environment, use a **Ghost Border**: 
- **Stroke:** 1px | **Color:** `outline-variant` | **Opacity:** 15%.

---

## 5. Components

### Cards & Lists
**Strict Rule:** No horizontal dividers in lists. Use `0.9rem` (Spacing 4) or `1.1rem` (Spacing 5) of vertical padding to separate items. For high-density tables, alternate row colors using `surface` and `surface-container-low`.

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `md` (0.375rem) roundedness, and `on-primary` text.
- **Secondary:** `surface-container-high` background with `on-secondary-container` text. No border.

### Status Indicators (High-Density Signals)
For pharmacy management, status is life-critical. Use semi-transparent backgrounds with high-contrast text:
- **Available (Green):** Background: `secondary_fixed` (light teal/green), Text: `on-secondary_fixed_variant`.
- **Low Stock (Yellow):** Background: `tertiary_fixed`, Text: `on-tertiary_fixed_variant`.
- **Expired/Out (Red):** Background: `error_container`, Text: `on-error_container`.

### Specialized Component: The "Dose-Chip"
For drug management, use a "Dose-Chip" to display strengths (e.g., 500mg). It should use `outline-variant` with a `full` (9999px) radius and `label-sm` typography to provide high-density information without cluttering the row.

---

## 6. Do's and Don'ts

### Do
- **Do** use the `24` (5.5rem) spacing token for major page margins to create an "Editorial" feel.
- **Do** use `display-lg` for single, impactful numbers on a dashboard.
- **Do** ensure all interactive elements have a minimum tap/click target of 44px, even if the visual element is smaller.

### Don't
- **Don't** use 100% black (#000000) for text. Use `on-surface` (#191c1e) to reduce eye strain in high-use clinical environments.
- **Don't** use "Standard" box shadows. They look dated. Stick to Tonal Layering.
- **Don't** use bright red for anything other than "Error" or "Expired." It triggers unnecessary urgency in a pharmacy setting.

---

## 7. Accessibility (WCAG 2.1)

All color combinations in this system have been vetted for a minimum contrast ratio of 4.5:1. 
- **Text on Surfaces:** Always use `on-surface` or `on-surface-variant`.
- **Interactive States:** Focus states must use a 2px `outline` token with a 2px offset to ensure keyboard navigability is visible and distinct.
