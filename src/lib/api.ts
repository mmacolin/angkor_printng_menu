import { isDemoMode, supabase, IMAGE_BUCKET } from './supabase';
import type { Brand, Category, Contacts, Product, ProductInput, Spec } from './types';
import { EMPTY_CONTACTS } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Empty until loaded. The company name deliberately does not appear in the public
 * JavaScript (customers download it too); it comes from the database, or from the
 * placeholder file in demo mode.
 */
export const DEFAULT_BRAND: Brand = {
  brand_name: '',
  brand_name_km: '',
  tagline: '',
  tagline_km: '',
  logo_url: null,
};

function withBrandDefaults(row: Partial<Brand> | null): Brand {
  return {
    brand_name: row?.brand_name?.trim() ?? '',
    brand_name_km: row?.brand_name_km?.trim() ?? '',
    tagline: row?.tagline?.trim() ?? '',
    tagline_km: row?.tagline_km?.trim() ?? '',
    logo_url: row?.logo_url?.trim() || null,
  };
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured. Add your keys to .env (see README).');
  return supabase;
}

function cleanSpecs(v: unknown): Spec[] {
  return (Array.isArray(v) ? (v as Spec[]) : []).filter((s) => s && (s.label || s.value));
}

function normalizeProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    sku: (row.sku as string | null) ?? null,
    name: String(row.name ?? ''),
    name_km: String(row.name_km ?? ''),
    category_id: (row.category_id as string | null) ?? null,
    description: String(row.description ?? ''),
    description_km: String(row.description_km ?? ''),
    specifications: cleanSpecs(row.specifications),
    specifications_km: cleanSpecs(row.specifications_km),
    materials: (row.materials as string[]) ?? [],
    materials_km: (row.materials_km as string[]) ?? [],
    sizes: (row.sizes as string[]) ?? [],
    sizes_km: (row.sizes_km as string[]) ?? [],
    finishing_options: (row.finishing_options as string[]) ?? [],
    finishing_options_km: (row.finishing_options_km as string[]) ?? [],
    images: (row.images as string[]) ?? [],
    in_stock: row.in_stock !== false,
    is_published: row.is_published !== false,
    sort_order: Number(row.sort_order ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Placeholder data (used when Supabase is not connected)
// ---------------------------------------------------------------------------

interface DemoData {
  brand: Brand;
  categories: Category[];
  products: Product[];
  contacts: Contacts;
}

let demoData: Promise<DemoData> | null = null;

/** Loaded on demand so placeholder data is never part of the live site's main bundle. */
function demo(): Promise<DemoData> {
  demoData ??= import('../data/placeholder.json').then(({ default: placeholder }) => ({
    brand: { ...DEFAULT_BRAND, ...placeholder.brand },
    categories: placeholder.categories.map((c) => ({ id: slugify(c.name), name: c.name, name_km: c.name_km, sort_order: c.sort_order })),
    products: placeholder.products.map((p, i) => ({
      id: slugify(p.name),
      slug: slugify(p.name),
      sku: p.sku,
      name: p.name,
      name_km: p.name_km,
      category_id: slugify(p.category),
      description: p.description,
      description_km: p.description_km,
      specifications: p.specifications,
      specifications_km: p.specifications_km,
      materials: p.materials,
      materials_km: [],
      sizes: p.sizes,
      sizes_km: [],
      finishing_options: p.finishing_options,
      finishing_options_km: [],
      images: [],
      in_stock: p.in_stock,
      is_published: true,
      sort_order: i,
    })),
    contacts: { ...EMPTY_CONTACTS, ...placeholder.contacts },
  }));
  return demoData;
}

// ---------------------------------------------------------------------------
// Public catalogue reads
// ---------------------------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  if (isDemoMode) return (await demo()).categories;
  const { data, error } = await db().from('categories').select('id,name,name_km,sort_order').order('sort_order').order('name');
  if (error) throw error;
  return data as Category[];
}

/** Published products only (enforced by RLS for the public as well). */
export async function fetchProducts(): Promise<Product[]> {
  if (isDemoMode) return (await demo()).products;
  const { data, error } = await db()
    .from('products')
    .select('*')
    .eq('is_published', true)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  if (isDemoMode) return (await demo()).products.find((p) => p.slug === slug) ?? null;
  const { data, error } = await db().from('products').select('*').eq('slug', slug).eq('is_published', true).maybeSingle();
  if (error) throw error;
  return data ? normalizeProduct(data) : null;
}

