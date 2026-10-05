// Modèles Réservation et Statistiques

export type StatutReservation = 'CONFIRMEE' | 'ACTIVE' | 'TERMINEE' | 'ANNULEE' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Reservation {
  id: number;
  // Champs Express / PostgreSQL
  id_user?: number;
  id_place?: number;
  debut?: string; // Date ISO
  fin?: string;   // Date ISO
  montant_total?: number;
  statut?: StatutReservation | string;
  code_qr?: string;
  date_creation?: string;

  // Données jointes Express
  id_parking?: number;
  nom_parking?: string;
  adresse_parking?: string;
  image_url?: string;
  numero_place?: string;
  type_place?: string;
  nom_utilisateur?: string;
  email_utilisateur?: string;

  // Propriétés de compatibilité pour l'interface UI
  reservationNumber?: string;
  parkingName?: string;
  parkingAddress?: string;
  spaceNumber?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: number;
  status?: StatutReservation | string;
  qrCode?: string;
  qrCodeData?: string;
  durationHours?: number;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
  imageUrl?: string;
}

export interface CreateReservationDto {
  id_place: number;
  debut: string;
  duree_heures: number;
  placeId?: number;
  startTime?: string;
  durationHours?: number;
}

export interface StatsParking {
  parking: {
    id: number;
    nom: string;
    prix_heure: number;
  };
  places: {
    total: number;
    libres: number;
    occupees: number;
    hors_service: number;
    taux_occupation_pourcentage: number;
  };
  finances: {
    total_reservations: number;
    revenus_totaux: number;
  };
  historique_7_jours: {
    date: string;
    reservations: number;
    revenus: number;
  }[];
}
