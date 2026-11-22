# Angkor Printing — Wholesale Product Catalogue

A simple, mobile-friendly product catalogue in English and Khmer.

```
Angkor Printing (admin)  →  Wholesaler  →  Customer
 manages products          sees everything    sees the same products,
 in /admin                 + shares links     without Angkor Printing's
                                              name, logo or contacts
```

1. **Angkor Printing** manages products, photos, categories and descriptions (English + Khmer) in the private dashboard at `/admin`.
2. **Wholesalers** open the normal website. They see the full catalogue with Angkor Printing's name, logo and contact details, and can copy and share product (or catalogue) links.
3. **Customers** open the wholesaler's link. They see the same product information, but Angkor Printing's name, logo and contact details are automatically hidden. Customers buy from the wholesaler; the wholesaler orders from Angkor Printing separately.

There is **one product database**. Wholesalers and customers see the same products — only what is *shown* differs.

**Not included, on purpose:** prices of any kind, shopping cart, checkout, payment, order forms or quotation requests.

---

## What each person sees

| | Wholesaler (normal link) | Customer (shared link) |
|---|---|---|
| Products, photos, descriptions, specifications, materials, sizes, finishing options, categories | ✅ | ✅ same |
| English / ខ្មែរ switch | ✅ | ✅ |
| Angkor Printing name and logo | ✅ | ❌ hidden |
| Phone, WhatsApp, Telegram, email, address, Facebook, website | ✅ | ❌ hidden |
| Share buttons | ✅ | ❌ |
| Prices / ordering | ❌ | ❌ |

### How shared links work

- Every link made with a **Share** button opens the customer view. It ends in `?s=1` (plus `&lang=km` if the wholesaler was viewing in Khmer), e.g. `https://your-site.vercel.app/p/flyers?s=1`.
- In the customer view the branding and contact details are **never downloaded** — they are not in the page, the browser-tab title, the tab icon, the page metadata or the network traffic. The site's public code and `index.html` (which WhatsApp/Telegram read for link previews) contain no company name either.
- The customer view **sticks for the rest of the browser-tab session**: moving between pages keeps it, `?s=1` stays in the address bar (so a link the customer copies is also a customer link), and deleting `?s=1` by hand does not bring the branding back.

> **Tip for wholesalers:** if you open one of your own shared links, that browser tab stays in customer view. Open the website in a new tab to see the normal view again.

**Be aware:** this hides Angkor Printing from what the customer sees; it is not a secret. Anyone who visits the normal website address sees the full details. Also keep the company name, phone numbers and addresses **out of product descriptions and photos** — product content is shown to customers as-is.

### English and Khmer

- The **EN | ខ្មែរ** switch is in the header. The choice is remembered on that device.
- In the admin, each product has an **English** tab and a **ខ្មែរ Khmer** tab. Any Khmer field left empty shows the English text, so you can translate gradually.
- Categories, brand name, tagline and address also have Khmer versions.
- Search finds products in either language.

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

Without a `.env` file the site runs in **demo mode** with 12 placeholder products (Khmer text is a draft translation), and admin shows a “not connected” notice. Add `?s=1` to any address to see the customer view, e.g. <http://localhost:5173/?s=1>.

---

## Adding products

### Option A — admin dashboard

Go to `/admin`, sign in, click **Add product**. Drag photos in, fill in the **English** tab, then the **ខ្មែរ Khmer** tab, and save. The first photo is the cover.

**Photos:** use **landscape photos, ideally 4:3** (e.g. 1200 × 900 px), JPG or WebP, under 5 MB. Catalogue cards and the product page show photos in 4:3, so other shapes are trimmed at the edges there; the full-screen viewer (tap a photo) always shows the whole photo. Keep important details — like a product code printed on the photo — away from the edges.

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

**Khmer columns (all optional):** `name_km`, `category_km`, `description_km`, `specifications_km`, `materials_km`, `sizes_km`, `finishing_options_km` — same format as the English column. Empty ones show the English text.

There is no price column, on purpose.

---

## Deploy to Vercel

1. Push this repository to GitHub (already done if you are reading this there).
2. Go to <https://vercel.com>, sign in with GitHub, click **Add New → Project** and import `angkor_printng_menu`.
3. Vercel detects **Vite** automatically (build: `npm run build`, output: `dist`).
4. Under **Environment Variables**, add **only**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. Your catalogue is live at <https://angkorprintngmenu.vercel.app>, admin at `/admin`. (The Vercel project must be named `angkorprintngmenu` so it gets this address.)

`vercel.json` makes product links like `/p/flyers` work on refresh, marks `/admin` as not-for-search-engines and caches built assets.

### One public address: `https://angkorprintngmenu.vercel.app`

- **Share links** always use `https://angkorprintngmenu.vercel.app`, even if a wholesaler opened the site from another address. (Change it with `VITE_SITE_URL`.)
- **Every other address** of the Vercel project — preview deployments such as `angkorprintngmenu-git-….vercel.app` and any other alias — **redirects** to `https://angkorprintngmenu.vercel.app` (rule at the top of `vercel.json`).
- Because previews redirect, check changes locally (`npm run dev`) or after merging. To allow previews again, delete the `redirects` block in `vercel.json`.
- If you later add a custom domain, put it in both places: `VITE_SITE_URL` in Vercel's environment variables, and the two `angkorprintngmenu.vercel.app` values in `vercel.json`.

> ⚠️ **The address contains “angkor”.** Customers see the link they open, so `angkorprintngmenu.vercel.app` reveals the Angkor name even though the page hides it. For fully unbranded customer links, use a neutral address (e.g. a free `*.vercel.app` name like `print-catalogue-kh.vercel.app`, or your own neutral domain) and set it as above.

To use your own domain: Vercel project → **Settings → Domains**.

After changing environment variables, redeploy (Deployments → ⋯ → Redeploy).

---

## Project structure

```
supabase/schema.sql        Tables, storage bucket, row-level security
scripts/seed.mjs           CSV / placeholder import
products_template.csv      CSV template
public/logo.png            Default Angkor Printing logo (wholesaler view only)
public/catalogue-icon.svg  Neutral browser-tab icon
src/
  lib/api.ts               All database calls (falls back to placeholder data in demo mode)
  lib/site.tsx             Wholesaler vs customer view (branding/contacts visibility)
  lib/i18n.tsx             English/Khmer text and language switcher
  components/              Header, Footer, ShareDialog, ContactLinks, ProductCard…
  pages/                   Catalogue and product pages
  admin/                   Admin dashboard (loaded only on /admin)
  data/placeholder.json    Placeholder products
```

Tech: React 18, Vite 6, Tailwind CSS 4, Supabase (Postgres, Storage, Auth), React Router.
