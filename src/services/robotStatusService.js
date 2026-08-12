const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const getRobotStatus = async ({
  areaId,
  lineId,
  stationId,
  robotId,
  startDate,
  endDate,
}) => {
  try {
    const result = await executeStoredProcedure("dbo.app_Robot_Status", {
      AreaId: { type: sql.Int, value: areaId ? parseInt(areaId, 10) : null },
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
    console.error("Robot Status Service Error:", error);
    throw error;
  }
};

module.exports = { getRobotStatus };
