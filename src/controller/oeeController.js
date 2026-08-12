const oeeService = require("../services/oeeService");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 999999;

// ── GET /api/oee/report ───────────────────────────────────────────────────────
const getReport = async (req, res, next) => {
  try {
    const { lineId, stationId, startDate, endDate, shifts, page, pageSize } =
      req.query;

    // Validate numeric IDs
    for (const [name, val] of [
      ["lineId", lineId],
      ["stationId", stationId],
    ]) {
      if (val !== undefined && val !== "" && isNaN(parseInt(val, 10))) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${name} "${val}". Must be numeric.`,
        });
      }
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate must not be after endDate.",
      });
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const parsedSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
    );

    const { summary, subStations, totalRecords, tableData } =
      await oeeService.getReport({
        lineId: lineId || null,
        stationId: stationId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        shifts: shifts || null,
        pageNumber,
        pageSize: parsedSize,
      });

    const totalPages = Math.ceil(totalRecords / parsedSize);

    return res.json({
      success: true,
      summary,
      subStations,
      pagination: {
        page: pageNumber,
        pageSize: parsedSize,
        totalRecords,
        totalPages,
      },
      tableData,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getReport };
