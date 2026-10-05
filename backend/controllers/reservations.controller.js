// ====================================================================
// CONTRÔLEUR DES RÉSERVATIONS (Reservations Controller)
// Gestion des réservations avec TRANSACTION SQL anti-double réservation et QR Code
// ====================================================================

const db = require('../config/db');
const { createNotification } = require('./notifications.controller');

/**
 * Créer une nouvelle réservation
 * POST /api/reservations
 * 
 * NOTION CLÉ DU COURS : TRANSACTION SQL pour garantir l'atomicité et 
 * empêcher les doubles réservations concurrentes sur la même place au même horaire.
 */
async function createReservation(req, res) {
  const client = await db.pool.connect();

  try {
    const { id_place, debut, duree_heures } = req.body;
    const idUser = req.user.id;

    // 1. Validation des paramètres d'entrée
    if (!id_place || !debut || !duree_heures) {
      return res.status(400).json({
        succes: false,
        message: 'L\'identifiant de la place, la date de début et la durée en heures sont requis.'
      });
    }

    const dateDebut = new Date(debut);
    const duree = parseFloat(duree_heures);
    const maintenantRef = new Date();

    if (isNaN(dateDebut.getTime()) || duree <= 0) {
      return res.status(400).json({
        succes: false,
        message: 'Date de début ou durée invalide.'
      });
    }

    if (dateDebut < maintenantRef) {
      return res.status(400).json({
        succes: false,
        message: 'La réservation ne peut pas commencer dans le passé.'
      });
    }

    // Calcul de la date de fin = dateDebut + (duree * 60 * 60 * 1000)
    const dateFin = new Date(dateDebut.getTime() + duree * 3600 * 1000);

    // ================================================================
    // DÉBUT DE LA TRANSACTION SQL
    // ================================================================
    await client.query('BEGIN');

    // 2. Vérifier l'existence de la place et verrouiller la ligne (FOR UPDATE)
    const placeRes = await client.query(
      `SELECT pl.id, pl.numero, pl.statut, p.id AS id_parking, p.nom AS nom_parking, p.prix_heure
       FROM places pl
       JOIN parkings p ON p.id = pl.id_parking
       WHERE pl.id = $1
       FOR UPDATE`,
      [id_place]
    );

    if (placeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        succes: false,
        message: 'La place de parking sélectionnée n\'existe pas.'
      });
    }

    const place = placeRes.rows[0];

    // Vérifier si la place n'est pas hors service
    if (place.statut === 'hors_service') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        succes: false,
        message: 'Cette place est actuellement hors service.'
      });
    }

    // 3. VÉRIFICATION DU CHEVAUCHEMENT : la place est-elle déjà réservée sur ce créneau ?
    // Chevauchement : (debut_existant < nouvelle_fin) ET (fin_existante > nouveau_debut)
    const chevauchementRes = await client.query(
      `SELECT id, debut, fin, statut 
       FROM reservations 
       WHERE id_place = $1 
         AND statut IN ('CONFIRMEE', 'ACTIVE')
         AND (debut < $3 AND fin > $2)`,
      [id_place, dateDebut.toISOString(), dateFin.toISOString()]
    );

    if (chevauchementRes.rows.length > 0) {
      // Annuler la transaction : conflit détecté !
      await client.query('ROLLBACK');
      return res.status(409).json({
        succes: false,
        message: 'Conflit de réservation : Cette place est déjà réservée sur le créneau demandé.'
      });
    }

    // 4. Calcul du montant total
    const montantTotal = parseFloat(place.prix_heure) * duree;

    // 5. Génération d'un code QR unique
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const codeQr = `SP-RES-${place.id_parking}-${place.numero}-${timestamp}-${randomCode}`;

    // 6. Insertion de la réservation
    const insertRes = await client.query(
      `INSERT INTO reservations (id_user, id_place, debut, fin, montant_total, statut, code_qr)
       VALUES ($1, $2, $3, $4, $5, 'CONFIRMEE', $6)
       RETURNING *`,
      [idUser, id_place, dateDebut.toISOString(), dateFin.toISOString(), montantTotal, codeQr]
    );

    const nouvelleReservation = insertRes.rows[0];

    // 7. Si la réservation commence immédiatement (dans les 10 min), marquer la place comme occupée
    const maintenant = new Date();
    if (dateDebut <= new Date(maintenant.getTime() + 10 * 60 * 1000)) {
      await client.query('UPDATE places SET statut = $1 WHERE id = $2', ['occupee', id_place]);
    }

    // ================================================================
    // VALIDATION DE LA TRANSACTION
    // ================================================================
    await client.query('COMMIT');

    // Enrichir l'objet de réponse pour le frontend
    nouvelleReservation.parking_nom = place.nom_parking;
    nouvelleReservation.place_numero = place.numero;

    // Notification de confirmation pour l'utilisateur
    await createNotification(
      idUser,
      'Réservation confirmée',
      `Place ${place.numero} – ${place.nom_parking} réservée du ${dateDebut.toLocaleString('fr-FR')} pour ${duree} h (${montantTotal.toFixed(2)} DT).`,
      'success'
    );

    return res.status(201).json({
      succes: true,
      message: 'Réservation confirmée avec succès !',
      reservation: nouvelleReservation
    });
  } catch (error) {
    // En cas d'erreur inattendue, annuler la transaction
    await client.query('ROLLBACK');
    console.error('Erreur transaction réservation :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la création de la réservation.',
      erreur: error.message
    });
  } finally {
    // Toujours libérer le client pour le renvoyer au pool
    client.release();
  }
}

