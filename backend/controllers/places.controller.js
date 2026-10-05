// ====================================================================
// CONTRÔLEUR DES PLACES (Places Controller)
// Consultation et mise à jour du statut des places (libre, occupée, hors service)
// ====================================================================

const db = require('../config/db');

/**
 * Ajoute une place à un parking appartenant au gestionnaire connecté.
 * POST /api/places
 */
async function createPlace(req, res) {
  try {
    const idParking = Number(req.body?.id_parking);
    const numero = typeof req.body?.numero === 'string' ? req.body.numero.trim() : '';
    const typePlace = String(req.body?.type_place || 'STANDARD').toUpperCase();
    const typesValides = ['STANDARD', 'HANDICAPE', 'ELECTRIQUE', 'VIP'];

    if (!Number.isInteger(idParking) || idParking <= 0 || !numero || numero.length > 20) {
      return res.status(400).json({
        succes: false,
        message: 'Un parking valide et un numéro de place de 1 à 20 caractères sont requis.'
      });
    }
    if (!typesValides.includes(typePlace)) {
      return res.status(400).json({
        succes: false,
        message: 'Type de place invalide. Valeurs autorisées : STANDARD, HANDICAPE, ELECTRIQUE, VIP.'
      });
    }

    const parkingRes = await db.query(
      'SELECT id_gestionnaire FROM parkings WHERE id = $1',
      [idParking]
    );
    if (parkingRes.rows.length === 0) {
      return res.status(404).json({ succes: false, message: 'Parking introuvable.' });
    }
    if (Number(parkingRes.rows[0].id_gestionnaire) !== Number(req.user.id)) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez ajouter des places qu’à vos propres parkings.'
      });
    }

    const result = await db.query(
      `INSERT INTO places (id_parking, numero, type_place)
       VALUES ($1, $2, $3)
       RETURNING id, id_parking, numero, statut, type_place`,
      [idParking, numero, typePlace]
    );

    return res.status(201).json({
      succes: true,
      message: 'Place ajoutée avec succès.',
      place: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        succes: false,
        message: 'Ce numéro de place existe déjà dans ce parking.'
      });
    }
    console.error('Erreur lors de la création de la place :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la création de la place.'
    });
  }
}

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
 * Supprime une place sans historique de réservation.
 * DELETE /api/places/:id
 */
async function deletePlace(req, res) {
  const idPlace = Number(req.params.id);
  if (!Number.isInteger(idPlace) || idPlace <= 0) {
    return res.status(400).json({ succes: false, message: 'Identifiant de place invalide.' });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const placeRes = await client.query(
      `SELECT pl.id, p.id_gestionnaire
       FROM places pl
       JOIN parkings p ON p.id = pl.id_parking
       WHERE pl.id = $1
       FOR UPDATE`,
      [idPlace]
    );
    if (placeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ succes: false, message: 'Place de parking introuvable.' });
    }
    if (Number(placeRes.rows[0].id_gestionnaire) !== Number(req.user.id)) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez supprimer des places que de vos propres parkings.'
      });
    }

    const reservationsRes = await client.query(
      'SELECT id FROM reservations WHERE id_place = $1 LIMIT 1',
      [idPlace]
    );
    if (reservationsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({
        succes: false,
        message: 'Cette place ne peut pas être supprimée car elle possède un historique de réservations.'
      });
    }

    await client.query('DELETE FROM places WHERE id = $1', [idPlace]);
    await client.query('COMMIT');
    transactionStarted = false;

    return res.json({ succes: true, message: 'Place supprimée avec succès.' });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression de la place :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la suppression de la place.'
    });
  } finally {
    client?.release();
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
  createPlace,
  deletePlace,
  updatePlaceStatus
};
