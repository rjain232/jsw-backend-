const lineCycleTimeService = require("../services/lineCycleTimeService");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 999999;

// ── GET /api/line-cycle-time/report ──────────────────────────────────────
const getReport = async (req, res, next) => {
  try {
    const {
      areaId,
      lineId,
      shift,
      variantCode,
      startDate,
      endDate,
      startTime,
      endTime,
      page,
      pageSize,
    } = req.query;

    for (const [name, val] of [
      ["areaId", areaId],
      ["lineId", lineId],
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

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const parsedSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
    );

    const { totalRecords, tableData } = await lineCycleTimeService.getReport({
      areaId: areaId || null,
      lineId: lineId || null,
      shift: shift || null,
      variantCode: variantCode || null,
      startDate: startDate || null,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
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

module.exports = { getReport };
