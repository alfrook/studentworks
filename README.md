# ForestHill Student Painters website

A fast website made of plain HTML, CSS, JavaScript and SVG drawings. It has no frameworks, no paid services, no API keys and no map tiles.

The homepage opens on the logo, then a short film that plays on its own (see "The film" below): Toronto from the air, down into Forest Hill, then a house being painted, with the words changing above it, ending back on the logo.

After the film come the services, **Meet the operator**, how it works, **Book a quote**, and the frequently asked questions at the very bottom. (The red sliding strip, "Pick a starting point" and "Three things we never cut corners on" were taken out; they are in git history, commit 7dd262f and earlier, if you want them back.)

Sections marked *(drawn story)* describe the drawn, scroll-driven version: it's the fallback for reduced motion and no JavaScript, and comes back fully with `"use": false`.

```
student-works-painting/
├── index.html              The homepage: the film/story, sections, operator, booking form
├── thanks.html             Shown after the form is sent
├── gallery.html, project.html, about.html, contact.html, credits.html, 404.html
│                           Older pages. Still online, no longer linked from the homepage.
├── site.config.json        ← your web address (SITE_URL)
├── data/reviews.json       ← client reviews (add real ones here)
├── data/story.json         ← the paint beats: labels, colours, captions
├── data/projects.json      Projects for the (unlinked) gallery pages
├── css/styles.css          Shared colours, fonts, header, forms
├── css/home.css            The homepage story, operator and booking styles
├── css/site.css            Brand styles: header, film, sections, footer
├── js/book.js              The Book a quote form
├── js/reviews.js           Shows data/reviews.json (hidden when empty)
├── js/story.js             The story engine: plays the film (or scrolls the drawings)
├── js/contact.js           Quote form helpers (subject line, call/email switch)
├── images/
│   ├── logo-fhsp*.png      The ForestHill logo (opening screen, header, footer); made from tools/logo-original.png by tools/make-logo.py
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
- **Client reviews:** the section between "Meet the operator" and "How it works" is **hidden until there is at least one real review**. To add one, open `data/reviews.json` (instructions are at the top of the file), copy the example entry into the `"reviews"` list, fill it in and save (on GitHub you can do this in the browser with the pencil button). The site updates by itself. Each review needs the client's name, their exact words, and `"permission": true` (the client agreed to be quoted): entries without permission are never shown. `area`, `project`, `date` and `stars` are optional; only add `stars` if the client really gave a star rating. Reviews are shown as plain text, in the client's own words. Never add invented reviews. Under the reviews there's a "Send us a few words" email link so past clients can send you one.

## November update

- **Header:** the wordmark reads "ForestHill Student Painters" in Playfair Display (free, Google Fonts). The red "Book a quote" button is the strongest thing in the header.
- **Colours:** the page is black, white and red only (#E10600 for buttons, accents and the highlighted word in headlines). The maps are greyscale with red. The house, room and deck drawings, and your photos, keep their natural colours.
- **Story layout:** three stacked rows (words, drawing, bottom bar), so text never sits on top of a drawing. "Skip to booking" is gone; the header button is the way to jump to the form.
- **Kitchen:** dated beige walls and cabinets turn bright white.
- **Decks and balconies:** four labelled stages: Weathered, Pressure washed, Sanded, Stained. The balcony over the deck is painted in the Stained stage. There is no separate balcony step.
- **Photo placeholders:** `images/plates/kitchen-before.jpg`, `kitchen-after.jpg`, `deck-1-weathered.jpg`, `deck-2-pressure-washed.jpg`, `deck-3-sanded.jpg` and `deck-4-stained.jpg` say "PHOTO COMING". Overwrite them with your photos (same names, same camera position for every stage), then set `"use": true` for `walls` and `deck` in `data/scenes.json`.

## The film (top of the homepage)

The top of the page plays your AI video like a video, and then lets the visitor scroll through it.

1. **It plays by itself.** The logo shows for a moment and zooms away over the first picture (the film waits on that picture until the logo has gone). Then the video plays (about 7 s) with the words above it changing on each shot. The page is locked while it plays, so it behaves like a video. Pausing unlocks it.
2. **It ends on the logo.** The last shot zooms back out to the logo, with a "Watch again" button and a small "Scroll" hint.
3. **Then scrolling moves through it.** Scroll up to rewind through the shots (the words follow), scroll down to go forward again. Past the end of it, the page carries on as normal and the header (logo, Call, Book a quote) appears. A button in the bottom bar plays, pauses or "watches again".

- The video: `images/film/film.mp4` (1.8 MB) and its first frame, `images/film/poster.webp`. It is about 7 seconds long. It was made from the 6.6 s Hailuo clip by slowing each shot a little (about 1.5x) so none is rushed, adding in-between frames up to 60 fps, leaving out the blurry dive through the trees, and joining the shots with 0.4 s dissolves. A keyframe every 24 frames keeps scrolling through it smooth.
- The settings: the `film-data` block in `index.html`.
  - `chapters`: when each word appears, in seconds of the video.
  - `scrub`: how many screens of scrolling it takes to go through the whole film (more = slower).
  - `hold`: how long the logo shows first. `end`: the pause on the last shot before the logo comes back.
  - `rate`: playback speed (1 = as made). `duration`: the length in seconds (a fallback; the real length is read from the file).
  - `"use": false`: back to the drawn story you scroll through.
- If the video can't play (the host can't stream it, or autoplay is blocked) there is a big Play button, or the first picture, and the page can still be scrolled.
- People with "reduce motion" turned on, or JavaScript off, see the drawn step-by-step version instead.
- To use a new video (free, with ffmpeg):
  `ffmpeg -i new.mp4 -an -vf "minterpolate=fps=60,scale=1280:-2" -c:v libx264 -crf 28 -g 24 -bf 0 -pix_fmt yuv420p -movflags +faststart images/film/film.mp4`
  then `ffmpeg -i images/film/film.mp4 -frames:v 1 images/film/poster.webp`, and update `duration` and the times in `chapters`.

## The sections under the film

After the film, in order: **What we paint** (swipeable cards on phones), **Meet the operator**, **Client reviews** (only once you have real ones), **How it works**, **Book a quote**, then the **FAQ** at the very bottom.

- **What we paint:** two real photos (`images/work/navy-house.webp` and `images/work/ladder.webp`) with the four services written out underneath (Exterior, Doors, Interior, Decks & Fences). The phone number and web address on the Student Works sign in the house photo are blurred on purpose so visitors call your number; the original photos are not kept in the website files. To change a photo, replace the file (the house one is 1200 x 900, the ladder one 900 x 1200) and update its `alt` text in `index.html`. Add only real photos of real jobs.
- **Meet the operator:** your photo, name and bio, with the last line of the bio as a pull-quote under it. The bio text is unchanged.
- **FAQ:** every answer is written without anything we can't back up, and no placeholders show on the page. The things to confirm are in HTML comments marked `CONFIRM:` next to each answer. One to watch: the parent Student Works site says it is "proudly partnered with Dulux". Only put a paint brand on this page if that is true for you.
- The footer year updates itself. The "Licensed & insured" line is left out until you've confirmed your real coverage (there's a `CONFIRM:` comment where it goes).
- The thank-you page (`thanks.html`) and the not-found page (`404.html`) match the rest of the site.
- Social sharing: the picture people see when the link is shared is `images/og-image-1200.jpg` (the navy house and the logo). The tab icon is `favicon.svg`, and `apple-touch-icon.png` is what phones use when the site is saved to the home screen.

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
