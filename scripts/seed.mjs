#!/usr/bin/env node
/**
 * One-time import into Supabase.
 *
 *   npm run seed -- --placeholder                  # load the sample products
 *   npm run seed -- --csv products.csv             # import your CSV (photos from ./images)
 *   npm run seed -- --csv products.csv --images path/to/images
 *   add --dry-run to check the CSV without writing anything
 *
 * Re-running is safe: products are matched by SKU (or name if no SKU) and updated.
 * Khmer columns (name_km, description_km, …) are optional; empty ones show English.
 * Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (service key stays on your computer).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUCKET = 'product-images';

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const usePlaceholder = flag('placeholder');
const csvPath = opt('csv', null);
const imagesDir = path.resolve(opt('images', 'images'));
const dryRun = flag('dry-run');

if (!usePlaceholder && !csvPath) {
  console.log('Usage: npm run seed -- --placeholder | --csv products.csv [--images images] [--dry-run]');
  process.exit(1);
}

// ---------------------------------------------------------------- helpers
const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const list = (v) =>
  String(v ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

/** "Paper weight: 350gsm | Print: Full colour" → [{label, value}] */
const specs = (v) =>
  list(v).map((pair) => {
    const i = pair.indexOf(':');
    return i >= 0 ? { label: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() } : { label: pair, value: '' };
  });

const bool = (v, fallback = true) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  return ['true', 'yes', 'y', '1', 'in stock', 'available'].includes(s);
};

/** Minimal RFC 4180 CSV parser (handles quotes, commas and newlines inside quotes, BOM). */
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim()));
  const headers = nonEmpty.shift().map((h) => h.trim().toLowerCase());
  return { headers, records: nonEmpty.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

// ---------------------------------------------------------------- load input
let categoriesIn = [];
let productsIn = [];
let contactsIn = null;

if (usePlaceholder) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/placeholder.json'), 'utf8'));
  categoriesIn = data.categories;
  productsIn = data.products.map((p) => ({ ...p, category_km: data.categories.find((c) => c.name === p.category)?.name_km ?? '', image_files: [] }));
  contactsIn = data.contacts;
} else {
  const { headers, records } = parseCsv(fs.readFileSync(path.resolve(csvPath), 'utf8'));
  const required = ['name', 'category'];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    console.error(`CSV is missing required column(s): ${missing.join(', ')}. Found: ${headers.join(', ')}`);
    process.exit(1);
  }
  productsIn = records.map((r, i) => ({
    row: i + 2,
    sku: r.sku || null,
    name: r.name,
    name_km: r.name_km ?? '',
    category: r.category,
    category_km: r.category_km ?? '',
    description: r.description ?? '',
    description_km: r.description_km ?? '',
    specifications: specs(r.specifications),
    specifications_km: specs(r.specifications_km),
    materials: list(r.materials),
    materials_km: list(r.materials_km),
    sizes: list(r.sizes),
    sizes_km: list(r.sizes_km),
    finishing_options: list(r.finishing_options ?? r.finishing),
    finishing_options_km: list(r.finishing_options_km),
    image_files: list(r.image_files ?? r.image_file ?? r.images),
    in_stock: bool(r.in_stock),
  }));
  const names = [...new Set(productsIn.map((p) => p.category).filter(Boolean))];
  categoriesIn = names.map((name, i) => ({
    name,
    name_km: productsIn.find((p) => p.category === name && p.category_km)?.category_km ?? '',
    sort_order: i + 1,
  }));
}

// ---------------------------------------------------------------- validate
const problems = [];
const seen = new Set();
for (const p of productsIn) {
  const where = p.row ? `row ${p.row}` : p.name;
  if (!p.name) problems.push(`${where}: missing name`);
  const key = (p.sku || p.name || '').toLowerCase();
  if (seen.has(key)) problems.push(`${where}: duplicate SKU/name "${p.sku || p.name}"`);
  seen.add(key);
  for (const f of p.image_files) {
    if (!fs.existsSync(path.join(imagesDir, f))) problems.push(`${where}: image not found: ${path.join(imagesDir, f)}`);
  }
}

