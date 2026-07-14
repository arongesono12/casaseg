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
  rating: number;
  reviewCount: number;
  category: 'Apartamentos' | 'Casas' | 'Estudios';
  isNew?: boolean;
  isOccupied?: boolean;
  amenities: string[];
  ownerName: string;
  legalStatus: 'verified' | 'pending' | 'restricted';
  coordinates?: { latitude: number; longitude: number };
};
