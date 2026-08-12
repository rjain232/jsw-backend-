const { getRobotHealth } = require("../services/robotHealthService");

const getRobotHealthStatus = async (req, res, next) => {
  try {
    const { stationId, robotId } = req.query;

    if (
      stationId !== undefined &&
      stationId !== "" &&
      isNaN(parseInt(stationId, 10))
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid stationId "${stationId}". Must be numeric.`,
        });
    }

    if (
      robotId !== undefined &&
      robotId !== "" &&
      isNaN(parseInt(robotId, 10))
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid robotId "${robotId}". Must be numeric.`,
        });
    }

    const data = await getRobotHealth({
      stationId: stationId || null,
      robotId: robotId || null,
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getRobotHealthStatus };
