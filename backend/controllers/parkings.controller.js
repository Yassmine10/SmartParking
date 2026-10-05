// ====================================================================
// CONTRÔLEUR DES PARKINGS (Parkings Controller)
// Recherche géographique, CRUD et calcul de proximité
// ====================================================================

const db = require('../config/db');

/**
 * Récupère la liste des parkings avec calcul de distance et places libres
 * GET /api/parkings?lat=&lng=&rayon=
 */
async function getParkings(req, res) {
  try {
    const { lat, lng, rayon } = req.query;

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const rayonMax = parseFloat(rayon) || 50; // 50 km par défaut
    const avecGps = !isNaN(userLat) && !isNaN(userLng);

    let requeteSql;
    const parametres = [];

    if (avecGps) {
      // Formule de Haversine : distance en km entre le parking et l'utilisateur
      const distanceSql = `(6371 * acos(
        cos(radians($1)) * cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians($2)) + 
        sin(radians($1)) * sin(radians(p.latitude))
      ))`;

      // La distance est calculée dans une sous-requête puis filtrée au niveau
      // extérieur : PostgreSQL n'autorise pas d'expression non agrégée dans HAVING.
      requeteSql = `
        SELECT * FROM (
          SELECT
            p.id,
            p.nom,
            p.adresse,
            p.latitude,
            p.longitude,
            p.prix_heure,
            p.image_url,
            p.description,
            p.heure_ouverture,
            p.heure_fermeture,
            p.couvert,
            p.id_gestionnaire,
            COUNT(pl.id)::INTEGER AS places_totales,
            COUNT(CASE WHEN pl.statut = 'libre' THEN 1 END)::INTEGER AS places_libres,
            ROUND(${distanceSql}::NUMERIC, 2) AS distance_km
          FROM parkings p
          LEFT JOIN places pl ON pl.id_parking = p.id
          GROUP BY p.id, p.nom, p.adresse, p.latitude, p.longitude, p.prix_heure,
                   p.image_url, p.description, p.heure_ouverture, p.heure_fermeture,
                   p.couvert, p.id_gestionnaire
        ) AS parkings_avec_distance
        WHERE distance_km <= $3
        ORDER BY distance_km ASC
      `;
      parametres.push(userLat, userLng, rayonMax);
    } else {
      requeteSql = `
        SELECT
          p.id,
          p.nom,
          p.adresse,
          p.latitude,
          p.longitude,
          p.prix_heure,
          p.image_url,
          p.description,
          p.heure_ouverture,
          p.heure_fermeture,
          p.couvert,
          p.id_gestionnaire,
          COUNT(pl.id)::INTEGER AS places_totales,
          COUNT(CASE WHEN pl.statut = 'libre' THEN 1 END)::INTEGER AS places_libres
        FROM parkings p
        LEFT JOIN places pl ON pl.id_parking = p.id
        GROUP BY p.id, p.nom, p.adresse, p.latitude, p.longitude, p.prix_heure,
                 p.image_url, p.description, p.heure_ouverture, p.heure_fermeture,
                 p.couvert, p.id_gestionnaire
        ORDER BY p.nom ASC
      `;
    }

    const resultat = await db.query(requeteSql, parametres);

    return res.json({
      succes: true,
      total: resultat.rows.length,
      parkings: resultat.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des parkings :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des parkings.',
      erreur: error.message
    });
  }
}

/**
 * Récupère le détail d'un parking spécifique avec la liste de ses places
 * GET /api/parkings/:id
 */
async function getParkingById(req, res) {
  try {
    const { id } = req.params;

    // 1. Récupérer les informations générales du parking + le nombre de places
    // Colonnes listées explicitement, et jointure users séparée :
    // pg-mem résout deux colonnes homonymes (p.nom / u.nom) depuis la mauvaise table.
    const parkingRes = await db.query(
      `SELECT 
        p.id,
        p.nom,
        p.adresse,
        p.latitude,
        p.longitude,
        p.prix_heure,
        p.image_url,
        p.description,
        p.heure_ouverture,
        p.heure_fermeture,
        p.couvert,
        p.id_gestionnaire,
        p.date_creation,
        COUNT(pl.id)::INTEGER AS places_totales,
        COUNT(CASE WHEN pl.statut = 'libre' THEN 1 END)::INTEGER AS places_libres
       FROM parkings p
       LEFT JOIN places pl ON pl.id_parking = p.id
       WHERE p.id = $1
       GROUP BY p.id, p.nom, p.adresse, p.latitude, p.longitude, p.prix_heure,
                p.image_url, p.description, p.heure_ouverture, p.heure_fermeture,
                p.couvert, p.id_gestionnaire, p.date_creation`,
      [id]
    );

    if (parkingRes.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Parking introuvable.'
      });
    }

    const parking = parkingRes.rows[0];

    // 1b. Informations du gestionnaire (requête séparée pour éviter la collision de colonnes)
    const gestionnaireRes = await db.query(
      'SELECT nom, email FROM users WHERE id = $1',
      [parking.id_gestionnaire]
    );

    if (gestionnaireRes.rows.length > 0) {
      parking.nom_gestionnaire = gestionnaireRes.rows[0].nom;
      parking.email_gestionnaire = gestionnaireRes.rows[0].email;
    }

    // 2. Récupérer toutes les places associées
    const placesRes = await db.query(
      'SELECT id, numero, statut, type_place FROM places WHERE id_parking = $1 ORDER BY numero ASC',
      [id]
    );

    parking.places = placesRes.rows;

    return res.json({
      succes: true,
      parking
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération des détails du parking.',
      erreur: error.message
    });
  }
}

