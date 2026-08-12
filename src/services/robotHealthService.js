const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const getRobotHealth = async ({ stationId, robotId }) => {
  try {
    const result = await executeStoredProcedure("dbo.app_Robot_Health", {
      StationId: {
        type: sql.Int,
        value:
          stationId != null && stationId !== ""
            ? parseInt(stationId, 10)
            : null,
      },
      RobotId: {
        type: sql.Int,
        value: robotId != null && robotId !== "" ? parseInt(robotId, 10) : null,
      },
    });

    return result.recordset || [];
  } catch (error) {
    console.error("Robot Health Service Error:", error);
    throw error;
  }
};

module.exports = { getRobotHealth };
