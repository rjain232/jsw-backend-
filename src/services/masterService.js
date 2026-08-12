const { executeStoredProcedure, parseJsonResult } = require("../utils/dbUtils");

const getMasterData = async () => {
  const result = await executeStoredProcedure("app_GetMasterData");
  return parseJsonResult(result.recordset);
};

module.exports = { getMasterData };
