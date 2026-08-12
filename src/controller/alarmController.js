const alarmService = require("../services/alarmService");

const VALID_VIEW_TYPES = ["Equipment", "Duration", "Frequency"];
const VALID_TOP_COUNTS = [5, 10, 15, 20];

const getAlarmCategories = async (req, res, next) => {
  try {
    const categories = await alarmService.getAlarmCategories();
    return res.json({ success: true, data: categories });
  } catch (error) {
    return next(error);
  }
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

const getAlarmReportData = async (req, res, next) => {
  try {
    const {
      areaId,
      lineId,
      stationId,
      equipmentId,
      shift,
      alarmCategory,
      startDate,
      endDate,
      page,
      pageSize,
    } = req.query;

    if (!lineId || lineId === "") {
      return res
        .status(400)
        .json({ success: false, message: "lineId is required." });
    }

    if (isNaN(parseInt(lineId, 10))) {
      return res.status(400).json({
        success: false,
        message: `Invalid lineId "${lineId}". Must be numeric.`,
      });
    }

    if (areaId !== undefined && areaId !== "" && isNaN(parseInt(areaId, 10))) {
      return res.status(400).json({
        success: false,
        message: `Invalid areaId "${areaId}". Must be numeric.`,
      });
    }

    if (
      stationId !== undefined &&
      stationId !== "" &&
      isNaN(parseInt(stationId, 10))
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid stationId "${stationId}". Must be numeric.`,
      });
    }

    if (
      equipmentId !== undefined &&
      equipmentId !== "" &&
      isNaN(parseInt(equipmentId, 10))
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid equipmentId "${equipmentId}". Must be numeric.`,
      });
    }

    if (
      shift !== undefined &&
      shift !== "" &&
      !["A", "B", "C"].includes(shift)
    ) {
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
    const parsedPageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
    );

    const data = await alarmService.getAlarmReportData({
      areaId: areaId || null,
      lineId,
      stationId: stationId || null,
      equipmentId: equipmentId || null,
      shift: shift || null,
      alarmCategory: alarmCategory || null,
      startDate: startDate || null,
      endDate: endDate || null,
      pageNumber,
      pageSize: parsedPageSize,
    });

    const totalRecords = data.kpiCards?.TotalAlarms ?? 0;
    const totalPages = Math.ceil(totalRecords / parsedPageSize);

    return res.json({
      success: true,
      filters: {
        areaId: areaId ? parseInt(areaId, 10) : null,
        lineId: parseInt(lineId, 10),
        stationId: stationId ? parseInt(stationId, 10) : null,
        equipmentId: equipmentId ? parseInt(equipmentId, 10) : null,
        shift: shift || "All",
        alarmCategory: alarmCategory || "All",
        startDate: startDate || null,
        endDate: endDate || null,
      },
      pagination: {
        page: pageNumber,
        pageSize: parsedPageSize,
        totalRecords,
        totalPages,
      },
      kpiCards: data.kpiCards,
      graph: data.graph,
      tableData: data.tableData,
    });
  } catch (error) {
    return next(error);
  }
};

const getTopXAlarmsData = async (req, res, next) => {
  try {
    const {
      areaName,
      lineName,
      stationName,
      equipmentName,
      shift,
      startDate,
      endDate,
      viewType,
      topCount,
    } = req.query;

    const resolvedViewType = viewType || "Frequency";
    if (!VALID_VIEW_TYPES.includes(resolvedViewType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid viewType "${resolvedViewType}". Must be one of: ${VALID_VIEW_TYPES.join(", ")}.`,
      });
    }

    const parsedTopCount = parseInt(topCount, 10) || 10;
    if (!VALID_TOP_COUNTS.includes(parsedTopCount)) {
      return res.status(400).json({
        success: false,
        message: `Invalid topCount "${topCount}". Must be one of: ${VALID_TOP_COUNTS.join(", ")}.`,
      });
    }

    let shiftChar = null;
    if (shift && shift !== "All") {
      const match = shift.match(/^Shift\s+([ABC])$/i);
      if (match) {
        shiftChar = match[1].toUpperCase();
      } else if (["A", "B", "C"].includes(shift)) {
        shiftChar = shift;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid shift "${shift}". Must be "Shift A", "Shift B", "Shift C", or "All".`,
        });
      }
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate must not be after endDate.",
      });
    }

    const data = await alarmService.getTopXAlarmsData({
      areaName: areaName || null,
      lineName: lineName || null,
      stationName: stationName || null,
      equipmentName: equipmentName || null,
      shift: shiftChar,
      startDate: startDate || null,
      endDate: endDate || null,
      viewType: resolvedViewType,
      topCount: parsedTopCount,
    });

    return res.json({
      success: true,
      summary: data.summary,
      data: data.data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAlarmReportData, getAlarmCategories, getTopXAlarmsData };
