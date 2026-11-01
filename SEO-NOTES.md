# SEO launch notes

This project is plain HTML, CSS and JavaScript. There is no package manifest, framework, production build command or generated output to build. Serve the repository as static files.

## Production

- `index.html` is the existing production homepage. Its canonical, sharing URLs, business identifier, sitemap and robots sitemap reference use `https://www.autoxheviti.com/`, matching `CNAME`.
- Existing page/fragment URLs and original PNG asset URLs are retained. No page was renamed or removed, so no new path redirects are required.
- Confirm the hosting provider redirects `https://autoxheviti.com/` to the preferred `https://www.autoxheviti.com/` and serves HTTPS. CNAME and HTML alone cannot configure an HTTP redirect; no unsupported server redirect configuration was added.
- Ensure the deployment includes the new WebP images, `robots.txt` and `sitemap.xml`. After launch, submit `https://www.autoxheviti.com/sitemap.xml` in the site's existing search-console account, if available.

## Redesign review page

`index.html` now contains the approved redesigned homepage, with production asset paths and `index, follow`. `hero-preview/index.html` remains a separate review copy with intentional `noindex, follow` and the production homepage canonical. The review copy is excluded from the sitemap.

The production page retains `#home` and `#galeri` aliases for incoming links and loads its runtime files from `hero-preview/`. Image preload URLs in the JavaScript resolve relative to their scripts, so both the production homepage and review page work. Do not overwrite the production page with the review copy without retaining these release adjustments.

## Release checks

Run `python scripts/check-site.py` and `node --check` for the eight runtime JavaScript files in `hero-preview/`. There is no build step or dependency installation. Browser QA should cover desktop/mobile, native section links, album arrow-key focus, the five tint options and the enquiry form without submitting a message.

Mobile hero starts immediately, with a fixed reversible tint/exit timeline and viewport geometry that does not follow browser toolbar height changes. Desktop retains its entrance and reduced motion remains static. The existing typefaces are served locally with their OFL licenses in `hero-preview/assets/fonts/`; optimized car/About images keep their original dimensions. The About section skips unchanged animation frames and initializes its reserved layout without waiting for photo decoding.

The configured remote redirects to the existing `starnexstudio` repository; production deploys from `main` through GitHub Pages. Prepare a clean release commit from the production branch containing the approved site files, preserving the local design-review branch. Verify the deployment result and the public homepage after pushing.

Stage the production page, robots/sitemap, CNAME, runtime `hero-preview/*.css` and `hero-preview/*.js`, both page HTML files, required assets, these notes and `scripts/check-site.py`. Exclude `.claude/`, the before-video, review-state JSON, `contact-review.html`, old verification fixtures and `hero-preview/qa/` screenshots from the release.

Business schema uses only the address, phone, email, hours and social links already present in the site's contact content. Unconfirmed price range was removed; no coordinates, reviews, ratings or new claims were added.
