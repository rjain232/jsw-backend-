const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const getDetailedProductionData = async ({
  areaId,
  lineId,
  startDate,
  endDate,
  shifts,
}) => {
  try {
    const result = await executeStoredProcedure(
      "dbo.app_Detailed_Production_Count",
      {
        AreaId: {
          type: sql.Int,
          value: areaId != null && areaId !== "" ? parseInt(areaId, 10) : null,
        },
        LineId: {
          type: sql.Int,
          value: lineId != null && lineId !== "" ? parseInt(lineId, 10) : null,
        },
        StartDate: {
          type: sql.Date,
          value: startDate != null && startDate !== "" ? startDate : null,
        },
        EndDate: {
          type: sql.Date,
          value: endDate != null && endDate !== "" ? endDate : null,
        },
        Shifts: {
          type: sql.NVarChar(50),
          value: shifts != null && shifts !== "" ? shifts : null,
        },
      },
    );

    return {
      productionChart: result.recordsets?.[0] || [],
      oee: result.recordsets?.[1] || [],
      tableData: result.recordsets?.[2] || [],
    };
  } catch (error) {
    console.error("Detailed Production Service Error:", error);
    throw error;
  }
};

module.exports = { getDetailedProductionData };
