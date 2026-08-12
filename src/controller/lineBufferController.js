const lineBufferService = require("../services/lineBufferService");

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 10;

const createHttpError = (message, statusCode = 400, payload = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.payload = {
    success: false,
    message,
    ...payload,
  };
  return error;
};

const parseOptionalInteger = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const getDefaultSelectedDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeSelectedDate = (value) => {
  if (value === undefined || value === null) {
    return getDefaultSelectedDate();
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue === "" || trimmedValue.toLowerCase() === "null") {
      return getDefaultSelectedDate();
    }

    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
};

const getLineBufferData = async (req, res, next) => {
  try {
    const { clusterId, lineId, selectedDate } = req.query;

    const parsedClusterId = parseOptionalInteger(clusterId);
    const parsedLineId = parseOptionalInteger(lineId);

    if (
      parsedClusterId === null &&
      clusterId !== undefined &&
      clusterId !== ""
    ) {
      return next(createHttpError("clusterId must be a number"));
    }

    if (parsedLineId === null && lineId !== undefined && lineId !== "") {
      return next(createHttpError("lineId must be a number"));
    }


    const normalizedSelectedDate = normalizeSelectedDate(selectedDate);

    if (normalizedSelectedDate === null) {
      return next(createHttpError("selectedDate must be a valid date"));
    }

    const { totalRecords, tableData } =
      await lineBufferService.getLineBufferData({
        clusterId: parsedClusterId,
        lineId: parsedLineId,
        selectedDate: normalizedSelectedDate,
      });


    return res.json({
      success: true,
      clusterId: parsedClusterId,
      lineId: parsedLineId,
      selectedDate: normalizedSelectedDate,
      totalRecords,
      tableData,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getLineBufferData };
