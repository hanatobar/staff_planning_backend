const bcrypt = require('bcrypt');
const authRepository = require('../repositories/authRepository');
const db = require("../db/database");

async function signup(name, email, password, role) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingUser = await authRepository.findUserByEmail(email);

  if (existingUser) {
    throw new Error("Email already exists");
  }

  return await authRepository.createUser(
    name,
    email,
    hashedPassword,
    role
  );
}

async function login(email, password) {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email.trim()]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];

  if (!user.password) {
    throw new Error("No password found for this account");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  let response = {
    id: user.id,
    role: user.role,
    requiresInitialPassword: !user.is_password_set,
  };

  if (user.role === 'TA') {
    const staffResult = await db.query(
      "SELECT id FROM staff WHERE user_id = $1",
      [user.id]
    );

    if (staffResult.rows.length > 0) {
      response.staffId = staffResult.rows[0].id;
    }
  }

  return response;
}

async function getCoordinatorUser() {
  const user = await authRepository.findCoordinatorUser();

  if (!user) {
    throw new Error("Coordinator user not found");
  }

  return user;
}

async function checkInitialPasswordStatus(email) {
  const user = await authRepository.findUserByEmail(email.trim());

  if (!user) {
    return {
      message: "No account found for this email",
      accountExists: false,
      requiresInitialPassword: false,
      role: ""
    };
  }

  return {
    message: user.is_password_set
      ? "Password is already set"
      : "Initial password setup required",
    accountExists: true,
    requiresInitialPassword: !user.is_password_set,
    role: user.role || ""
  };
}

async function setInitialPassword(email, password) {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email.trim()]
  );

  if (result.rows.length === 0) {
    throw new Error("No account found for this email");
  }

  const user = result.rows[0];

  if (user.is_password_set) {
    throw new Error("Password is already set. Please log in normally");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(`
    UPDATE users
    SET password = $1,
        is_password_set = TRUE
    WHERE id = $2
  `, [hashedPassword, user.id]);

  return {
    message: "Password set successfully. You can now log in",
    role: user.role,
    id: user.id
  };
}

function generateDefaultPassword(name) {
  const clean = (name || "user").replace(/\s+/g, "").toLowerCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${clean}@${random}`;
}

async function createCoordinator(name, email) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName || !trimmedEmail) {
    throw new Error("Name and email are required");
  }

  const exists = await authRepository.coordinatorExists();
  if (exists) {
    throw new Error("Only one coordinator is allowed");
  }

  const existingUser = await authRepository.findUserByEmail(trimmedEmail);
  if (existingUser) {
    throw new Error("Email already exists");
  }

  const defaultPassword = generateDefaultPassword(trimmedName);
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const user = await authRepository.createUser(
    trimmedName,
    trimmedEmail,
    hashedPassword,
    "COORDINATOR",
    false
  );

  const emailService = require('./emailService');

  await emailService.sendEmail(
    trimmedEmail,
    "Coordinator Account - GUC Staff Planning Tool",
    `Hello ${trimmedName},

Your coordinator account has been created.

Email: ${trimmedEmail}
Default Password: ${defaultPassword}

Please log in using this password. After login, you will be redirected to set a new password.

Regards,
Staff Planning System`
  );

  return {
    message: "Coordinator created successfully",
    id: user.id,
    role: user.role
  };
}

async function deleteCoordinator() {
  const coordinator = await authRepository.findCoordinatorUser();

  if (!coordinator) {
    throw new Error("Coordinator user not found");
  }

  await authRepository.deleteCoordinatorReferences(coordinator.id);
  await authRepository.deleteNotificationsByRecipientUserId(coordinator.id);
  await authRepository.deleteMessagesByUserId(coordinator.id);

  const deleted = await authRepository.deleteUserById(coordinator.id);

  if (!deleted) {
    throw new Error("Failed to delete coordinator");
  }

  return {
    message: "Coordinator deleted successfully",
    id: deleted.id
  };
}

module.exports = {
  signup,
  login,
  setInitialPassword,
  getCoordinatorUser,
  checkInitialPasswordStatus,
  createCoordinator,
  deleteCoordinator
};