export type UserRole = 'client' | 'owner' | 'admin' | 'superadmin';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
};

export type Session = {
  accessToken: string;
  user: AppUser;
};

export type PriceType = 'per_night' | 'per_month' | 'sale';

export type Property = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  location: string;
  city: string;
  imageUrls: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  price: number;
  priceType: PriceType;
  serviceFeeAmount?: number;
  cleaningFeeAmount?: number;
  taxAmount?: number;
  securityDepositAmount?: number;
  /** Luz y agua: se cobran con cada pago; 0 si no van con el alquiler. */
  electricityFeeAmount?: number;
  waterFeeAmount?: number;
  rating: number;
  reviewCount: number;
  category: 'Apartamentos' | 'Casas' | 'Estudios';
  isNew?: boolean;
  isOccupied?: boolean;
  amenities: string[];
  ownerName: string;
  ownerAvatar?: string;
  legalStatus: 'verified' | 'pending' | 'restricted';
  /** public.properties.status: una vivienda nueva queda en 'pending' hasta verificar su propiedad. */
  status?: string;
  ownershipVerificationStatus?: PropertyOwnershipStatus;
  coordinates?: { latitude: number; longitude: number };
};

/**
 * Verificación de la propiedad por vivienda (migración web
 * 20261029120000_property_ownership_verification). 'exempt': publicada antes
 * de la verificación o por un administrador.
 */
export type PropertyOwnershipStatus = 'exempt' | 'missing' | 'pending' | 'approved' | 'rejected';
export type PropertyOwnershipRoute = 'registry' | 'notarial' | 'developer';
export type PropertyOwnershipDocumentKind = 'registry_certificate' | 'public_deed' | 'award_contract' | 'settlement_certificate' | 'handover_record';
export type PropertyOwnershipReviewResult = 'pending' | 'valid' | 'invalid';

export type PropertyOwnershipDocument = {
  id: string;
  kind: PropertyOwnershipDocumentKind;
  storagePath: string;
  issuedOn: string | null;
  reviewResult: PropertyOwnershipReviewResult;
  reviewNote: string | null;
};

export type PropertyOwnershipVerification = {
  id: string;
  propertyId: string;
  ownerId: string;
  route: PropertyOwnershipRoute;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  documents: PropertyOwnershipDocument[];
  // Solo en la cola del superadmin (list_property_ownership_verifications).
  propertyTitle?: string;
  propertyLocation?: string;
  propertyStatus?: string;
  ownerName?: string;
  ownerEmail?: string;
};
