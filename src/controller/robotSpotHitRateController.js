const { getSpotHitRate } = require("../services/robotSpotHitRateService");

const getRobotSpotHitRate = async (req, res, next) => {
  try {
    const { lineId, stationId, robotId, startDate, endDate } = req.query;

    const data = await getSpotHitRate({
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

module.exports = { getRobotSpotHitRate };
