const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const getHourlyProductionReport = async ({
  lineId,
  clusterId,
  model,
  shift,
  date,
  from,
  to,
  hourId,
  pageNumber,
  pageSize,
}) => {
  if (date && (from || to)) {
    const error = new Error("Use either 'date' or 'from'/'to', not both");
    error.statusCode = 400;
    throw error;
  }
  if (from && to && new Date(from) > new Date(to)) {
    const error = new Error("'from' must be earlier than 'to'");
    error.statusCode = 400;
    throw error;
  }

  const shiftValue = Array.isArray(shift) ? shift.join(",") : (shift ?? null);

  const result = await executeStoredProcedure(
    "dbo.app_GetHourlyProductionReport",
    {
      lineId: {
        type: sql.Int,
        value: lineId !== undefined ? parseInt(lineId, 10) : null,
      },
      clusterId: {
        type: sql.Int,
        value: clusterId !== undefined ? parseInt(clusterId, 10) : null,
      },
      model: { type: sql.NVarChar(100), value: model ?? null },
      shift: { type: sql.NVarChar(sql.MAX), value: shiftValue },
      date: { type: sql.Date, value: date ?? null },
      from: { type: sql.DateTime2, value: from ?? null },
      to: { type: sql.DateTime2, value: to ?? null },
      hourId: {
        type: sql.Int,
        value: hourId !== undefined ? parseInt(hourId, 10) : null,
      },
      pageNumber: {
        type: sql.Int,
        value: pageNumber !== undefined ? parseInt(pageNumber, 10) : 1,
      },
      pageSize: {
        type: sql.Int,
        value: pageSize !== undefined ? parseInt(pageSize, 10) : 24,
      },
    },
  );

  return result.recordset;
};

const updateHourlyProductionRemark = async (Id, VariantCode, Remark) => {
  const result = await executeStoredProcedure(
    "dbo.app_UpdateHourlyProductionRemark",
    {
      Id: { type: sql.Int, value: Id },
      VariantCode: { type: sql.NVarChar(10), value: VariantCode },
      Remark: { type: sql.NVarChar(sql.MAX), value: Remark },
    },
  );

  return result.recordset;
};

module.exports = { getHourlyProductionReport, updateHourlyProductionRemark };
