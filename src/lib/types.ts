export interface Spec {
  label: string;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  /** Khmer name (optional — falls back to English). */
  name_km: string;
  sort_order: number;
}

/**
 * A catalogue product. There is intentionally no price field.
 * Each text field has an optional Khmer version (`*_km`) that falls back to English.
 */
export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  name_km: string;
  category_id: string | null;
  description: string;
  description_km: string;
  specifications: Spec[];
  specifications_km: Spec[];
  materials: string[];
  materials_km: string[];
  sizes: string[];
  sizes_km: string[];
  finishing_options: string[];
  finishing_options_km: string[];
  images: string[];
  in_stock: boolean;
  is_published: boolean;
  sort_order: number;
}

export type ProductInput = Omit<Product, 'id'> & { id?: string };

export interface Brand {
  brand_name: string;
  brand_name_km: string;
  tagline: string;
  tagline_km: string;
  logo_url: string | null;
}

export interface Contacts {
  phone: string;
  whatsapp: string;
  telegram: string;
  email: string;
  address: string;
  address_km: string;
  facebook: string;
  website: string;
}

export const EMPTY_CONTACTS: Contacts = {
  phone: '',
  whatsapp: '',
  telegram: '',
  email: '',
  address: '',
  address_km: '',
  facebook: '',
  website: '',
};