console.log(`Found ${productsIn.length} products in ${categoriesIn.length} categories.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
}
if (dryRun) {
  console.log('\nDry run — nothing was written.');
  process.exit(problems.length ? 1 : 0);
}
if (problems.some((p) => p.includes('missing name') || p.includes('duplicate'))) {
  console.error('\nFix the problems above and run again.');
  process.exit(1);
}

// ---------------------------------------------------------------- write
const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureCategories() {
  const { data: existing, error } = await db.from('categories').select('id,name,name_km');
  if (error) throw error;
  const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));
  // Fill in a missing Khmer name on existing categories.
  for (const c of categoriesIn) {
    const found = existing.find((e) => e.name.toLowerCase() === c.name.toLowerCase());
    if (found && c.name_km && !found.name_km) await db.from('categories').update({ name_km: c.name_km }).eq('id', found.id);
  }
  const toInsert = categoriesIn.filter((c) => !byName.has(c.name.toLowerCase()));
  if (toInsert.length) {
    const { data, error: insErr } = await db.from('categories').insert(toInsert).select('id,name');
    if (insErr) throw insErr;
    data.forEach((c) => byName.set(c.name.toLowerCase(), c.id));
  }
  return byName;
}

async function uploadFile(file) {
  const full = path.join(imagesDir, file);
  const ext = path.extname(file).toLowerCase();
  const storagePath = `products/${slugify(path.basename(file, ext))}-${Date.now().toString(36)}${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(storagePath, fs.readFileSync(full), {
    contentType: MIME[ext] || 'application/octet-stream',
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw error;
  return db.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

const categoryIds = await ensureCategories();
let created = 0;
let updated = 0;
let failed = 0;

for (const [i, p] of productsIn.entries()) {
  try {
    const images = [];
    for (const f of p.image_files) {
      if (fs.existsSync(path.join(imagesDir, f))) images.push(await uploadFile(f));
    }
    const record = {
      sku: p.sku,
      name: p.name,
      name_km: p.name_km ?? '',
      slug: slugify(p.sku ? `${p.name}-${p.sku}` : p.name),
      category_id: categoryIds.get(String(p.category).toLowerCase()) ?? null,
      description: p.description,
      description_km: p.description_km ?? '',
      specifications: p.specifications,
      specifications_km: p.specifications_km ?? [],
      materials: p.materials,
      materials_km: p.materials_km ?? [],
      sizes: p.sizes,
      sizes_km: p.sizes_km ?? [],
      finishing_options: p.finishing_options,
      finishing_options_km: p.finishing_options_km ?? [],
      in_stock: p.in_stock,
      sort_order: i,
    };
    if (images.length) record.images = images;

    const match = p.sku ? db.from('products').select('id').eq('sku', p.sku) : db.from('products').select('id').eq('name', p.name);
    const { data: found, error: findErr } = await match.maybeSingle();
    if (findErr) throw findErr;

    if (found) {
      delete record.slug; // keep existing links working
      const { error } = await db.from('products').update(record).eq('id', found.id);
      if (error) throw error;
      updated++;
    } else {
      const { error } = await db.from('products').insert(record);
      if (error) throw error;
      created++;
    }
    process.stdout.write(`\r${created + updated + failed}/${productsIn.length} done`);
  } catch (e) {
    failed++;
    console.error(`\nFailed: ${p.name} — ${e.message}`);
  }
}

if (contactsIn) {
  // Only fill placeholder contacts into an empty contact row — never overwrite real details.
  const { data: current } = await db.from('contact_settings').select('*').eq('id', 1).maybeSingle();
  const isEmpty = !current || ['phone', 'whatsapp', 'telegram', 'email', 'address'].every((k) => !current[k]);
  if (isEmpty) {
    const { error } = await db.from('contact_settings').update(contactsIn).eq('id', 1);
    if (error) console.error('Could not set placeholder contacts:', error.message);
  }
}

console.log(`\n\nFinished: ${created} added, ${updated} updated, ${failed} failed.`);
process.exit(failed ? 1 : 0);
