const lossesAnalysisService = require("../services/lossesAnalysisService");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 999999;

// ── GET /api/losses-analysis/report ──────────────────────────────────────────
const getReport = async (req, res, next) => {
  try {
    const {
      areaId,
      lineId,
      stationId,
      shift,
      startDate,
      endDate,
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

    if (!lineId || lineId === "") {
      return res.status(400).json({
        success: false,
        message: "lineId is required.",
      });
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

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const parsedSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
    );

    const { totalRecords, tableData } = await lossesAnalysisService.getReport({
      areaId: areaId || null,
      lineId: lineId || null,
      stationId: stationId || null,
      shift: shift || null,
      startDate: startDate || null,
      endDate: endDate || null,
      pageNumber,
      pageSize: parsedSize,
    });

    const totalPages = Math.ceil(totalRecords / parsedSize);

    return res.json({
      success: true,
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

// ── GET /api/losses-analysis/loss-types ──────────────────────────────────────
const getLossTypes = async (req, res, next) => {
  try {
    const lossTypes = await lossesAnalysisService.getLossTypes();
    return res.json({ success: true, lossTypes });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getReport, getLossTypes };
