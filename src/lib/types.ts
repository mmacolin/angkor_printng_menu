export interface Spec {
  label: string;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

/** A catalogue product. There is intentionally no price field. */
export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  category_id: string | null;
  description: string;
  specifications: Spec[];
  materials: string[];
  sizes: string[];
  finishing_options: string[];
  images: string[];
  in_stock: boolean;
  is_published: boolean;
  sort_order: number;
}

export type ProductInput = Omit<Product, 'id'> & { id?: string };

export interface Brand {
  brand_name: string;
  tagline: string;
  logo_url: string | null;
}

export interface Contacts {
  phone: string;
  whatsapp: string;
  telegram: string;
  email: string;
  address: string;
  facebook: string;
  website: string;
}

export const EMPTY_CONTACTS: Contacts = {
  phone: '',
  whatsapp: '',
  telegram: '',
  email: '',
  address: '',
  facebook: '',
  website: '',
};
