const pool = require('../db/database');

async function createUser(name, email, password, role, isPasswordSet = true) {
  const query = `
    INSERT INTO users (name, email, password, role, is_password_set)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    name,
    email,
    password,
    role,
    isPasswordSet
  ]);

  return result.rows[0];
}

async function createUserWithoutPassword(name, email, role) {
  return await createUser(name, email, null, role, false);
}

async function findCoordinatorUser() {
  const query = `
    SELECT id, name, email, role
    FROM users
    WHERE UPPER(TRIM(role)) = 'COORDINATOR'
    LIMIT 1
  `;

  const result = await pool.query(query);
  return result.rows[0] || null;
}

async function coordinatorExists() {
  const result = await pool.query(`
    SELECT id
    FROM users
    WHERE UPPER(TRIM(role)) = 'COORDINATOR'
    LIMIT 1
  `);

  return result.rows.length > 0;
}

async function findUserByEmail(email) {
  const query = `
    SELECT * FROM users WHERE email = $1
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0];
}

async function updateUserById(id, name, email, role) {
  const result = await pool.query(`
    UPDATE users
    SET name = $1,
        email = $2,
        role = $3
    WHERE id = $4
    RETURNING *
  `, [name, email, role, id]);

  return result.rows[0];
}

async function deleteCoordinatorReferences(userId) {
  await pool.query(`
    UPDATE preference_round
    SET opened_by_user_id = NULL
    WHERE opened_by_user_id = $1
  `, [userId]);

  await pool.query(`
    UPDATE preference_round
    SET locked_by_user_id = NULL
    WHERE locked_by_user_id = $1
  `, [userId]);

  await pool.query(`
    UPDATE assignment_appeal
    SET reviewed_by_user_id = NULL
    WHERE reviewed_by_user_id = $1
  `, [userId]);
}
async function deleteNotificationsByRecipientUserId(userId) {
  await pool.query(`
    DELETE FROM notification
    WHERE recipient_user_id = $1
  `, [userId]);
}
async function deleteMessagesByUserId(userId) {
  await pool.query(`
    DELETE FROM message
    WHERE sender_user_id = $1 OR receiver_user_id = $1
  `, [userId]);
}
async function deleteUserById(userId) {
  const result = await pool.query(`
    DELETE FROM users
    WHERE id = $1
    RETURNING id, name, email, role
  `, [userId]);

  return result.rows[0] || null;
}

module.exports = {
  createUser,
  createUserWithoutPassword,
  findUserByEmail,
  findCoordinatorUser,
  updateUserById,
  coordinatorExists,
  deleteCoordinatorReferences,
  deleteNotificationsByRecipientUserId,
  deleteMessagesByUserId,
  deleteUserById
};