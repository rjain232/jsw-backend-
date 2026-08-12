const { getRobotStatus } = require("../services/robotStatusService");

const getRobotStatusReport = async (req, res, next) => {
  try {
    const { areaId, lineId, stationId, robotId, startDate, endDate } =
      req.query;

    const data = await getRobotStatus({
      areaId: areaId || null,
      lineId: lineId || null,
      stationId: stationId || null,
      robotId: robotId || null,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getRobotStatusReport };
