const assert = require('node:assert/strict');
const { test } = require('node:test');

// Force the database module to use its isolated in-memory fallback.
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';

const db = require('../config/db');
const placesController = require('../controllers/places.controller');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('a manager can add and remove only unused places in their own parking', async () => {
  await db.initialiserBaseDeDonnees();

  const manager = (await db.query("SELECT id FROM users WHERE role = 'manager' LIMIT 1")).rows[0];
  const user = (await db.query("SELECT id FROM users WHERE role = 'user' LIMIT 1")).rows[0];
  const parking = (
    await db.query('SELECT id FROM parkings WHERE id_gestionnaire = $1 LIMIT 1', [manager.id])
  ).rows[0];
  assert.ok(manager && user && parking, 'seed data must include a manager, user, and manager parking');

  const suffix = String(Date.now()).slice(-8);
  let response = createResponse();

  await placesController.createPlace(
    { body: { id_parking: parking.id, numero: `T${suffix}`, type_place: 'STANDARD' }, user: { id: manager.id } },
    response
  );
  assert.equal(response.statusCode, 201);
  const deletablePlaceId = response.body.place.id;

  response = createResponse();
  await placesController.createPlace(
    { body: { id_parking: parking.id, numero: `T${suffix}` }, user: { id: manager.id } },
    response
  );
  assert.equal(response.statusCode, 409, 'duplicate place numbers must be rejected');

  response = createResponse();
  await placesController.createPlace(
    { body: { id_parking: parking.id, numero: `F${suffix}` }, user: { id: 999999 } },
    response
  );
  assert.equal(response.statusCode, 403, 'a manager cannot create a place in another manager parking');

  response = createResponse();
  await placesController.deletePlace({ params: { id: deletablePlaceId }, user: { id: manager.id } }, response);
  assert.equal(response.statusCode, 200, 'an unused place can be deleted');

  response = createResponse();
  await placesController.createPlace(
    { body: { id_parking: parking.id, numero: `U${suffix}` }, user: { id: manager.id } },
    response
  );
  assert.equal(response.statusCode, 201);
  const reservedPlaceId = response.body.place.id;

  await db.query(
    `INSERT INTO reservations (id_user, id_place, debut, fin, montant_total, statut, code_qr)
     VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 hour', 1, 'CONFIRMEE', $3)`,
    [user.id, reservedPlaceId, `TEST-QR-${suffix}`]
  );

  response = createResponse();
  await placesController.deletePlace({ params: { id: reservedPlaceId }, user: { id: manager.id } }, response);
  assert.equal(response.statusCode, 409, 'a place with reservation history must be preserved');
});
