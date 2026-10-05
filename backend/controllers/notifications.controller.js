// ====================================================================
// CONTRÔLEUR DES NOTIFICATIONS (Notifications Controller)
// Création, liste, marquage comme lu
// ====================================================================

const db = require('../config/db');

/**
 * Récupère toutes les notifications d'un utilisateur
 * GET /api/notifications
 */
async function getNotifications(req, res) {
  try {
    const resultat = await db.query(
      `SELECT id, titre, message, type, lue, date_creation
       FROM notifications
       WHERE id_user = $1
       ORDER BY date_creation DESC`,
      [req.user.id]
    );

    return res.json({
      succes: true,
      notifications: resultat.rows
    });
  } catch (error) {
    console.error('Erreur notifications:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des notifications.'
    });
  }
}

/**
 * Marque une notification comme lue
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;

    const resultat = await db.query(
      `UPDATE notifications SET lue = TRUE
       WHERE id = $1 AND id_user = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Notification introuvable.'
      });
    }

    return res.json({
      succes: true,
      notification: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la mise à jour.'
    });
  }
}

/**
 * Marque toutes les notifications comme lues
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res) {
  try {
    await db.query(
      `UPDATE notifications SET lue = TRUE WHERE id_user = $1`,
      [req.user.id]
    );

    return res.json({
      succes: true,
      message: 'Toutes les notifications ont été marquées comme lues.'
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la mise à jour.'
    });
  }
}

/**
 * Types de notification acceptés par la contrainte CHECK de la table.
 * Toute valeur hors de cette liste fait échouer l'INSERT.
 */
const TYPES_NOTIFICATION = ['info', 'success', 'warning', 'danger'];

/**
 * Crée une notification pour un utilisateur
 * (fonction interne utilisée par d'autres contrôleurs)
 *
 * Ne bloque jamais l'opération métier appelante : un échec de notification
 * ne doit pas faire échouer une réservation ou une inscription. Le type est
 * toutefois validé en amont pour éviter qu'une valeur invalide soit
 * silencieusement rejetée par la base.
 */
async function createNotification(userId, titre, message, type = 'info') {
  const typeValide = TYPES_NOTIFICATION.includes(type) ? type : 'info';

  if (typeValide !== type) {
    console.warn(
      `Type de notification inconnu "${type}" (autorisés : ${TYPES_NOTIFICATION.join(', ')}). Repli sur "info".`
    );
  }

  try {
    await db.query(
      `INSERT INTO notifications (id_user, titre, message, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, titre, message, typeValide]
    );
  } catch (error) {
    console.error('Erreur création notification:', error);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
};