/**
 * Récupérer l'historique des réservations de l'utilisateur connecté
 * GET /api/reservations/me
 */
async function getMesReservations(req, res) {
  try {
    const resultat = await db.query(
      `SELECT 
        r.id,
        r.debut,
        r.fin,
        r.montant_total,
        r.statut,
        r.code_qr,
        r.date_creation,
        p.id AS id_parking,
        p.nom AS nom_parking,
        p.adresse AS adresse_parking,
        p.image_url,
        pl.numero AS numero_place,
        pl.type_place
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       WHERE r.id_user = $1
       ORDER BY r.debut DESC`,
      [req.user.id]
    );

    return res.json({
      succes: true,
      total: resultat.rows.length,
      reservations: resultat.rows
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération de vos réservations.',
      erreur: error.message
    });
  }
}

/**
 * Récupérer les réservations d'un parking (Manager)
 * GET /api/reservations/parking/:id
 */
async function getReservationsByParking(req, res) {
  try {
    const { id } = req.params;

    const parkingRes = await db.query(
      'SELECT id, id_gestionnaire FROM parkings WHERE id = $1',
      [id]
    );

    if (parkingRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Parking introuvable.'
      });
    }

    if (parkingRes.rows[0].id_gestionnaire !== req.user.id) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez consulter que les réservations de vos parkings.'
      });
    }

    const resultat = await db.query(
      `SELECT 
        r.id,
        r.debut,
        r.fin,
        r.montant_total,
        r.statut,
        r.code_qr,
        u.nom AS nom_utilisateur,
        u.email AS email_utilisateur,
        pl.numero AS numero_place,
        p.nom AS nom_parking
       FROM reservations r
       JOIN users u ON u.id = r.id_user
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       WHERE p.id = $1
       ORDER BY r.debut DESC`,
      [id]
    );

    return res.json({
      succes: true,
      total: resultat.rows.length,
      reservations: resultat.rows
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des réservations du parking.',
      erreur: error.message
    });
  }
}

/**
 * Annuler une réservation
 * PUT /api/reservations/:id/annuler
 *
 * Autorisé au propriétaire de la réservation ou à un administrateur.
 */
