const detailedProductionService = require("../services/detailedProductionService");
const { getLineAndVariantData } = require("../services/lineVariantService");

const getDetailedProductionData = async (req, res, next) => {
  try {
    const { areaId, lineId, startDate, endDate, shifts } = req.query;

    if (areaId !== undefined && areaId !== "" && isNaN(parseInt(areaId, 10))) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid areaId "${areaId}". Must be numeric.`,
        });
    }

    if (lineId !== undefined && lineId !== "" && isNaN(parseInt(lineId, 10))) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Invalid lineId "${lineId}". Must be numeric.`,
        });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "startDate must not be after endDate.",
        });
    }

    const { lines } = await getLineAndVariantData();
    const parsedLineId = lineId && lineId !== "" ? parseInt(lineId, 10) : null;
    const lineName = parsedLineId
      ? lines.find((l) => l.LineId === parsedLineId)?.LineName || null
      : null;

    const data = await detailedProductionService.getDetailedProductionData({
      areaId,
      lineId,
      startDate: startDate || null,
      endDate: endDate || null,
      shifts: shifts || null,
    });

    return res.json({
      success: true,
      areaId: areaId ? parseInt(areaId, 10) : null,
      lineId: parsedLineId,
      lineName: lineName,
      startDate: startDate || null,
      endDate: endDate || null,
      shifts: shifts || "All",
      productionChart: data.productionChart,
      oee: data.oee,
      tableData: data.tableData,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getDetailedProductionData };
