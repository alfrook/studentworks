# ForestHill Student Painters website

A fast website made of plain HTML, CSS, JavaScript and SVG drawings. It has no frameworks, no paid services, no API keys and no map tiles.

The homepage opens on the logo, then a short film that plays on its own (see "The film" below): Toronto from the air, down into Forest Hill, then a house being painted, with the words changing above it, ending on Book a quote.

After the film come the services, **Meet the operator**, how it works, packages, FAQ and **Book a quote**.

Sections marked *(drawn story)* describe the drawn, scroll-driven version: it's the fallback for reduced motion and no JavaScript, and comes back fully with `"use": false`.

```
student-works-painting/
├── index.html              The homepage: the film/story, sections, operator, booking form
├── thanks.html             Shown after the form is sent
├── gallery.html, project.html, about.html, contact.html, credits.html, 404.html
│                           Older pages. Still online, no longer linked from the homepage.
├── site.config.json        ← your web address (SITE_URL)
├── data/story.json         ← the paint beats: labels, colours, captions
├── data/projects.json      Projects for the (unlinked) gallery pages
├── css/styles.css          Shared colours, fonts, header, forms
├── css/home.css            The homepage story, operator and booking styles
├── css/site.css            Brand styles: header, film, sections, footer
├── js/book.js              The Book a quote form
├── js/story.js             The story engine: plays the film (or scrolls the drawings)
├── js/contact.js           Quote form helpers (subject line, call/email switch)
├── images/
│   ├── logo-fhsp*.png      The ForestHill logo (opening screen and header)
│   ├── film/               The film and its poster
│   ├── operator.jpg        ← your photo (placeholder now)
│   ├── scenes/             The drawings: forest-hill.svg, house.svg, kitchen.svg
│   └── scenes/steps/       Still pictures (service cards and the reduced-motion version)
├── tools/
│   ├── build-map.py        Draws Toronto and Forest Hill
│   ├── build-scenes.py     Draws the house, the kitchen and the still pictures from data/story.json
│   ├── set-site-url.py     Writes SITE_URL into every page, the sitemap and robots.txt
│   ├── resize.py           Makes the two photo sizes the gallery pages use
│   └── make-placeholders.py
├── archive/                The previous homepage, kept for reference (not indexed by search engines)
└── sitemap.xml, robots.txt, favicon.svg, .nojekyll
```

## Preview locally

The page loads its drawings and the gallery data as separate files. Browsers block that when you double-click an HTML file, so run a small local server from inside this folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. To preview every colour at once, open http://localhost:8000/?painted

## Swap in your logo, photo and bio (no code)

| What | How |
|---|---|
| **Logo** | `images/logo.png` is the opening screen. A larger version (about 1600 × 1600 px, same red background) will look sharper on big screens; save it over the same file. If the red ever changes, update `--logo-red` near the top of the "Opening screen" section in `css/home.css`. |
| **Operator photo** | Replace `images/operator.jpg`. It's shown as a circle, so a square photo about 800 × 800 px works best, with your face near the centre. |
| **Bio** | In `index.html`, find `BIO START`. Replace the two highlighted `[PLACEHOLDER …]` paragraphs with your own, as plain `<p>…</p>` paragraphs. Keep it factual. |
| **Phone number** | Optional. In `index.html`, next to the email in "Meet the operator", you can add `<a href="tel:+14165550100">416-555-0100</a>`. |

## The look (one place to change it)

All colours and the font live in `:root` at the top of `css/styles.css`: `--bg` (page, white), `--surface` (soft grey cards and form), `--text` (near-black), `--muted` (secondary text), `--accent` (brand red, for small labels, focus rings and the pin) and `--hairline` (thin borders). The font is Inter, from Google Fonts. The map colours are in `:root` at the top of `css/home.css`; the house and room colours are at the top of `tools/build-scenes.py` (run it after changing them).
`--night` (page), `--surface` (cards and form), `--paper` (text), `--muted` (secondary text), `--accent` (brand red, used sparingly for focus rings, thin lines and the pin), and `--hairline` (0.5px borders). The font is Inter, from Google Fonts. The night-time drawing palette for the maps is in `:root` at the top of `css/home.css`; the house and room colours are at the top of `tools/build-scenes.py` (run it after changing them).

- **Slow reveals:** add `class="reveal"` to any element and `js/reveal.js` fades it up once as it comes into view. With reduced motion turned on, nothing moves.
- **Header:** transparent over the opening screen, then a blurred white bar once you scroll (also `js/reveal.js`).
- **Reviews slot:** in `index.html`, after "Meet the operator", there's a hidden `<div id="reviews" hidden>`. When you have real reviews from real clients who agreed to be quoted, put them there and remove the word `hidden`. Never add invented reviews, ratings or press mentions.

## November update

- **Header:** the wordmark reads "ForestHill Student Painters" in Playfair Display (free, Google Fonts). The red "Book a quote" button is the strongest thing in the header.
- **Colours:** the page is black, white and red only (#E10600 for buttons, accents and the highlighted word in headlines). The maps are greyscale with red. The house, room and deck drawings, and your photos, keep their natural colours.
- **Story layout:** three stacked rows (words, drawing, bottom bar), so text never sits on top of a drawing. "Skip to booking" is gone; the header button is the way to jump to the form.
- **Kitchen:** dated beige walls and cabinets turn bright white.
- **Decks and balconies:** four labelled stages: Weathered, Pressure washed, Sanded, Stained. The balcony over the deck is painted in the Stained stage. There is no separate balcony step.
- **Photo placeholders:** `images/plates/kitchen-before.jpg`, `kitchen-after.jpg`, `deck-1-weathered.jpg`, `deck-2-pressure-washed.jpg`, `deck-3-sanded.jpg` and `deck-4-stained.jpg` say "PHOTO COMING". Overwrite them with your photos (same names, same camera position for every stage), then set `"use": true` for `walls` and `deck` in `data/scenes.json`.

## The film (top of the homepage)

The story at the top plays on its own like a video. Nobody has to scroll. The logo shows for half a second and zooms away. Then your AI video plays at real speed (about 6.6 s), with the words above it changing as each shot comes up. It ends on "ForestHill Student Painters" and Book a quote. A button in the bottom bar pauses it, and it becomes "watch again" at the end. The film also pauses if you scroll away, and carries on when you come back.

- The video: `images/film/film.mp4` (2 MB) and its first frame, `images/film/poster.webp`.
- The settings: the `film-data` block in `index.html`.
  - `chapters`: when each word appears, in seconds of the video.
  - `hold`: how long the logo shows first.
  - `rate`: playback speed (1 = real speed, 0.75 = slower).
  - `end`: the pause on the last shot before the end card.
  - `"use": false`: back to the drawn story you scroll through.
- People with "reduce motion" turned on, or JavaScript off, see the drawn step-by-step version instead.
- To use a new video (free, with ffmpeg):
  `ffmpeg -i new.mp4 -an -vf scale=1280:-2 -c:v libx264 -crf 25 -pix_fmt yuv420p -movflags +faststart images/film/film.mp4`
  then `ffmpeg -i images/film/film.mp4 -frames:v 1 images/film/poster.webp`, and update the times in `chapters`.

## Your photos (data/scenes.json) *(drawn story)*

The story is drawn until your photos arrive. For each beat, shoot a **before** and an **after** from the same locked camera position (tripod, same zoom, same time of day). The deck needs four: **before** (grey and dirty), **washed**, **sanded** and **after**. Put the files in `images/plates/` and their paths in `data/scenes.json`.

- A beat switches to photos as soon as all of its paths are filled in. Any beat still missing a photo keeps its drawing, so you can add them one job at a time.
- The "after" photo wipes over the "before" with a slanted brush-pass edge, while the photo slowly pushes in. A faint film grain and a soft vignette sit on top.
- Optional photos: `toronto` (an aerial), `forest-hill` (a street), and `house` (`before` shows when the camera reaches the house, `after` behind the end card).
- Landscape 3:2, at least 2000 px wide. For faster phones, also save a 1200 px copy ending in `-1200.jpg` and set `"phoneSizes": true`.
- Only use photos of jobs where the homeowner agreed, and keep house numbers and faces out of frame.

## Change the paint beats (colours, labels, captions)

*While the film is on, this changes the drawings on the service cards and the reduced-motion version.*

Everything about the paint sequence lives in **`data/story.json`**: the order, each label (e.g. "Front door"), the colour name (e.g. "Signal red"), the colour itself (`hex`) and the one-line caption.

After editing, run:

```bash
python3 tools/build-scenes.py
```

That redraws the house and kitchen in the new colours, rebuilds the still frames, and updates the timeline in `index.html`. Reordering beats reorders the story automatically.

The two map drawings come from `tools/build-map.py`. If you ever change it, run `build-map.py` first, then `build-scenes.py`, because the still frames include the maps.

## Your web address (SITE_URL)

Search engines and link previews read the page tags, sitemap and schema without running JavaScript, so the address has to be written into the files themselves. Change it in one place:

1. Put your address in `site.config.json`, for example `"SITE_URL": "https://studentworkspainting.ca"`.
2. Run `python3 tools/set-site-url.py`.

## The booking form (FormSubmit, free)

Three steps, almost all taps: **Call me** (name, phone, best time) or **Email me** (name, email); what needs painting or staining (Exterior, Interior, Deck, Fence); and the project timeline. `js/book.js` sends it to **paintwithfrook@gmail.com**, cc **gr8sk8er@icloud.com**, through FormSubmit, and shows a check mark when it's sent.

- Call requests arrive with the subject **Free call request from NAME - PHONE** (your iPhone text-back automation reads this; don't reword it in `js/book.js`). Email requests arrive as **Free email request from NAME - EMAIL**.
- Without JavaScript the form still posts to FormSubmit and lands on `thanks.html` (subject "Free call request from website").
- The red "Book a quote" button is in the header, at the end of the story, under the bio, and sticky at the bottom right on phones. The sticky one hides while the form is on screen.
- First use: FormSubmit emails a one-time activation link to paintwithfrook@gmail.com. Click it, or requests won't arrive.

## How the story works (for whoever maintains it) *(drawn story)*

- **One progress value:** the story is a tall scroll track with a pinned stage. Scroll progress, measured in screens, drives everything: the camera, which drawing is showing, the labels, the colour chip, the paint wipes and the progress bar.
- **Cheap to animate:** while scrolling, only CSS transforms and opacity change, plus the position of each paint mask.
- **One camera for every scale:** the camera works in Toronto map coordinates. Each drawing knows where it sits on the map, so a single camera zooms from the whole city to one house and through the front window into the kitchen.
- **Paint wipes:** every paintable surface is drawn twice, unpainted and painted. A slanted mask slides across the painted copy to make the wipe.
- **Loading:** the first scene (the Toronto map, 4 KB) is in the page itself. The other drawings load in the background just after.
- **Timing:** each beat lasts `BEAT` screens (0.75), set near the top of `js/story.js`. The whole story is about 12 screens.

## Accessibility and motion

- **Skipping the story:** "Skip to booking" is visible on every scene, and "Book a quote" is always in the header. Both jump straight to the form and move keyboard focus there.
- **Reduced motion:** visitors who turn on reduced motion in their phone or computer settings get a still, step-by-step version, one drawing per beat with its caption and colour chip. Nothing zooms or wipes, and the animated drawings aren't downloaded.
- **Without JavaScript:** the same step-by-step version shows. The form still works.
- **Screen readers:** every drawing has a text description. The form fields and tap groups are labelled, every tile works with the keyboard, and focus rings are visible.

## Deploy for free

### GitHub Pages
1. Create a free GitHub account and a new **public** repository, e.g. `student-works-painting`.
2. Upload the *contents* of this folder with "Add file → Upload files", including `.nojekyll`.
3. Go to **Settings → Pages**, choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute the site is at `https://<username>.github.io/student-works-painting/`. To use your own domain, add it under Settings → Pages → Custom domain.

### Cloudflare Pages
1. Create a free Cloudflare account and go to **Workers & Pages → Create → Pages**.
2. Connect your GitHub repository, or choose **Upload assets** and drag in this folder.
3. Build command: *none*. Output directory: `/` (the root).
4. The site goes live at `https://<project>.pages.dev`. Add a custom domain under **Custom domains**.

Then set your address with `site.config.json` and `python3 tools/set-site-url.py` (see above), and upload again.

## Still to fill in

```bash
grep -rn "PLACEHOLDER\|example.com" --include=*.html --include=*.json --include=*.xml --include=*.txt . | grep -v archive
```

- Optionally a higher-resolution logo. The operator photo (`images/alex-portrait.jpg`) and bio are in place.
- `SITE_URL` once you have a domain.
- The neighbourhood tiles in the booking form.
- The share image `images/og-image-1200.jpg` (1200 × 630), shown when the link is posted on social media or in a text message.
- The older pages (gallery, about, contact, credits) still contain sample projects and placeholders. They aren't linked from the homepage. Decide whether to keep, update or delete them.

## Notes

- **The maps are our own drawings and illustrative.** The main roads, rivers, the lakefront and the labelled streets are roughly right. The smaller streets in Forest Hill are invented, and the house isn't a real address.
- **Checks during the build:**
  - Smoothness: on a simulated mid-range phone with the CPU slowed 4×, scrolling held 60 frames per second; the slowest frame took under 20 ms.
  - Lighthouse, phone settings: 98 for performance; 100 for accessibility, best practices and SEO.
