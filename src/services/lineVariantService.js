const { executeStoredProcedure } = require("../utils/dbUtils");

const getLineAndVariantData = async () => {
  const lineResult = await executeStoredProcedure("app_GetMasterData");
  const variantResult = await executeStoredProcedure("dbo.sp_GetVariantList");

  let masterData = lineResult.recordset || [];

  if (
    masterData.length === 1 &&
    typeof Object.values(masterData[0])[0] === "string"
  ) {
    const key = Object.keys(masterData[0])[0];
    masterData = JSON.parse(masterData[0][key]);
  }

  const lines = masterData
    .flatMap(c => c.Lines || [])
    .map(l => ({
      LineId: l.LineId,
      LineName: l.LineName,
    }));

  const uniqueLines = Array.from(
    new Map(lines.map(l => [l.LineId, l])).values()
  );

  const variants = (variantResult.recordset || [])
    .map(v => v.VariantCode || v.VariantName || v)
    .filter(Boolean);

  return {
    lines: uniqueLines,
    variants: [...new Set(variants)],
  };
};

module.exports = { getLineAndVariantData };