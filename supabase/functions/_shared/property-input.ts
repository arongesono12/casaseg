import { InputError } from './http.ts';
import { number, stringArray, text } from './validate.ts';

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