/**
 * Création d'un nouveau parking (Réservé aux gestionnaires)
 * POST /api/parkings
 */
async function createParking(req, res) {
  try {
    const {
      nom, adresse, latitude, longitude, prix_heure, image_url, nombre_places,
      description, heure_ouverture, heure_fermeture, couvert
    } = req.body;
    const idGestionnaire = req.user.id;

    if (!nom || !adresse || latitude === undefined || longitude === undefined || !prix_heure) {
      return res.status(400).json({
        succes: false,
        message: 'Le nom, l\'adresse, les coordonnées GPS et le prix par heure sont obligatoires.'
      });
    }

    // 1. Insérer le parking
    const insertParking = await db.query(
      `INSERT INTO parkings (
         nom, adresse, latitude, longitude, prix_heure, image_url,
         description, heure_ouverture, heure_fermeture, couvert, id_gestionnaire
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        nom.trim(),
        adresse.trim(),
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(prix_heure),
        image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
        description?.trim() || null,
        heure_ouverture || null,
        heure_fermeture || null,
        Boolean(couvert),
        idGestionnaire
      ]
    );

    const nouveauParking = insertParking.rows[0];

    // 2. Créer automatiquement des places de parking initiales (ex: 10 places par défaut)
    const nbPlacesACreer = parseInt(nombre_places) || 10;
    for (let i = 1; i <= nbPlacesACreer; i++) {
      const numeroPlace = `P${i.toString().padStart(2, '0')}`;
      const typePlace = i === 1 ? 'HANDICAPE' : (i === 2 ? 'ELECTRIQUE' : 'STANDARD');
      await db.query(
        'INSERT INTO places (id_parking, numero, statut, type_place) VALUES ($1, $2, $3, $4)',
        [nouveauParking.id, numeroPlace, 'libre', typePlace]
      );
    }

    return res.status(201).json({
      succes: true,
      message: `Parking créé avec succès avec ${nbPlacesACreer} places initiales.`,
      parking: nouveauParking
    });
  } catch (error) {
    console.error('Erreur création parking :', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la création du parking.',
      erreur: error.message
    });
  }
}

/**
 * Mise à jour d'un parking existant
 * PUT /api/parkings/:id
 *
 * HABILITATION : la route est protégée par verifierRoleManager.
 * Le rôle 'manager' est celui d'administrateur de la plateforme, il
 * intervient donc sur l'ensemble des parkings (le champ id_gestionnaire
 * conserve l'historique du créateur).
 */
async function updateParking(req, res) {
  try {
    const { id } = req.params;
    const {
      nom, adresse, latitude, longitude, prix_heure, image_url,
      description, heure_ouverture, heure_fermeture, couvert
    } = req.body;

    if (nom !== undefined && !String(nom).trim()) {
      return res.status(400).json({ succes: false, message: 'Le nom ne peut pas être vide.' });
    }
    if (prix_heure !== undefined && (isNaN(parseFloat(prix_heure)) || parseFloat(prix_heure) < 0)) {
      return res.status(400).json({ succes: false, message: 'Le prix par heure doit être un nombre positif.' });
    }

    // COALESCE conserve la valeur existante quand le champ n'est pas fourni :
    // le formulaire d'édition envoie toujours le formulaire complet, on garde
    // donc ce comportement plutôt que d'écraser avec NULL.
    const parkingExist = await db.query(
      'SELECT id, id_gestionnaire FROM parkings WHERE id = $1',
      [id]
    );

    if (parkingExist.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Parking introuvable.'
      });
    }

    if (parkingExist.rows[0].id_gestionnaire !== req.user.id) {
      return res.status(403).json({
        succes: false,
        message: 'Vous ne pouvez modifier que vos propres parkings.'
      });
    }

    const resultat = await db.query(
      `UPDATE parkings
       SET nom               = COALESCE($1, nom),
           adresse           = COALESCE($2, adresse),
           latitude          = COALESCE($3, latitude),
           longitude         = COALESCE($4, longitude),
           prix_heure        = COALESCE($5, prix_heure),
           image_url         = COALESCE($6, image_url),
           description       = COALESCE($7, description),
           heure_ouverture   = COALESCE($8, heure_ouverture),
           heure_fermeture   = COALESCE($9, heure_fermeture),
           couvert           = COALESCE($10, couvert)
       WHERE id = $11
       RETURNING *`,
      [
        nom, adresse, latitude, longitude, prix_heure, image_url,
        description, heure_ouverture, heure_fermeture,
        couvert === undefined || couvert === null ? null : Boolean(couvert),
        id
      ]
    );

    if (resultat.rows.length === 0) {
      return res.status(404).json({
        succes: false,
        message: 'Parking introuvable.'
      });
    }

    return res.json({
      succes: true,
      message: 'Parking mis à jour avec succès.',
      parking: resultat.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la mise à jour du parking.',
      erreur: error.message
    });
  }
}

/**
 * Suppression d'un parking
 * DELETE /api/parkings/:id
 *
 * La suppression est en CASCADE : elle emporte les places et les
 * réservations du parking. On refuse donc la suppression tant que des
 * réservations sont en cours, afin d'éviter une perte de données
 * irrécupérable.
 */
async function deleteParking(req, res) {
  try {
    const { id } = req.params;

    // 1. Vérifier l'existence du parking et la propriété du gestionnaire
    const parkingRes = await db.query(
      'SELECT id, nom, id_gestionnaire FROM parkings WHERE id = $1',
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
        message: 'Vous ne pouvez supprimer que vos propres parkings.'
      });
    }

    // 2. Bloquer la suppression si des réservations sont encore en cours
    const enCoursRes = await db.query(
      `SELECT COUNT(*)::INTEGER AS nb
       FROM reservations r
       JOIN places pl ON pl.id = r.id_place
       WHERE pl.id_parking = $1
         AND r.statut IN ('CONFIRMEE', 'ACTIVE')`,
      [id]
    );

    const nbEnCours = enCoursRes.rows[0]?.nb || 0;

    if (nbEnCours > 0) {
      return res.status(409).json({
        succes: false,
        message: `Suppression impossible : ${nbEnCours} réservation(s) sont encore en cours sur ce parking. Annulez-les ou terminez-les d'abord.`
      });
    }

    // 3. Suppression effective
    await db.query('DELETE FROM parkings WHERE id = $1', [id]);

    return res.json({
      succes: true,
      message: `Le parking "${parkingRes.rows[0].nom}" a été supprimé.`
    });
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la suppression du parking.',
      erreur: error.message
    });
  }
}

