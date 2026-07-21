import { InputError } from './http.ts';

const priceTypes = new Set(['per_month', 'per_night', 'sale']);

export type CreatePropertyInput = {
  title: string;
  description: string;
  location: string;
  price: number;
  priceType: 'per_month' | 'per_night' | 'sale';
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  imagePaths: string[];
};

export type UpdatePropertyInput = Pick<CreatePropertyInput, 'title' | 'description' | 'price'> & {
  propertyId: string;
};

function text(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== 'string') throw new InputError(`${field} es obligatorio.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new InputError(`${field} debe tener entre ${min} y ${max} caracteres.`);
  }
  return normalized;
}

function number(value: unknown, field: string, min: number, max: number) {
  const normalized = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(normalized) || normalized < min || normalized > max) {
    throw new InputError(`${field} debe ser un número entre ${min} y ${max}.`);
  }
  return normalized;
}

function stringArray(value: unknown, field: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new InputError(`${field} admite un máximo de ${maxItems} elementos.`);
  }
  return value.map((item) => text(item, field, 1, maxLength));
}

export function parseCreatePropertyInput(body: Record<string, unknown>): CreatePropertyInput {
  const priceType = text(body.price_type, 'Modalidad de precio', 1, 30);
  if (!priceTypes.has(priceType)) throw new InputError('La modalidad de precio no es válida.');

  return {
    title: text(body.title, 'Título', 3, 140),
    description: text(body.description, 'Descripción', 10, 5000),
    location: text(body.location, 'Ubicación', 2, 240),
    price: number(body.price, 'Precio', 1, 10_000_000_000),
    priceType: priceType as CreatePropertyInput['priceType'],
    bedrooms: number(body.bedrooms, 'Dormitorios', 0, 50),
    bathrooms: number(body.bathrooms, 'Baños', 0, 50),
    amenities: stringArray(body.amenities ?? [], 'Servicios', 50, 80),
    imagePaths: stringArray(body.image_paths ?? [], 'Imágenes', 10, 500),
  };
}

export function parseUpdatePropertyInput(body: Record<string, unknown>): UpdatePropertyInput {
  return {
    propertyId: text(body.property_id, 'Identificador de propiedad', 1, 100),
    title: text(body.title, 'Título', 3, 140),
    description: text(body.description, 'Descripción', 10, 5000),
    price: number(body.price, 'Precio', 1, 10_000_000_000),
  };
}
