const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const getSpotHitRate = async ({
  lineId,
  stationId,
  robotId,
  startDate,
  endDate,
}) => {
  try {
    const result = await executeStoredProcedure("dbo.app_Robot_SpotHitRate", {
      LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
      StationId: {
        type: sql.Int,
        value: stationId ? parseInt(stationId, 10) : null,
      },
      RobotId: { type: sql.Int, value: robotId ? parseInt(robotId, 10) : null },
      StartDate: { type: sql.Date, value: startDate || null },
      EndDate: { type: sql.Date, value: endDate || null },
    });

    return result.recordset || [];
  } catch (error) {
    console.error("Robot SpotHitRate Service Error:", error);
    throw error;
  }
};

module.exports = { getSpotHitRate };
