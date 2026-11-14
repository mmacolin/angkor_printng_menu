# Angkor Printing — Wholesale Product Catalogue

A mobile-friendly product catalogue for Angkor Printing's wholesalers.

**How it is used**

1. Angkor Printing's team adds products in the admin dashboard (`/admin`).
2. Wholesalers browse the catalogue and share product or catalogue links with their own customers.
3. Customers view products (no account needed) and buy **from the wholesaler**.
4. The wholesaler orders from Angkor Printing through the usual offline channels.

**What it deliberately does not have:** prices of any kind, shopping cart, checkout, payment, order forms or quotation requests.

---

## Features

| Area | What it does |
|---|---|
| **Catalogue** (`/`) | Product grid with search and category filter. Fast on mobile. |
| **Product page** (`/p/<name>`) | Photos, description, specifications, materials, sizes, finishing options, category. Each product has its own shareable link. |
| **Branding** | Angkor Printing logo and name are shown on every page, including shared links. They cannot be switched off (blank values fall back to the defaults). |
| **Sharing** | “Share catalogue” and “Share this product” buttons. Copy link, phone share sheet, WhatsApp, Telegram. |
| **Hide Angkor Printing Contact** | A toggle in the share window. When on, the shared page hides phone, WhatsApp, Telegram, email, address, Facebook, website and all contact buttons — branding stays. |
| **Admin** (`/admin`) | Password login. Add / edit / delete products, drag-and-drop photos, specifications, categories, branding (logo, name, tagline) and contact details. |

### How “Hide Angkor Printing Contact” works

- Links made with the toggle on end in `?hc=1`, e.g. `https://your-site.vercel.app/p/flyers?hc=1`.
- On such a page, contact details are **never downloaded** from the database — they are not in the page, its metadata, structured data or network traffic. They are stored in a separate table (`contact_settings`) from the branding (`brand_settings`) for exactly this reason.
- The setting **sticks for the rest of the browser-tab session**: moving between pages keeps contacts hidden, `?hc=1` is kept in the address bar, and deleting it from the URL does not bring contacts back.
- Anyone sharing *from* a hidden page can only create hidden links (the toggle is locked on).
- `index.html` (the page shell used for every URL and for link previews) contains no contact details.

> Tip for wholesalers: if you open one of your own hidden links in a tab, that tab stays in hidden mode. Open the catalogue in a new tab to see contacts again.

**Limits to be aware of:** this hides Angkor Printing's details from the customer's view; it is not a secret. Contact details are public on the normal catalogue, so a customer who already knows the normal address can still find them. Also, don't type phone numbers or addresses into product descriptions — those are shown on every page.

---

## Setup (about 20 minutes)

### 1. Create a free Supabase project

1. Go to <https://supabase.com>, sign up and click **New project**.
2. Choose a name (e.g. `angkor-catalogue`), a database password, and the region closest to Cambodia (e.g. **Southeast Asia (Singapore)**).
3. Wait for the project to finish setting up.

### 2. Create the database tables

1. In Supabase, open **SQL Editor → New query**.
2. Copy everything in [`supabase/schema.sql`](supabase/schema.sql), paste it in and click **Run**.

This creates the tables, the `product-images` storage bucket and the security rules:

- The public can only **read** published products, categories, branding and contacts.
- Only users on the **admin list** can create, edit or delete products, categories and settings, or upload images. Simply having a login is not enough.

### 3. Turn off public sign-ups

**Authentication → Sign In / Providers → Email**: keep Email enabled and switch off **Allow new users to sign up**. (Even if someone signs up, they get no admin access — this just keeps the user list clean.)

### 4. Add team members

1. **Authentication → Users → Add user → Create new user**. Enter the staff member's email and a password, tick **Auto Confirm User**.
2. Give them admin access in **SQL Editor**:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'staff@example.com';
   ```

To remove access: `delete from public.admins where user_id = (select id from auth.users where email = 'staff@example.com');`

### 5. Add your keys

In Supabase, open **Project Settings → API** (or **API Keys**). Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co        # Project URL
VITE_SUPABASE_ANON_KEY=eyJ...                      # anon / public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                   # service_role key — ONLY for the seed script
```

