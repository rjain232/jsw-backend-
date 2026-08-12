const shiftSummaryService = require("../services/shiftSummaryService");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE     = 999999;

// GET /api/production/shift-summary-report
const getShiftSummaryReport = async (req, res, next) => {
  try {
    const {
      clusterId, lineId,
      shift, startDate, endDate,
      page, pageSize,
    } = req.query;

    // Validate numeric IDs
    for (const [name, val] of [
      ["clusterId", clusterId],
      ["lineId",    lineId],
    ]) {
      if (val !== undefined && val !== "" && isNaN(parseInt(val, 10))) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${name} "${val}". Must be numeric.`,
        });
      }
    }

    if (shift && !["A", "B", "C"].includes(shift)) {
      return res.status(400).json({
        success: false,
        message: `Invalid shift "${shift}". Must be A, B, or C.`,
      });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate must not be after endDate.",
      });
    }

    const pageNumber  = Math.max(1, parseInt(page, 10) || 1);
    const parsedSize  = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
    );

    const { totalRecords, tableData } = await shiftSummaryService.getShiftSummaryReport({
      clusterId:  clusterId  || null,
      lineId:     lineId     || null,
      shift:      shift      || null,
      startDate:  startDate  || null,
      endDate:    endDate    || null,
      pageNumber,
      pageSize:   parsedSize,
    });

    const totalPages = Math.ceil(totalRecords / parsedSize);

    return res.json({
      success: true,
      pagination: { page: pageNumber, pageSize: parsedSize, totalRecords, totalPages },
      tableData,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getShiftSummaryReport };