async function annulerReservation(req, res) {
  try {
    const { id } = req.params;

    const verif = await db.query(
      `SELECT r.*, pl.numero AS numero_place, p.nom AS nom_parking, p.id_gestionnaire
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       WHERE r.id = $1`,
      [id]
    );

    if (verif.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Réservation introuvable.'
      });
    }

    const reservation = verif.rows[0];
    const estGestionnaireParking = req.user.role === 'manager' && reservation.id_gestionnaire === req.user.id;

    if (reservation.id_user !== req.user.id && !estGestionnaireParking) {
      return res.status(403).json({
        succes: false,
        message: 'Vous n\'avez pas le droit d\'annuler cette réservation.'
      });
    }

    // Une réservation terminée ne peut plus être annulée : la place a déjà
    // été remise à disposition et peut être réattribuée à quelqu'un d'autre.
    if (reservation.statut === 'TERMINEE') {
      return res.status(409).json({
        succes: false,
        message: 'Cette réservation est terminée : elle ne peut plus être annulée.'
      });
    }

    if (reservation.statut === 'ANNULEE') {
      return res.status(409).json({
        succes: false,
        message: 'Cette réservation est déjà annulée.'
      });
    }

    // Mettre à jour le statut
    const updateRes = await db.query(
      'UPDATE reservations SET statut = $1 WHERE id = $2 RETURNING *',
      ['ANNULEE', id]
    );

    // Libérer la place
    await db.query('UPDATE places SET statut = $1 WHERE id = $2', ['libre', reservation.id_place]);

    await createNotification(
      reservation.id_user,
      'Réservation annulée',
      `Votre réservation de la place ${reservation.numero_place} – ${reservation.nom_parking} a été annulée.`,
      'warning'
    );

    return res.json({
      succes: true,
      message: 'Réservation annulée avec succès.',
      reservation: updateRes.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de l\'annulation.',
      erreur: error.message
    });
  }
}

/**
 * Récupère une réservation par son ID
 * GET /api/reservations/:id
 *
 * SÉCURITÉ : sans ce contrôle, n'importe quel utilisateur authentifié
 * pourrait lire TOUTES les réservations de la plateforme, y compris les
 * codes QR d'accès. On n'autorise que deux cas :
 *   - le propriétaire de la réservation
 *   - un administrateur ('manager')
 */
async function getReservationById(req, res) {
  try {
    const { id } = req.params;

    const resultat = await db.query(
      `SELECT r.*, p.nom AS nom_parking, p.adresse AS adresse_parking,
              p.id_gestionnaire AS id_gestionnaire_parking,
              pl.numero AS numero_place, pl.type_place,
              u.nom AS nom_utilisateur
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       JOIN users u ON u.id = r.id_user
       WHERE r.id = $1`,
      [id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Réservation introuvable.'
      });
    }

    const reservation = resultat.rows[0];
    const estProprietaire = reservation.id_user === req.user.id;
    const estGestionnaireParking = req.user.role === 'manager' && reservation.id_gestionnaire_parking === req.user.id;

    if (!estProprietaire && !estGestionnaireParking) {
      // 403 et non 404 : l'appelant est authentifié, l'existence de la
      // ressource ne doit pas lui être masquée, mais l'accès est refusé.
      return res.status(403).json({
        succes: false,
        message: 'Accès refusé : cette réservation ne vous appartient pas.'
      });
    }

    return res.json({
      succes: true,
      reservation
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération de la réservation.'
    });
  }
}

/**
 * Récupère une réservation par son code QR
 * GET /api/reservations/qr/:qrData
 */