export async function fetchBrand(): Promise<Brand> {
  if (isDemoMode) return (await demo()).brand;
  const { data, error } = await db().from('brand_settings').select('brand_name,brand_name_km,tagline,tagline_km,logo_url').eq('id', 1).maybeSingle();
  if (error) {
    console.warn('Could not load branding, using defaults', error);
    return DEFAULT_BRAND;
  }
  return withBrandDefaults(data);
}

/**
 * Contact details. Only requested in the wholesaler view — customer pages
 * (opened from a shared link) never request this data at all.
 */
export async function fetchContacts(): Promise<Contacts> {
  if (isDemoMode) return (await demo()).contacts;
  const { data, error } = await db()
    .from('contact_settings')
    .select('phone,whatsapp,telegram,email,address,address_km,facebook,website')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return { ...EMPTY_CONTACTS, ...(data ?? {}) };
}

// ---------------------------------------------------------------------------
// Admin (requires a signed-in user listed in public.admins — enforced by RLS)
// ---------------------------------------------------------------------------

export async function adminFetchProducts(): Promise<Product[]> {
  const { data, error } = await db().from('products').select('*').order('sort_order').order('name');
  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const { id, ...fields } = input;
  const payload = {
    ...fields,
    sku: fields.sku?.trim() || null,
    slug: fields.slug?.trim() || slugify(fields.name),
    specifications: fields.specifications.filter((s) => s.label.trim() || s.value.trim()),
    specifications_km: fields.specifications_km.filter((s) => s.label.trim() || s.value.trim()),
  };
  const query = id
    ? db().from('products').update(payload).eq('id', id).select('*').single()
    : db().from('products').insert(payload).select('*').single();
  const { data, error } = await query;
  if (error) {
    if (error.code === '23505') throw new Error('Another product already uses this SKU or link name. Please change it.');
    throw error;
  }
  return normalizeProduct(data);
}

export async function setProductField(id: string, patch: Partial<Pick<Product, 'in_stock' | 'is_published'>>) {
  const { error } = await db().from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(product: Product) {
  const { error } = await db().from('products').delete().eq('id', product.id);
  if (error) throw error;
  await removeStoredImages(product.images);
}

/** Uploads a file to Storage and returns its public URL. */
export async function uploadImage(file: File, folder: 'products' | 'brand' = 'products'): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db().storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return db().storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort removal of images that live in our bucket. External URLs are ignored. */
export async function removeStoredImages(urls: string[]) {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const paths = urls
    .map((u) => (u.includes(marker) ? decodeURIComponent(u.split(marker)[1]) : null))
    .filter((p): p is string => !!p);
  if (!paths.length) return;
  const { error } = await db().storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.warn('Some images could not be removed from storage', error);
}

export async function saveCategory(cat: { id?: string; name: string; name_km: string; sort_order: number }) {
  const { id, ...fields } = cat;
  const { error } = id
    ? await db().from('categories').update(fields).eq('id', id)
    : await db().from('categories').insert(fields);
  if (error) {
    if (error.code === '23505') throw new Error('A category with this name already exists.');
    throw error;
  }
}

export async function deleteCategory(id: string) {
  const { error } = await db().from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function saveBrand(brand: Brand) {
  if (!brand.brand_name.trim()) throw new Error('Please enter the brand name.');
  const { error } = await db()
    .from('brand_settings')
    .update({
      brand_name: brand.brand_name.trim(),
      brand_name_km: brand.brand_name_km.trim(),
      tagline: brand.tagline.trim(),
      tagline_km: brand.tagline_km.trim(),
      logo_url: brand.logo_url || null,
    })
    .eq('id', 1);
  if (error) throw error;
}

export async function saveContacts(contacts: Contacts) {
  const trimmed = Object.fromEntries(Object.entries(contacts).map(([k, v]) => [k, String(v ?? '').trim()]));
  const { error } = await db().from('contact_settings').update(trimmed).eq('id', 1);
  if (error) throw error;
}
