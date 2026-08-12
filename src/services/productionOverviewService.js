const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getProductionOverview = async ({
  lineId,
  fromDate,
  toDate,
  shift,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_GetProductionOverview", {
    LineId: { type: sql.Int, value: toInt(lineId, null) },
    FromDate: { type: sql.Date, value: fromDate ?? null },
    ToDate: { type: sql.Date, value: toDate ?? null },
    Shift: { type: sql.Char(1), value: shift || null },
    PageNumber: { type: sql.Int, value: toInt(pageNumber, 1) },
    PageSize: { type: sql.Int, value: toInt(pageSize, 10) },
  });

  const [shiftSummary, countResult, shiftDetails] = result.recordsets;

  return {
    shiftSummary: shiftSummary ?? [],
    totalRecords: countResult?.[0]?.TotalRecords ?? 0,
    shiftDetails: shiftDetails ?? [],
  };
};

module.exports = { getProductionOverview };
