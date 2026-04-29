const authService = require('../services/authService');

async function signup(call, callback) {
  try {
    const { name, email, password, role } = call.request;

    await authService.signup(name, email, password, role);

    callback(null, {
      message: "Signup successful",
      role: role,
      requiresInitialPassword: false,
    });
  } catch (error) {
    callback(error, null);
  }
}

async function login(call, callback) {
  try {
    const { email, password } = call.request;
    const user = await authService.login(email, password);

    callback(null, {
      message: "Login successful",
      role: user.role,
      id: user.id,
      staffId: user.staffId || 0,
      requiresInitialPassword: user.requiresInitialPassword || false,
    });
  } catch (error) {
    callback(null, {
      message: error.message,
      role: "",
      id: 0,
      staffId: 0,
      requiresInitialPassword: false,
    });
  }
}

async function setInitialPassword(call, callback) {
  try {
    const { email, password } = call.request;
    const result = await authService.setInitialPassword(email, password);

    callback(null, {
      message: result.message,
      role: result.role,
      id: result.id,
      staffId: 0,
      requiresInitialPassword: false,
    });
  } catch (error) {
    callback(null, {
      message: error.message,
      role: "",
      id: 0,
      staffId: 0,
      requiresInitialPassword: false,
    });
  }
}

async function getCoordinatorUser(call, callback) {
  try {
    const user = await authService.getCoordinatorUser();

    callback(null, {
      id: Number(user.id),
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      message: "Coordinator fetched successfully"
    });
  } catch (error) {
    callback({
      code: 500,
      message: error.message
    });
  }
}

async function checkInitialPasswordStatus(call, callback) {
  try {
    const { email } = call.request;
    const result = await authService.checkInitialPasswordStatus(email);

    callback(null, {
      message: result.message,
      accountExists: result.accountExists,
      requiresInitialPassword: result.requiresInitialPassword,
      role: result.role
    });
  } catch (error) {
    callback(null, {
      message: error.message,
      accountExists: false,
      requiresInitialPassword: false,
      role: ""
    });
  }
}
async function createCoordinator(call, callback) {
  try {
    const { name, email } = call.request;
    const result = await authService.createCoordinator(name, email);

    callback(null, {
      message: result.message,
      role: result.role,
      id: result.id,
      staffId: 0,
      requiresInitialPassword: true,
    });
  } catch (error) {
    callback(null, {
      message: error.message,
      role: "",
      id: 0,
      staffId: 0,
      requiresInitialPassword: false,
    });
  }
}

async function deleteCoordinator(call, callback) {
  try {
    const result = await authService.deleteCoordinator();

    callback(null, {
      message: result.message,
      role: "",
      id: result.id || 0,
      staffId: 0,
      requiresInitialPassword: false,
    });
  } catch (error) {
    callback(null, {
      message: error.message,
      role: "",
      id: 0,
      staffId: 0,
      requiresInitialPassword: false,
    });
  }
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