The anon key is safe in the browser (security rules protect the data). **Never** put the service-role key in Vercel or commit it.

### 6. Run locally

Requires Node.js 18 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually <http://localhost:5173>). Admin is at `/admin`.

Without a `.env` file the site runs in **demo mode** with 12 placeholder products, and admin shows a “not connected” notice.

---

## Adding products

### Option A — admin dashboard

Go to `/admin`, sign in, click **Add product**. Drag photos in, fill in the details and save. The first photo is the cover.

- **Available** off → shows “Currently unavailable”.
- **Visible** off → hidden from the catalogue (good for seasonal items).
- **Delete** removes the product and its photos permanently; links already shared to it stop working.

### Option B — import a spreadsheet (one-time)

1. Fill in [`products_template.csv`](products_template.csv) and save it as `products.csv` in this folder.
2. Put the photos in an `images/` folder next to it.
3. Check it first, then import:

```bash
npm run seed -- --csv products.csv --dry-run
```

```bash
npm run seed -- --csv products.csv
```

To load the placeholder products into Supabase instead (to try the admin before your real data is ready):

```bash
npm run seed -- --placeholder
```

Re-running the import is safe: products are matched by SKU (or by name if there is no SKU) and updated. `products.csv` and `images/` are in `.gitignore` so they are not committed by accident.

#### CSV columns

Separate multiple values with `|`. Wrap a cell in double quotes if it contains a comma. In Excel use **Save As → CSV UTF-8**.

| Column | Required | Example |
|---|---|---|
| `sku` | Recommended | `BC-STD` |
| `name` | Yes | `Standard Business Cards` |
| `category` | Yes | `Business Cards` (created automatically) |
| `description` | No | `"Crisp full-colour cards, single or double sided."` |
| `specifications` | No | `Paper weight: 350 gsm\|Minimum quantity: 100 cards` |
| `materials` | No | `Art card 350gsm\|Matte card 350gsm` |
| `sizes` | No | `90 × 54 mm\|85 × 55 mm` |
| `finishing_options` | No | `Matte lamination\|Spot UV` |
| `image_files` | No | `BC-STD.jpg\|BC-STD-back.jpg` (files in `images/`) |
| `in_stock` | No | `TRUE` / `FALSE` (default TRUE) |

There is no price column, on purpose.

---

## Deploy to Vercel

1. Push this repository to GitHub (already done if you are reading this there).
2. Go to <https://vercel.com>, sign in with GitHub, click **Add New → Project** and import `angkor_printng_menu`.
3. Vercel detects **Vite** automatically (build: `npm run build`, output: `dist`).
4. Under **Environment Variables**, add **only**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. Your catalogue is live at `https://<project>.vercel.app`, admin at `/admin`.

`vercel.json` makes product links like `/p/flyers` work on refresh, marks `/admin` as not-for-search-engines and caches built assets.

To use your own domain: Vercel project → **Settings → Domains**.

After changing environment variables, redeploy (Deployments → ⋯ → Redeploy).

---

## Project structure

```
supabase/schema.sql        Tables, storage bucket, row-level security
scripts/seed.mjs           CSV / placeholder import
products_template.csv      CSV template
public/logo.png            Default Angkor Printing logo
src/
  lib/api.ts               All database calls (falls back to placeholder data in demo mode)
  lib/site.tsx             Branding, contacts and the hide-contact logic
  components/              Header, Footer, ShareDialog, ContactLinks, ProductCard…
  pages/                   Catalogue and product pages
  admin/                   Admin dashboard (loaded only on /admin)
  data/placeholder.json    Placeholder products
```

Tech: React 18, Vite 6, Tailwind CSS 4, Supabase (Postgres, Storage, Auth), React Router.