/**
 * Récupère les parkings du gestionnaire connecté
 * GET /api/parkings/mes-parkings
 */
async function getMesParkings(req, res) {
  try {
    const resultat = await db.query(
      `SELECT
         p.id,
         p.nom,
         p.adresse,
         p.latitude,
         p.longitude,
         p.prix_heure,
         p.image_url,
         p.description,
         p.heure_ouverture,
         p.heure_fermeture,
         p.couvert,
         p.id_gestionnaire,
         p.date_creation,
         COUNT(pl.id)::INTEGER AS places_totales,
         COUNT(CASE WHEN pl.statut = 'libre' THEN 1 END)::INTEGER AS places_libres
       FROM parkings p
       LEFT JOIN places pl ON pl.id_parking = p.id
       WHERE p.id_gestionnaire = $1
       GROUP BY p.id, p.nom, p.adresse, p.latitude, p.longitude,
                p.prix_heure, p.image_url, p.description, p.heure_ouverture,
                p.heure_fermeture, p.couvert, p.id_gestionnaire, p.date_creation
       ORDER BY p.date_creation DESC`,
      [req.user.id]
    );

    return res.json({
      succes: true,
      parkings: resultat.rows
    });
  } catch (error) {
    console.error('Erreur mes parkings:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur lors de la récupération de vos parkings.'
    });
  }
}

module.exports = {
  getParkings,
  getParkingById,
  getMesParkings,
  createParking,
  updateParking,
  deleteParking
};
