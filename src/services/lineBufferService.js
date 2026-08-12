const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const getLineBufferData = async ({
  clusterId,
  lineId,
  selectedDate,
}) => {
  const result = await executeStoredProcedure("dbo.app_GetLineBufferStatusHistory", {
    ClusterId: { type: sql.Int, value: clusterId ?? null },
    LineId: { type: sql.Int, value: lineId ?? null },
    SelectedDate: { type: sql.Date, value: selectedDate ?? null },
  });

  const totalRecords = result.recordsets?.[0]?.[0]?.TotalRecords ?? 0;
  const tableData = result.recordsets?.[1] || [];

  return { totalRecords, tableData };
};

module.exports = { getLineBufferData };
