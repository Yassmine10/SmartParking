// Modèles Parking et Place de parking

export enum StatutPlace {
  LIBRE = 'libre',
  OCCUPEE = 'occupee',
  HORS_SERVICE = 'hors_service'
}

export type TypePlace = 'STANDARD' | 'HANDICAPE' | 'ELECTRIQUE' | 'VIP' | 'HANDICAPPED' | 'ELECTRIC' | string;

export interface Place {
  id: number;
  id_parking?: number;
  parkingId?: number;
  numero: string;
  number?: string;
  statut: StatutPlace | string;
  status?: StatutPlace | string;
  type_place?: TypePlace;
  type?: TypePlace;
  isOccupied?: boolean;
  floor?: number;
}

export type ParkingSpace = Place;

export interface Parking {
  id: number;
  // Format Express
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  prix_heure: number;
  image_url?: string;
  id_gestionnaire?: number;
  nom_gestionnaire?: string;
  email_gestionnaire?: string;
  places_totales?: number;
  total_places?: number;
  places_libres?: number;
  distance_km?: number;
  places?: Place[];
  spaces?: Place[];

  // Compatibilité rétroactive UI / anglais
  name?: string;
  address?: string;
  pricePerHour?: number;
  totalSpaces?: number;
  availableSpaces?: number;
  distanceInKm?: number;
  rating?: number;
  isCovered?: boolean;
  hasChargingStation?: boolean;
  hasDisabledAccess?: boolean;
  description?: string;
  city?: string;
  imageUrl?: string;
  postalCode?: string;
  phoneNumber?: string;
  openingHours?: string;
  openingTime?: string;
  closingTime?: string;
  features?: string;
  status?: string;
}

export interface CreateParkingDto {
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  prix_heure: number;
  image_url?: string;
  imageUrl?: string;
  nombre_places?: number;
  totalSpaces?: number;
  description?: string;
}

export interface ParkingSearchFilter {
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  maxDistanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  isCovered?: boolean;
  hasChargingStation?: boolean;
  hasDisabledAccess?: boolean;
  minAvailableSpaces?: number;
  onlyAvailable?: boolean;
}
