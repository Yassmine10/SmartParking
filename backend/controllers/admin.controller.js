// ====================================================================
// CONTRÔLEUR ADMINISTRATION (Admin Controller)
// Gestion des utilisateurs (liste, suppression, changement de rôle)
// ====================================================================

const db = require('../config/db');

/**
 * Récupère tous les utilisateurs (avec statistiques de réservations)
 * GET /api/users
 */
async function getUsers(req, res) {
  try {
    const resultat = await db.query(
      `SELECT u.id, u.nom, u.email, u.role, u.avatar_url, u.email_verifie, u.date_creation,
              COUNT(r.id)::INTEGER AS total_reservations
       FROM users u
       LEFT JOIN reservations r ON r.id_user = u.id AND r.statut != 'ANNULEE'
       GROUP BY u.id, u.nom, u.email, u.role, u.avatar_url, u.email_verifie, u.date_creation
       ORDER BY u.date_creation DESC`
    );

    return res.json({
      succes: true,
      users: resultat.rows
    });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des utilisateurs.'
    });
  }
}

/**
 * Supprime un utilisateur
 * DELETE /api/users/:id
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Empêcher de se supprimer soi-même
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        succes: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte.'
      });
    }

    const cibleRes = await db.query(
      'SELECT id, nom, role FROM users WHERE id = $1',
      [id]
    );

    if (cibleRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable.'
      });
    }

    const cible = cibleRes.rows[0];

    // Ne pas supprimer le dernier administrateur : la plateforme resterait
    // sans personne capable de la piloter (verrouillage définitif).
    if (cible.role === 'manager') {
      const nbManagersRes = await db.query(
        `SELECT COUNT(*)::INTEGER AS nb FROM users WHERE role = 'manager'`
      );

      if ((nbManagersRes.rows[0]?.nb || 0) <= 1) {
        return res.status(409).json({
          succes: false,
          message: 'Impossible de supprimer le dernier administrateur. Nommez d\'abord un autre gestionnaire.'
        });
      }
    }

    // La suppression est en CASCADE : elle emporte les réservations.
    // On bloque si des réservations sont encore en cours.
    const enCoursRes = await db.query(
      `SELECT COUNT(*)::INTEGER AS nb
       FROM reservations
       WHERE id_user = $1 AND statut IN ('CONFIRMEE', 'ACTIVE')`,
      [id]
    );

    const nbEnCours = enCoursRes.rows[0]?.nb || 0;

    if (nbEnCours > 0) {
      return res.status(409).json({
        succes: false,
        message: `Suppression impossible : ${nbEnCours} réservation(s) de cet utilisateur sont encore en cours.`
      });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    return res.json({
      succes: true,
      message: `Utilisateur "${cible.nom}" supprimé avec succès.`
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la suppression.'
    });
  }
}

/**
 * Change le rôle d'un utilisateur
 * PUT /api/users/:id/role
 */
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const rolesValides = ['user', 'manager'];
    if (!role || !rolesValides.includes(role)) {
      return res.status(400).json({
        succes: false,
        message: 'Rôle invalide. Valeurs autorisées : user, manager.'
      });
    }

    const cibleRes = await db.query(
      'SELECT id, nom, role FROM users WHERE id = $1',
      [id]
    );

    if (cibleRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable.'
      });
    }

    const cible = cibleRes.rows[0];

    // Ne pas retirer le rôle d'administrateur au dernier détenteur du rôle.
    if (cible.role === 'manager' && role === 'user') {
      const nbManagersRes = await db.query(
        `SELECT COUNT(*)::INTEGER AS nb FROM users WHERE role = 'manager'`
      );

      if ((nbManagersRes.rows[0]?.nb || 0) <= 1) {
        return res.status(409).json({
          succes: false,
          message: 'Impossible de rétrograder le dernier administrateur. Nommez d\'abord un autre gestionnaire.'
        });
      }
    }

    const resultat = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, nom, email, role`,
      [role, id]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Utilisateur introuvable.'
      });
    }

    return res.json({
      succes: true,
      message: `Rôle mis à jour : "${resultat.rows[0].nom}" est maintenant "${role}".`,
      user: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la mise à jour du rôle.'
    });
  }
}

/**
 * Récupère les réservations pour le dashboard admin
 * GET /api/reservations/manager
 */
async function getManagerReservations(req, res) {
  try {
    const resultat = await db.query(
      `SELECT r.id, r.debut, r.fin, r.montant_total, r.statut, r.code_qr,
              u.nom AS nom_utilisateur, u.email AS email_utilisateur,
              p.numero AS numero_place, pk.nom AS nom_parking
       FROM reservations r
       JOIN users u ON u.id = r.id_user
       JOIN places p ON p.id = r.id_place
       JOIN parkings pk ON pk.id = p.id_parking
       WHERE pk.id_gestionnaire = $1
       ORDER BY r.date_creation DESC
       LIMIT 100`,
      [req.user.id]
    );

    return res.json({
      succes: true,
      reservations: resultat.rows
    });
  } catch (error) {
    console.error('Erreur réservations manager:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des réservations.'
    });
  }
}

module.exports = {
  getUsers,
  deleteUser,
  updateUserRole,
  getManagerReservations
};
