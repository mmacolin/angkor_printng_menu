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

export const DEFAULT_BRAND: Brand = {
  brand_name: 'Angkor Printing',
  tagline: 'Product Catalogue',
  logo_url: null,
};

/** Branding must always be visible: fall back to defaults for any blank field. */
function withBrandDefaults(row: Partial<Brand> | null): Brand {
  return {
    brand_name: row?.brand_name?.trim() || DEFAULT_BRAND.brand_name,
    tagline: row?.tagline?.trim() ?? DEFAULT_BRAND.tagline,
    logo_url: row?.logo_url?.trim() || null,
  };
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured. Add your keys to .env (see README).');
  return supabase;
}

function normalizeProduct(row: Record<string, unknown>): Product {
  const specs = Array.isArray(row.specifications) ? (row.specifications as Spec[]) : [];
  return {
    id: String(row.id),
    slug: String(row.slug),
    sku: (row.sku as string | null) ?? null,
    name: String(row.name ?? ''),
    category_id: (row.category_id as string | null) ?? null,
    description: String(row.description ?? ''),
    specifications: specs.filter((s) => s && (s.label || s.value)),
    materials: (row.materials as string[]) ?? [],
    sizes: (row.sizes as string[]) ?? [],
    finishing_options: (row.finishing_options as string[]) ?? [],
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
  categories: Category[];
  products: Product[];
  contacts: Contacts;
}

let demoData: Promise<DemoData> | null = null;

/** Loaded on demand so placeholder data is never part of the live site's main bundle. */
function demo(): Promise<DemoData> {
  demoData ??= import('../data/placeholder.json').then(({ default: placeholder }) => ({
    categories: placeholder.categories.map((c) => ({ id: slugify(c.name), name: c.name, sort_order: c.sort_order })),
    products: placeholder.products.map((p, i) => ({
      id: slugify(p.name),
      slug: slugify(p.name),
      sku: p.sku,
      name: p.name,
      category_id: slugify(p.category),
      description: p.description,
      specifications: p.specifications,
      materials: p.materials,
      sizes: p.sizes,
      finishing_options: p.finishing_options,
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
  const { data, error } = await db().from('categories').select('id,name,sort_order').order('sort_order').order('name');
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
  if (isDemoMode) return DEFAULT_BRAND;
  const { data, error } = await db().from('brand_settings').select('brand_name,tagline,logo_url').eq('id', 1).maybeSingle();
  if (error) {
    console.warn('Could not load branding, using defaults', error);
    return DEFAULT_BRAND;
  }
  return withBrandDefaults(data);
}

/**
 * Contact details. Only call this when contacts are visible — pages opened from a
 * "Hide Angkor Printing Contact" link never request this data at all.
 */
export async function fetchContacts(): Promise<Contacts> {
  if (isDemoMode) return (await demo()).contacts;
  const { data, error } = await db()
    .from('contact_settings')
    .select('phone,whatsapp,telegram,email,address,facebook,website')
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

export async function saveCategory(cat: { id?: string; name: string; sort_order: number }) {
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
  const { error } = await db()
    .from('brand_settings')
    .update({
      brand_name: brand.brand_name.trim() || DEFAULT_BRAND.brand_name,
      tagline: brand.tagline.trim(),
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
