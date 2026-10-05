// ====================================================================
// CONTRÔLEUR DES STATISTIQUES (Stats Controller)
// Taux d'occupation, revenus et métriques pour le gestionnaire
// Compatible PostgreSQL réel et pg-mem embarqué
// ====================================================================

const db = require('../config/db');

/**
 * Récupère les statistiques d'occupation et financières d'un parking
 * GET /api/stats/parking/:id
 */
async function getStatsParking(req, res) {
  try {
    const { id } = req.params;

    // 1. Vérifier l'existence du parking
    const parkingRes = await db.query('SELECT id, nom, prix_heure, id_gestionnaire FROM parkings WHERE id = $1', [id]);
    if (parkingRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Parking introuvable.'
      });
    }

    if (parkingRes.rows[0].id_gestionnaire !== req.user.id) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez consulter que les statistiques de vos propres parkings.'
      });
    }

    const parking = parkingRes.rows[0];

    // 2. Compter les places par statut
    const placesRes = await db.query('SELECT id, statut FROM places WHERE id_parking = $1', [id]);
    const places = placesRes.rows;
    const totalPlaces = places.length;
    const libres = places.filter(p => p.statut === 'libre').length;
    const occupees = places.filter(p => p.statut === 'occupee').length;
    const horsService = places.filter(p => p.statut === 'hors_service').length;
    const tauxOccupation = totalPlaces > 0 ? Math.round((occupees / totalPlaces) * 100 * 10) / 10 : 0;

    // 3. Calcul des réservations et revenus totaux
    const resList = await db.query(`
      SELECT r.id, r.debut, r.montant_total, r.statut
      FROM reservations r
      JOIN places pl ON pl.id = r.id_place
      WHERE pl.id_parking = $1 AND r.statut != 'ANNULEE'
    `, [id]);

    const totalReservations = resList.rows.length;
    const revenusTotaux = resList.rows.reduce((sum, r) => sum + parseFloat(r.montant_total || 0), 0);

    // 4. Statistiques des 7 derniers jours pour les graphiques
    const historique7Jours = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
      const ymd = d.toISOString().slice(0, 10);

      const dayReservations = resList.rows.filter(r => {
        try {
          return new Date(r.debut).toISOString().slice(0, 10) === ymd;
        } catch {
          return false;
        }
      });

      const dayRevenue = dayReservations.reduce((sum, r) => sum + parseFloat(r.montant_total || 0), 0);

      historique7Jours.push({
        date: dayStr,
        reservations: dayReservations.length,
        revenus: Math.round(dayRevenue * 100) / 100
      });
    }

    return res.json({
      succes: true,
      parking: {
        id: parking.id,
        nom: parking.nom,
        prix_heure: parking.prix_heure
      },
      places: {
        total: totalPlaces,
        libres,
        occupees,
        hors_service: horsService,
        taux_occupation_pourcentage: tauxOccupation
      },
      finances: {
        total_reservations: totalReservations,
        revenus_totaux: Math.round(revenusTotaux * 100) / 100
      },
      historique_7_jours: historique7Jours
    });
  } catch (error) {
    console.error('Erreur stats parking :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors du calcul des statistiques.',
      erreur: error.message
    });
  }
}

/**
 * Récupère les statistiques globales du tableau de bord (tous parkings)
 * GET /api/stats/dashboard
 */
async function getDashboardStats(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const isManager = userRole === 'manager';

    const parkingsQuery = isManager
      ? 'SELECT id FROM parkings WHERE id_gestionnaire = $1'
      : 'SELECT id FROM parkings';
    const params = isManager ? [userId] : [];

    const parkingsRes = await db.query(parkingsQuery, params);
    const parkingIds = parkingsRes.rows.map(p => p.id);

    if (parkingIds.length === 0) {
      return res.json({
        succes: true,
        totalParkings: 0,
        totalSpaces: 0,
        availableSpaces: 0,
        occupiedSpaces: 0,
        reservationsToday: 0,
        revenueToday: 0,
        occupancyRatePercentage: 0,
        reservationsByDay: [],
        revenueByDay: [],
        occupancyByHour: []
      });
    }

    // 1. Compteurs globaux (places)
    const placesRes = await db.query(`
      SELECT id, statut, id_parking FROM places
      WHERE id_parking IN (${parkingIds.join(',')})
    `);
    const allPlaces = placesRes.rows;
    const totalSpaces = allPlaces.length;
    const availableSpaces = allPlaces.filter(p => p.statut === 'libre').length;
    const occupiedSpaces = allPlaces.filter(p => p.statut === 'occupee').length;
    const occupancyRate = totalSpaces > 0
      ? Math.round((occupiedSpaces / totalSpaces) * 100 * 10) / 10
      : 0;

    // 2. Réservations
    const resRes = await db.query(`
      SELECT r.id, r.debut, r.montant_total, r.statut
      FROM reservations r
      JOIN places pl ON pl.id = r.id_place
      WHERE pl.id_parking IN (${parkingIds.join(',')})
        AND r.statut != 'ANNULEE'
    `);
    const allRes = resRes.rows;

    const todayYmd = new Date().toISOString().slice(0, 10);
    const todayReservationsList = allRes.filter(r => {
      try {
        return new Date(r.debut).toISOString().slice(0, 10) === todayYmd;
      } catch {
        return false;
      }
    });

    const todayReservationsCount = todayReservationsList.length;
    const todayRevenue = todayReservationsList.reduce((sum, r) => sum + parseFloat(r.montant_total || 0), 0);

    // 3. Historique 7 jours pour les graphiques
    const reservationsByDay = [];
    const revenueByDay = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
      const ymd = d.toISOString().slice(0, 10);

      const dayMatches = allRes.filter(r => {
        try {
          return new Date(r.debut).toISOString().slice(0, 10) === ymd;
        } catch {
          return false;
        }
      });

      const dayRev = dayMatches.reduce((sum, r) => sum + parseFloat(r.montant_total || 0), 0);

      reservationsByDay.push({ date: dayStr, value: dayMatches.length });
      revenueByDay.push({ date: dayStr, value: Math.round(dayRev * 100) / 100 });
    }

    // 4. Occupation par heure d'arrivée (données réelles issues des réservations)
    const occupancyByHour = [];
    const heureLabels = ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];
    const heuresCibles = [8, 10, 12, 14, 16, 18, 20, 22];

    heuresCibles.forEach((h, index) => {
      const nb = allRes.filter(r => {
        try {
          return new Date(r.debut).getHours() === h;
        } catch {
          return false;
        }
      }).length;

      occupancyByHour.push({ heure: heureLabels[index], value: nb });
    });

    return res.json({
      succes: true,
      totalParkings: parkingIds.length,
      totalSpaces,
      availableSpaces,
      occupiedSpaces,
      reservationsToday: todayReservationsCount,
      revenueToday: Math.round(todayRevenue * 100) / 100,
      occupancyRatePercentage: occupancyRate,
      reservationsByDay,
      revenueByDay,
      occupancyByHour
    });
  } catch (error) {
    console.error('Erreur dashboard stats :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors du calcul des statistiques du tableau de bord.',
      erreur: error.message
    });
  }
}

module.exports = {
  getStatsParking,
  getDashboardStats
};
