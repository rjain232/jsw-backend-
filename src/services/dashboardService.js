const { executeStoredProcedure, sql } = require("../utils/dbUtils");


const getProductionOeeData = async({range}) => {
    const productionOeeResult = await executeStoredProcedure(
        "dbo.app_productionOeeOverivew",
        {
            DateRange: { type: sql.NVarChar(50), value: range ?? null },
        }
    );
    return productionOeeResult.recordsets;

}

const getJPHDetails = async({range}) => {
    const jphResult = await executeStoredProcedure(
        "dbo.app_GetJphDetails",
        {
            DateRange: { type: sql.NVarChar(50), value: range ?? null },
        }
    );
    return jphResult.recordsets;
}

module.exports = {
    getProductionOeeData,
    getJPHDetails
};