async function getReservationByQr(req, res) {
  try {
    const { qrData } = req.params;

    const resultat = await db.query(
      `SELECT r.*, p.nom AS nom_parking, p.adresse AS adresse_parking,
              p.id_gestionnaire AS id_gestionnaire_parking,
              pl.numero AS numero_place, pl.type_place,
              u.nom AS nom_utilisateur
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       JOIN users u ON u.id = r.id_user
       WHERE r.code_qr = $1`,
      [qrData]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Réservation introuvable avec ce code QR.'
      });
    }

    const reservation = resultat.rows[0];
    const estGestionnaireParking = req.user.role === 'manager' && reservation.id_gestionnaire_parking === req.user.id;
    const estProprietaire = reservation.id_user === req.user.id;

    if (!estProprietaire && !estGestionnaireParking) {
      return res.status(403).json({
        succes: false,
        message: 'Accès refusé : vous ne pouvez pas consulter cette réservation.'
      });
    }

    return res.json({
      succes: true,
      reservation
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la recherche par QR code.'
    });
  }
}

/**
 * Check-in : marque la réservation comme ACTIVE et la place comme occupée
 * POST /api/reservations/:id/checkin
 */
async function checkIn(req, res) {
  try {
    const { id } = req.params;

    const reservationRes = await db.query(
      `SELECT r.*, p.id_gestionnaire AS id_gestionnaire_parking
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       WHERE r.id = $1`,
      [id]
    );

    if (reservationRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Réservation introuvable.'
      });
    }

    const reservation = reservationRes.rows[0];
    if (req.user.role === 'manager' && reservation.id_gestionnaire_parking !== req.user.id) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez vérifier que les réservations de vos parkings.'
      });
    }

    const resultat = await db.query(
      `UPDATE reservations SET statut = 'ACTIVE'
       WHERE id = $1 AND statut = 'CONFIRMEE'
       RETURNING *`,
      [id]
    );

    if (resultat.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Réservation introuvable ou déjà activée/terminée.'
      });
    }

    // Marquer la place comme occupée
    await db.query(
      'UPDATE places SET statut = $1 WHERE id = (SELECT id_place FROM reservations WHERE id = $2)',
      ['occupee', id]
    );

    await createNotification(
      resultat.rows[0].id_user,
      'Entrée effective',
      `Votre réservation a été validée à l'entrée. Bienvenue !`,
      'info'
    );

    return res.json({
      succes: true,
      message: 'Check-in effectué avec succès.',
      reservation: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors du check-in.'
    });
  }
}

/**
 * Check-out : marque la réservation comme TERMINEE et libère la place
 * POST /api/reservations/:id/checkout
 */
async function checkOut(req, res) {
  try {
    const { id } = req.params;

    const reservationRes = await db.query(
      `SELECT r.*, p.id_gestionnaire AS id_gestionnaire_parking
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       JOIN parkings p ON p.id = pl.id_parking
       WHERE r.id = $1`,
      [id]
    );

    if (reservationRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Réservation introuvable.'
      });
    }

    const reservation = reservationRes.rows[0];
    if (req.user.role === 'manager' && reservation.id_gestionnaire_parking !== req.user.id) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez clôturer que les réservations de vos parkings.'
      });
    }

    const resultat = await db.query(
      `UPDATE reservations SET statut = 'TERMINEE'
       WHERE id = $1 AND statut = 'ACTIVE'
       RETURNING *`,
      [id]
    );

    if (resultat.rows.length === 0) {
      return res.status(400).json({
        succes: false,
        message: 'Réservation introuvable ou non active.'
      });
    }

    // Libérer la place
    await db.query(
      'UPDATE places SET statut = $1 WHERE id = (SELECT id_place FROM reservations WHERE id = $2)',
      ['libre', id]
    );

    await createNotification(
      resultat.rows[0].id_user,
      'Sortie enregistrée',
      `Merci ! Votre stationnement est terminé. Montant dû : ${parseFloat(resultat.rows[0].montant_total || 0).toFixed(2)} DT.`,
      'info'
    );

    return res.json({
      succes: true,
      message: 'Check-out effectué avec succès.',
      reservation: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors du check-out.'
    });
  }
}

module.exports = {
  createReservation,
  getMesReservations,
  getReservationsByParking,
  getReservationById,
  getReservationByQr,
  checkIn,
  checkOut,
  annulerReservation
};
