# The Name Check

Build Stillopen, a single-page name check by an indie maker named Sable. Not a generic SaaS dashboard. One screen, dark, sharp, a little loud. The whole product is the check.

What it does: a visitor types a product name and hits Check. The page calls POST /api/check with JSON { name }. The response is { results: [ { label, kind, status, detail } ] }. kind is domain or github. status is taken, open, or unknown. Show five domains (.com, .io, .dev, .app, .co) and GitHub as separate rows. taken is red and firm. open is a bright yes. unknown is quiet and says we could not check. Open means the public lookup found nothing. It does not mean a registrar will sell it. Put that sentence under the results in small type, always.

If /api/check is not implemented yet, stub it so the UI still renders fake results for the typed name, but keep the real fetch to /api/check first and fall back only if the request fails. Do not invent a live domain API of your own.

Below the results, a second block: a $9 shareable report. Fields are email and the name they just checked. Button label is Get the $9 report. Checkout is not wired. Never pretend a payment succeeded. On submit, POST /api/save-intent with { email, name }. If that fails, still show: Checkout is not wired yet. No charge. The $9 button must not say Paid or Success.

Visual direction: avoid beige templates, purple gradients, and card grids of feature bullets. Think a late-night indie product: near-black background, one tight column, a big wordmark Stillopen, a one-line line under it (Check if the name is still open), a huge input, one primary button. After a check, results slam in as a tight list, not a table of boxes. Small credit at the bottom: Sable, with a link to https://x.com/sablemakes. No pricing page, no login, no nav, no fake testimonials, no stock photos, no scholarship copy. Do not mention stillopen.vercel.app. Do not copy beUI or any other product's marketing.

Ship the first screen working with that layout and the check interaction.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b956ea0-bad1-4fa1-954e-e2180e2c8e35).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
