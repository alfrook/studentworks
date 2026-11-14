# Student Works Painting: website (Next.js)

Static Next.js site (no server). Builds to plain files in `out/` that run free on GitHub Pages.

## Run it
```
npm install
npm run dev          # http://localhost:3000
```

## Check and build
```
npx tsc --noEmit
npm run lint
NEXT_PUBLIC_BASE_PATH=/studentworks npm run build   # output in out/, for alfrook.github.io/studentworks
```

## Where to edit content
Everything lives in `src/lib/site.ts`: phone, services, projects, process steps, reasons, testimonials.
Photos go in `public/images/` (WebP, under 200 KB each).

## Placeholders still to replace (real content only)
- **Before / after:** two photos of the same house from the same spot. Set `BEFORE_AFTER.before` and `.after`.
- **Testimonials:** all three are labelled SAMPLE. Replace with real reviews and names (with permission).
- **Hero photo:** currently a real job photo (Owen Sound, 1200 px wide). A larger, sharper photo of a finished two-storey house would look better on big screens.
- **Process photos:** interim job photos. Swap for the same-house sand / clean / prime / paint shots.
- **Service photos:** surface prep uses an interior photo. An exterior prep shot would fit better.
- **Project captions:** only the Owen Sound job has a location. Add locations and scope for the others.

## Quote form
Posts to FormSubmit (`paintwithfrook@gmail.com`, cc `gr8sk8er@icloud.com`).
The subject stays exactly `Free call request from NAME - PHONE`, because the iPhone text-back automation reads it.
Photo attachments are sent as multipart. Test once on the live site that the photos arrive in the email.
