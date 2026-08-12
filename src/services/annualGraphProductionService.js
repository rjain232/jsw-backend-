const { executeStoredProcedure, sql } = require("../utils/dbUtils");
const { getLineAndVariantData } = require("./lineVariantService") 

let cachedVariants = null;
let cacheExpiry    = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getValidVariantCodes = async () => {
  const now = Date.now();
  if (cachedVariants && now < cacheExpiry) return cachedVariants;

  const { variants } = await getLineAndVariantData();
  cachedVariants = variants.map(v => v.toString().trim().toUpperCase());
  cacheExpiry    = now + CACHE_TTL_MS;
  return cachedVariants;
};


const getAnnualGraphData = async ({ year, lineId, shift, month, variantCode }) => {
  try {
    const validVariantCodes = await getValidVariantCodes();

    const finalVariantCode =
      variantCode && validVariantCodes.includes(variantCode.toString().trim().toUpperCase())
        ? variantCode.toString().trim().toUpperCase()
        : null;

    const parsedYear   = year   != null && year   !== "" ? parseInt(year,   10) : null;
    const parsedLineId = lineId != null && lineId !== "" ? parseInt(lineId,  10) : null;
    const parsedMonth  = month  != null && month  !== "" ? parseInt(month,   10) : null;
    const parsedShift  = shift  && shift.toString().trim() !== "" ? shift.toString().trim() : null;

    const result = await executeStoredProcedure(
      "dbo.app_GetAnnualProductionReportByVariant",
      {
        year:        { type: sql.Int,               value: parsedYear       },
        lineId:      { type: sql.Int,               value: parsedLineId     },
        shift:       { type: sql.NVarChar(sql.MAX), value: parsedShift      },
        month:       { type: sql.Int,               value: parsedMonth      },
        variantCode: { type: sql.NVarChar(50),      value: finalVariantCode },
      }
    );

    return {
      monthlyData:     result.recordsets?.[0] || [],
      progressiveData: result.recordsets?.[1] || [],
      detailData:      result.recordsets?.[2] || [],
    };
  } catch (error) {
    console.error("Annual Graph Service Error:", error);
    throw error;
  }
};

module.exports = { getAnnualGraphData, getValidVariantCodes };