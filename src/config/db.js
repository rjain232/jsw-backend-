const sql = require("mssql");
require("dotenv").config();

// Function to create the config object, allows for dynamic instance handling
const createDbConfig = () => {
  const dbServer = process.env.DB_SERVER || "";
  const serverParts = dbServer.split('\\');
  const isNamedInstance = serverParts.length > 1;

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 15000,
    pool: {
      max: 20,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
    },
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  if (isNamedInstance) {
    config.server = serverParts[0];
    config.options.instanceName = serverParts[1];
    // For named instances, it's better to let the SQL Browser resolve the port
    // but if a specific port is provided, we can use it.
    if (process.env.DB_PORT) {
        config.port = parseInt(process.env.DB_PORT, 10);
    }
  } else {
    config.server = dbServer;
    config.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433;
  }

  return config;
};

const config = createDbConfig();

let pool;

const connectDB = async () => {
  try {
    // Log config for debugging, but exclude the password
    const configForLogging = { ...config };
    delete configForLogging.password;
    console.log("Attempting to connect with config:", configForLogging);

    pool = await sql.connect(config);
    console.log(
      `✅ MSSQL Connected to ${config.database} on ${config.server}`
    );
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
    // Log the original error code for more specific troubleshooting
    if (err.originalError) {
      console.error("Original Error:", err.originalError);
    }
    throw err;
  }
};

const getPool = () => {
  if (!pool) throw new Error("DB not initialized. The database connection likely failed on startup.");
  return pool;
};

module.exports = { connectDB, getPool, sql };
