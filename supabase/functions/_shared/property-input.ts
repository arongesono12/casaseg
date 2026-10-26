import { InputError } from './http.ts';
import { number, stringArray, text } from './validate.ts';

const priceTypes = new Set(['per_month', 'per_night', 'sale']);

type FeeAmounts = {
  serviceFeeAmount: number;
  cleaningFeeAmount: number;
  taxAmount: number;
  securityDepositAmount: number;
};

function feeAmount(value: unknown, label: string): number {
  const amount = number(value, label, 0, 10_000_000_000);
  if (!Number.isSafeInteger(amount)) throw new InputError(`${label} debe ser un importe entero en FCFA.`);
  return amount;
}

export type CreatePropertyInput = {
  title: string;
  description: string;
  location: string;
  /** Forma de public.properties.coordinates, la misma que escribe y lee la web. */
  coordinates: { lat: number; lng: number };
  price: number;
  fees: FeeAmounts;
  priceType: 'per_month' | 'per_night' | 'sale';
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  imagePaths: string[];
};

export type UpdatePropertyInput = Pick<CreatePropertyInput, 'title' | 'description' | 'price'> & {
  propertyId: string;
  fees: Partial<FeeAmounts>;
};

export function parseCreatePropertyInput(body: Record<string, unknown>): CreatePropertyInput {
  const priceType = text(body.price_type, 'Modalidad de precio', 1, 30);
  if (!priceTypes.has(priceType)) throw new InputError('La modalidad de precio no es válida.');
  const coordinates = body.coordinates;
  if (!coordinates || typeof coordinates !== 'object' || Array.isArray(coordinates)) {
    throw new InputError('Selecciona la ubicación de la vivienda en el mapa.');
  }
  // El selector de la app envía { latitude, longitude }; se acepta también
  // { lat, lng } y se guarda siempre así, porque es lo que lee la web.
  const point = coordinates as Record<string, unknown>;
  const lat = point.lat ?? point.latitude;
  const lng = point.lng ?? point.longitude;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90
    || typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new InputError('Las coordenadas de la vivienda no son válidas.');
  }

  return {
    title: text(body.title, 'Título', 3, 140),
    description: text(body.description, 'Descripción', 10, 5000),
    location: text(body.location, 'Ubicación', 2, 240),
    coordinates: { lat, lng },
    price: number(body.price, 'Precio', 1, 10_000_000_000),
    fees: {
      serviceFeeAmount: feeAmount(body.service_fee_amount ?? 0, 'Servicio'),
      cleaningFeeAmount: feeAmount(body.cleaning_fee_amount ?? 0, 'Limpieza'),
      taxAmount: feeAmount(body.tax_amount ?? 0, 'Impuestos'),
      securityDepositAmount: feeAmount(body.security_deposit_amount ?? 0, 'Depósito/fianza'),
    },
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
    fees: {
      ...(body.service_fee_amount !== undefined && { serviceFeeAmount: feeAmount(body.service_fee_amount, 'Servicio') }),
      ...(body.cleaning_fee_amount !== undefined && { cleaningFeeAmount: feeAmount(body.cleaning_fee_amount, 'Limpieza') }),
      ...(body.tax_amount !== undefined && { taxAmount: feeAmount(body.tax_amount, 'Impuestos') }),
      ...(body.security_deposit_amount !== undefined && { securityDepositAmount: feeAmount(body.security_deposit_amount, 'Depósito/fianza') }),
    },
  };
}
