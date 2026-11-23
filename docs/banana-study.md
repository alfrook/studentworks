# Study: bananacleaning.com

What we looked at: the home page and the About page, opened in Playwright on 19 Nov 2026 at 1440px (desktop) and 390px (phone). Values below are read from the browser's computed styles, not guessed. We borrow **patterns only**. Nothing of Banana's name, copy, monkey, photos or logo goes on our site.

## Colour

Five colours carry the whole site, plus see-through tints of two of them:

| Role | Value | Notes |
|---|---|---|
| Text, dark bands, footer ("cocoa") | `#4c271a` | Used for almost all text (868 elements) and the closing band |
| Hero headline, light bands ("cream") | `#faeed1` | Section background and the headline on the photo |
| Page background ("off-white") | `#fbf7e9` | Body background |
| Highlight band ("banana") | `#ffe18b` | Services section background, one button variant |
| Accent / main buttons (red) | `#b84c43` | "Get a Quote", "Book Now", plan titles |

**Pattern:** a tight palette and *alternating section bands* (off-white → cream → yellow → cream → off-white → cream → dark). The colour change marks each new section, instead of dividing lines.

## Type

- **Display:** "Bowlby One SC" 400, a chunky all-caps face. The hero headline is 176px with a −1.76px letter-spacing and 0.85 line-height; section titles are 60–72px.
- **Body:** "DM Sans" 400 at 16px with a 24px line-height. Sub-headings and card titles use Poppins 400–700 at 20–30px, uppercase with +0.5–1.5px tracking.
- **Pattern:** one loud display face kept for headlines, one quiet body face, and uppercase small headings.

## Buttons, cards, spacing

- **Buttons:** fully round pills, 12px × 24px padding (20px × 36px for the big ones), 14px bold text. There are three variants: red with cream text (the main one), cream with dark text ("Call …"), and dark with cream text.
- **Cards:** about 16–24px corners, a soft shadow, tinted backgrounds. The plan cards sit on a dark background; the middle card is raised and tagged "Most Popular".
- **Spacing:** 96px above and below every section; content max width 1280px (1152px for narrower blocks).

## Header

- Fixed and transparent over the hero photo.
- **Left:** a round logo badge.
- **Centre:** the nav as one pill-shaped group (Home, Services, Christmas Lights, About, Contact).
- **Right:** "Call 615-…" as a cream pill, then "Get a Quote" as a red pill.

## Catchphrase strip

- A full-width band right under the hero, with a 2px border top and bottom.
- Their catchphrase repeats in display type, with a small mascot between each repeat.
- It moves with a linear CSS `translateX` animation lasting 180s, so it drifts slowly and stays readable.

## Voice

- **Hero headline:** a punchy, playful question about the customer's problem.
- **Promise line:** a short, premium pitch below it.
- **Catchphrase:** one short line, repeated (in the strip, the closing band and the About story).
- **Pattern:** a joke up top, serious quality claims underneath, and the same catchphrase used everywhere so it sticks.

## Section order (home page)

1. Header: logo, nav pill, Call button, Get a Quote button.
2. Hero: a full-screen photo, a question headline, a promise line and two call-to-action buttons.
3. Catchphrase marquee.
4. "Our services": 4 photo cards, then "See all services".
5. "How we …": 4 numbered round icons (Call, Quote, Clean, Shine), each with one short line, joined by a thin line.
6. Plans: 3 cards, middle one "Most Popular".
7. FAQ: 7 questions in an accordion.
8. Closing band: dark, a big "Ready when you are." style headline, a one-line promise and a "Book Now" button.
9. Footer: logo, a one-line pitch, phone, email, service area, a list of area links, social icons, a licensed/insured line.

**About page:** the origin story in two photo panels, then three values (Service Quality, Communication, Trust) as icon cards on a yellow band, then a short dark call-to-action band.

## Motion

- The slow marquee, a bouncing arrow, the 0.2s accordion open and close, and a shimmering "gold chrome" effect on the middle plan's title.
- Buttons get a slight lift and shadow on hover.

## What we should NOT copy

- **The pop-up on load:** "What can we help with?" covers the whole page before you can read anything. It's pushy, especially on a phone.
- **Prices and discounts on the plan cards** ("$… OFF"). That breaks our no-prices rule.
- **FAQ answers hidden in collapsed panels with no summary.** Our FAQ gives real answers, uses native `<details>` so it works without JavaScript, and the questions are readable at a glance.
- **Unverifiable "#1" claims** in the About story, and the shimmering gold text effect, which reads as cheap.
- **Huge 176px all-caps type on a busy photo.** It's hard to read on a phone.

## How we translate it (ForestHill Student Painters)

- **Palette:** black, white and red (#E10600) only, using the same banding: white sections, a red marquee band, and black for the closing band and footer.
- **Fonts:** Archivo Black for display, Inter for body (unchanged).
- **Shape:** pill buttons and rounded cards, as in the rest of our site.
- **Order:** the scroll story stays at the top as our "hero", followed by the marquee, services, operator, process, packages (no prices), trust, FAQ, closing band, booking and footer.
