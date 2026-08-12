const sql = require("mssql");
const { getPool } = require("../config/db");

const executeStoredProcedure = async (spName, params = {}) => {
  try {
    const pool = getPool();
    const request = pool.request();

    for (const key in params) {
      const param = params[key];

      if (
        param !== null &&
        typeof param === "object" &&
        "type" in param &&
        "value" in param
      ) {
        request.input(key, param.type, param.value);
      } else {
        request.input(key, param);
      }
    }

    return await request.execute(spName);
  } catch (err) {
    // Create a new error object to ensure a consistent error structure.
    const newErr = new Error(`Failed to execute stored procedure ${spName}: ${err.message}`);
    newErr.originalError = err; // Preserve the original error for debugging
    throw newErr;
  }
};

const parseJsonResult = (recordset) => {
  if (!recordset || recordset.length === 0) return null;

  const firstKey = Object.keys(recordset[0])[0];
  const jsonString = recordset.map((row) => row[firstKey]).join("");

  return JSON.parse(jsonString);
};

module.exports = { executeStoredProcedure, parseJsonResult, sql };
