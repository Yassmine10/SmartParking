// ====================================================================
// CONTRÔLEUR DES PLACES (Places Controller)
// Consultation et mise à jour du statut des places (libre, occupée, hors service)
// ====================================================================

const db = require('../config/db');

/**
 * Récupère toutes les places d'un parking
 * GET /api/places/parking/:id_parking
 */
async function getPlacesByParking(req, res) {
  try {
    const { id_parking } = req.params;

    const resultat = await db.query(
      `SELECT id, id_parking, numero, statut, type_place 
       FROM places 
       WHERE id_parking = $1 
       ORDER BY numero ASC`,
      [id_parking]
    );

    return res.json({
      succes: true,
      places: resultat.rows
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des places.',
      erreur: error.message
    });
  }
}

/**
 * Mise à jour du statut d'une place
 * PATCH /api/places/:id
 * Body: { statut: 'libre' | 'occupee' | 'hors_service' }
 *
 * HABILITATION : réservée au rôle 'manager' (administrateur).
 * La place est verrouillée tant qu'une réservation est ACTIVE : libérer
 * manuellement une place occupée rendrait l'état incohérent avec la
 * réservation en cours. La libération normale se fait via le check-out
 * (POST /api/reservations/:id/checkout).
 */
async function updatePlaceStatus(req, res) {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsValides = ['libre', 'occupee', 'hors_service'];
    if (!statut || !statutsValides.includes(String(statut).toLowerCase())) {
      return res.status(400).json({
        succes: false,
        message: 'Le statut fourni est invalide. Valeurs autorisées : libre, occupee, hors_service.'
      });
    }

    const nouveauStatut = String(statut).toLowerCase();

    // 1. La place doit exister
    const placeRes = await db.query(
      `SELECT pl.id, pl.numero, pl.statut, pl.id_parking, p.id_gestionnaire
       FROM places pl
       JOIN parkings p ON p.id = pl.id_parking
       WHERE pl.id = $1`,
      [id]
    );

    if (placeRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Place de parking introuvable.'
      });
    }

    if (req.user.role === 'manager' && placeRes.rows[0].id_gestionnaire !== req.user.id) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez modifier que les places de vos propres parkings.'
      });
    }

    // 2. Verrou : impossible de modifier une place dont la réservation est active
    const activeRes = await db.query(
      `SELECT r.id, r.code_qr
       FROM reservations r
       WHERE r.id_place = $1 AND r.statut = 'ACTIVE'
       LIMIT 1`,
      [id]
    );

    if (activeRes.rows.length > 0) {
      return res.status(409).json({
        succes: false,
        message: `Impossible de modifier cette place : la réservation ${activeRes.rows[0].code_qr} est en cours. Effectuez d'abord le check-out.`
      });
    }

    // 3. Mise à jour
    const resultat = await db.query(
      `UPDATE places 
       SET statut = $1 
       WHERE id = $2 
       RETURNING *`,
      [nouveauStatut, id]
    );

    return res.json({
      succes: true,
      message: `Statut de la place ${resultat.rows[0].numero} mis à jour en "${nouveauStatut}".`,
      place: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la mise à jour du statut de la place.',
      erreur: error.message
    });
  }
}

module.exports = {
  getPlacesByParking,
  updatePlaceStatus
};
