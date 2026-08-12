const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const appConfig = require("../config/appConfig");
const { getPool, sql } = require("../config/db");

const allowedRoles = new Set(appConfig.roleGroups.all);

const ensureUsersTable = async () => {
  await getPool().request().query(`
    IF OBJECT_ID('dbo.Users', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Users (
        Id NVARCHAR(100) NOT NULL PRIMARY KEY DEFAULT CONVERT(NVARCHAR(36), NEWID()),
        Name NVARCHAR(150) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT '${appConfig.roles.user}',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;
  `);
};

const initializeAuth = async () => {
  await ensureUsersTable();
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const mapUser = (record) => ({
  id: record.Id,
  name: record.Name,
  email: record.Email,
  role: record.Role,
  createdAt: record.CreatedAt,
  updatedAt: record.UpdatedAt,
});

const createToken = (user) => {
  if (!appConfig.jwtSecret) {
    throw createError("JWT secret is not configured", 500);
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    appConfig.jwtSecret,
    { expiresIn: appConfig.jwtExpiresIn }
  );
};

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};


const validatePassword = (password) => {
  if (String(password || "").length < 6) {
    throw createError("Password must be at least 6 characters", 400);
  }
};

const validateRole = (role) => {
  const normalizedRole = String(role || "").toLowerCase();

  if (!allowedRoles.has(normalizedRole)) {
    throw createError(`Role must be ${appConfig.roleGroups.all.join(", ")}`, 400);
  }

  return normalizedRole;
};

const validateCreateUserInput = ({ name, email, password, role }) => {
  if (!String(name || "").trim()) {
    throw createError("Name is required", 400);
  }

  if (!normalizeEmail(email)) {
    throw createError("Email is required", 400);
  }

  validatePassword(password);
  return validateRole(role);
};

const countSuperAdmins = async (transaction) => {
  const request = transaction ? new sql.Request(transaction) : getPool().request();
  const result = await request
    .input("role", sql.NVarChar(50), appConfig.roles.superadmin)
    .query("SELECT COUNT(*) AS Total FROM dbo.Users WHERE Role = @role");
  return result.recordset[0].Total;
};

const ensureEmailIsAvailable = async (email, transaction, excludedUserId = null) => {
  const request = new sql.Request(transaction)
    .input("email", sql.NVarChar(255), email)
    .input("excludedUserId", sql.NVarChar(100), excludedUserId);

  const result = await request.query(`
    SELECT Id
    FROM dbo.Users
    WHERE Email = @email
      AND (@excludedUserId IS NULL OR Id <> @excludedUserId)
  `);

  if (result.recordset.length > 0) {
    throw createError("Email already exists", 409);
  }
};


