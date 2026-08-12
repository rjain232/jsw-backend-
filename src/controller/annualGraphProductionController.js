const annualGraphProductionService = require("../services/annualGraphProductionService");
const { getLineAndVariantData } = require("../services/lineVariantService");

const getAnnualGraphData = async (req, res, next) => {
  try {
    const { year, lineId, shift, month } = req.query;
    let { variantCode } = req.query;
    if (variantCode) variantCode = variantCode.trim().toUpperCase();

    if (variantCode) {
      const validVariantCodes = await annualGraphProductionService.getValidVariantCodes();
      if (!validVariantCodes.includes(variantCode)) {
        return res.status(400).json({
          success: false,
          message: `Invalid variantCode "${variantCode}". Accepted: ${validVariantCodes.join(", ")}.`,
        });
      }
    }

    const currentYear = new Date().getFullYear();
    let resolvedYear = currentYear;
    if (year !== undefined && year !== "") {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return res.status(400).json({ success: false, message: `Invalid year "${year}".` });
      }
      resolvedYear = y;
    }

    const parsedMonth = month !== undefined && month !== "" ? parseInt(month, 10) : null;
    if (parsedMonth !== null && (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)) {
      return res.status(400).json({ success: false, message: `Invalid month "${month}". Must be 1-12.` });
    }

    if (lineId !== undefined && lineId !== "" && isNaN(parseInt(lineId, 10))) {
      return res.status(400).json({ success: false, message: `Invalid lineId "${lineId}". Must be numeric.` });
    }

    const { lines } = await getLineAndVariantData();
    const firstLine = lines?.[0] || null;
    const resolvedLine = lineId && lineId !== ""
      ? { LineId: parseInt(lineId, 10), LineName: lines.find(l => l.LineId === parseInt(lineId, 10))?.LineName || lineId }
      : firstLine;

    const data = await annualGraphProductionService.getAnnualGraphData({
      year:        resolvedYear,
      lineId:      resolvedLine?.LineId || null, 
      shift,
      month:       parsedMonth,
      variantCode: variantCode || null,
    });

    const response = {
      success:         true,
      year:            resolvedYear,
      month:           parsedMonth || "All",
      shift:           shift && shift.trim() ? shift.trim() : "All",
      lineId:          resolvedLine?.LineId   || "All",
      lineName:        resolvedLine?.LineName || "All",
      variant:         variantCode || "All",
      monthlyData:     data.monthlyData,
      progressiveData: data.progressiveData,
      detailData:      data.detailData,
    };

    return res.json(response);
  } catch (error) {
    console.error("Annual Graph API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAnnualGraphData };