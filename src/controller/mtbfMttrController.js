const mtbfMttrService = require("../services/mtbfMttrService");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 999999;

// ── GET /api/mtbf-mttr/report ─────────────────────────────────────────────────
const getReport = async (req, res, next) => {
  try {
    const {
      areaId,
      lineId,
      stationId,
      startDate,
      endDate,
      shifts,
      page,
      pageSize,
    } = req.query;

    // Validate numeric IDs
    for (const [name, val] of [
      ["areaId", areaId],
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

    const { chartData, totalRecords, tableData } =
      await mtbfMttrService.getReport({
        areaId: areaId || null,
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
      chartData,
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
