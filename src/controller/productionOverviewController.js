const productionOverviewService = require("../services/productionOverviewService");

const getProductionOverview = async (req, res, next) => {
  try {
    const { lineId, fromDate, toDate, shift, pageNumber, pageSize } = req.query;

    if (!lineId || !fromDate || !toDate) {
      return res
        .status(400)
        .json({
          success: false,
          message: "lineId, fromDate and toDate are required",
        });
    }

    const data = await productionOverviewService.getProductionOverview({
      lineId,
      fromDate,
      toDate,
      shift,
      pageNumber,
      pageSize,
    });

    return res.json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getProductionOverview };
