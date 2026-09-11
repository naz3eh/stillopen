# Stillopen

A small name check. Type a product name. See if it still looks open.

Stillopen is the product. The maker is Sable.

The frontend is Next.js. It uses beUI Button, Input, and Animated Badge copied from https://beui.dev. Those components are open-source copy-paste under `components/motion`. Stillopen is not a beUI site.

A free check looks up public DNS and the public GitHub API. Results stay on screen. They are not stored.

## Run

Needs Node 18 or newer.

```bash
npm install && npm run dev
```

Nazeeh deploys manually. There is no live Stillopen URL in this repo.

## What a check does

The name is trimmed and lowercased. Empty names, spaces, dots, and characters that are not valid in a domain label are rejected, with a reason. A label is at most 63 characters, and cannot start or end with a hyphen.

For a valid name the app checks:

- DNS nameserver lookup for `name.com`, `name.io`, `name.dev`, `name.app`, `name.co`
- GitHub user or org existence at the public GitHub API, with no token

Results are only `taken`, `open`, or `couldnt-check`.

Open means the public lookup found nothing. A domain can be registered and still have no DNS. This is not a registrar availability check.

The page calls `POST /api/check` and `POST /api/save-intent`. Both routes use `lib/check.js`.

## Payments (not wired)

The page shows a **$9** shareable-report form. That UI is real. Checkout is not connected. The save path does not take a card, does not mark anything paid, and does not create a shareable report.

`POST /api/save-intent` accepts JSON `{ name, email }` and answers honestly:

- If `CHECKOUT_URL` is not a real `https` URL: checkout is not wired, nothing was charged, nothing was saved as a shareable report.
- If `CHECKOUT_URL` is a real `https` URL: the response includes that URL as a link only. Nothing is paid. Opening the link is not a payment confirmation, and no report is saved.

The endpoint does not write a pending note. Do not treat a local file as if a report was created.

To wire checkout later, set a $9 one-time Lemon Squeezy or Stripe Payment Link in the environment. Still do not mark a report paid inside `POST /api/save-intent`. Wait for a webhook that confirms payment, then write the shareable report. Until that exists, every save stays unpaid and unsaved.

## Not included

No blog. No extra products. No accounts. No paid APIs. No API keys. No payment webhook. No saved reports.