const setupSuperAdmin = async ({ setupKey, name, email, password }) => {
  if (!appConfig.superAdminSetupKey) {
    throw createError("Superadmin setup key is not configured", 500);
  }

  if (setupKey !== appConfig.superAdminSetupKey) {
    throw createError("Invalid setup key", 403);
  }

  const role = validateCreateUserInput({
    name,
    email,
    password,
    role: appConfig.roles.superadmin,
  });
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(String(password), 10);
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const superAdminCount = await countSuperAdmins(transaction);

    if (superAdminCount > 0) {
      throw createError("Superadmin is already configured", 409);
    }

    await ensureEmailIsAvailable(normalizedEmail, transaction);

    const result = await new sql.Request(transaction)
      .input("name", sql.NVarChar(150), String(name).trim())
      .input("email", sql.NVarChar(255), normalizedEmail)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("role", sql.NVarChar(50), role)
      .query(`
        INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
        OUTPUT inserted.Id, inserted.Name, inserted.Email, inserted.Role, inserted.CreatedAt, inserted.UpdatedAt
        VALUES (@name, @email, @passwordHash, @role)
      `);

    await transaction.commit();

    const user = mapUser(result.recordset[0]);
    return { user, token: createToken(user) };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const login = async ({ email, password }) => {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      const error = new Error("Email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const result = await getPool()
      .request()
      .input("email", sql.NVarChar(255), normalizedEmail)
      .query(`
        SELECT Id, Name, Email, PasswordHash, Role, CreatedAt, UpdatedAt
        FROM dbo.Users
        WHERE Email = @email
      `);

    const record = result.recordset[0];

    if (!record || !(await bcrypt.compare(String(password), record.PasswordHash))) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const user = mapUser(record);
    return { user, token: createToken(user) };
  } catch (error) {
    console.error("Error in authService.login:", error);
    throw error;
  }
};

const getUsers = async () => {
  const result = await getPool().request().query(`
    SELECT Id, Name, Email, Role, CreatedAt, UpdatedAt
    FROM dbo.Users
    ORDER BY Name ASC, Email ASC
  `);

  return result.recordset.map(mapUser);
};

const createUser = async ({ name, email, password, role }) => {
  const normalizedRole = validateCreateUserInput({ name, email, password, role });
  if (normalizedRole === appConfig.roles.superadmin) {
    throw createError("Superadmin can only be created via setup endpoint", 400);
  }
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(String(password), 10);
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    await ensureEmailIsAvailable(normalizedEmail, transaction);

    const result = await new sql.Request(transaction)
      .input("name", sql.NVarChar(150), String(name).trim())
      .input("email", sql.NVarChar(255), normalizedEmail)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("role", sql.NVarChar(50), normalizedRole)
      .query(`
        INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
        OUTPUT inserted.Id, inserted.Name, inserted.Email, inserted.Role, inserted.CreatedAt, inserted.UpdatedAt
        VALUES (@name, @email, @passwordHash, @role)
      `);

    await transaction.commit();
    return { user: mapUser(result.recordset[0]) };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getUserById = async (userId, transaction) => {
  const result = await new sql.Request(transaction)
    .input("userId", sql.NVarChar(100), String(userId))
    .query(`
      SELECT Id, Name, Email, Role, CreatedAt, UpdatedAt
      FROM dbo.Users
      WHERE Id = @userId
    `);

  return result.recordset[0] || null;
};

const updateUser = async (userId, { name, email, password, role }) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const existingUser = await getUserById(userId, transaction);

    if (!existingUser) {
      throw createError("User not found", 404);
    }

    const nextName = name === undefined ? existingUser.Name : String(name).trim();
    const nextEmail = email === undefined ? existingUser.Email : normalizeEmail(email);
    const desiredRole = role === undefined ? existingUser.Role : validateRole(role);
    if (
      desiredRole === appConfig.roles.superadmin &&
      existingUser.Role !== appConfig.roles.superadmin
    ) {
      throw createError("Superadmin can only be created via setup endpoint", 400);
    }
    const nextRole = desiredRole;
    let passwordHash = null;

    if (!nextName) {
      throw createError("Name is required", 400);
    }

    if (!nextEmail) {
      throw createError("Email is required", 400);
    }

    if (password !== undefined) {
      validatePassword(password);
      passwordHash = await bcrypt.hash(String(password), 10);
    }

    if (
      existingUser.Role === appConfig.roles.superadmin &&
      desiredRole !== appConfig.roles.superadmin
    ) {
      const superAdminCount = await countSuperAdmins(transaction);

      if (superAdminCount <= 1) {
        throw createError("At least one superadmin is required", 400);
      }
    }

    await ensureEmailIsAvailable(nextEmail, transaction, String(userId));

    const result = await new sql.Request(transaction)
      .input("userId", sql.NVarChar(100), String(userId))
      .input("name", sql.NVarChar(150), nextName)
      .input("email", sql.NVarChar(255), nextEmail)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("role", sql.NVarChar(50), nextRole)
      .query(`
        UPDATE dbo.Users
        SET
          Name = @name,
          Email = @email,
          PasswordHash = COALESCE(@passwordHash, PasswordHash),
          Role = @role,
          UpdatedAt = SYSUTCDATETIME()
        OUTPUT inserted.Id, inserted.Name, inserted.Email, inserted.Role, inserted.CreatedAt, inserted.UpdatedAt
        WHERE Id = @userId
      `);

    await transaction.commit();
    return { user: mapUser(result.recordset[0]) };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


const deleteUser = async (userId) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const existingUser = await getUserById(userId, transaction);

    if (!existingUser) {
      throw createError("User not found", 404);
    }

    if (existingUser.Role === appConfig.roles.superadmin) {
      const superAdminCount = await countSuperAdmins(transaction);

      if (superAdminCount <= 1) {
        throw createError("At least one superadmin is required", 400);
      }
    }

    await new sql.Request(transaction)
      .input("userId", sql.NVarChar(100), String(userId))
      .query("DELETE FROM dbo.UserPageAccess WHERE UserId = @userId");

    await new sql.Request(transaction)
      .input("userId", sql.NVarChar(100), String(userId))
      .query("DELETE FROM dbo.Users WHERE Id = @userId");

    await transaction.commit();
    return mapUser(existingUser);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  initializeAuth,
  setupSuperAdmin,
  login,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
