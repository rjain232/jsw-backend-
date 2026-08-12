const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const normalizeTop = (value) => {
  if (value === undefined) return 100;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    const error = new Error("top must be a positive integer");
    error.statusCode = 400;
    throw error;
  }
  return Math.min(parsed, 1000);
};

const getProductionTransactions = async ({
  top,
  lineId,
  hourId,
  shift,
  date,
  from,
  to,
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

  const result = await executeStoredProcedure(
    "dbo.app_GetProductionTransactions",
    {
      top: { type: sql.Int, value: normalizeTop(top) },
      lineId: {
        type: sql.Int,
        value: lineId !== undefined ? parseInt(lineId, 10) : null,
      },
      hourId: {
        type: sql.Int,
        value: hourId !== undefined ? parseInt(hourId, 10) : null,
      },
      shift: { type: sql.NVarChar(50), value: shift ?? null },
      date: { type: sql.Date, value: date ?? null },
      from: { type: sql.DateTime2, value: from ?? null },
      to: { type: sql.DateTime2, value: to ?? null },
    },
  );

  return result.recordset;
};

const getProductionSummary = async ({ from, to, shifts }) => {
  try {
    const result = await executeStoredProcedure(
      "dbo.app_GetProductionSummary",
      {
        from: { type: sql.DateTime, value: from },
        to: { type: sql.DateTime, value: to },
        shifts: { type: sql.VarChar(20), value: shifts || null },
      },
    );

    return result.recordset;
  } catch (err) {
    throw err;
  }
};

module.exports = { getProductionTransactions, getProductionSummary };
