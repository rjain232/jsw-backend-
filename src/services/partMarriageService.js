
const sql = require("mssql");
const { executeStoredProcedure } = require("../utils/dbUtils");

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

const buildCacheKey = ({
  fromDate,
  toDate,
  clusterId,
  lineId,
  stationId,
  subStationId,
  shift,
  pageNumber,
  pageSize,
}) =>
  [
    fromDate ?? "",
    toDate ?? "",
    clusterId ?? "",
    lineId ?? "",
    stationId ?? "",
    subStationId ?? "",
    shift ?? "All",
    pageNumber ?? 1,
    pageSize ?? 50,
  ].join("|");

const evictExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiry) cache.delete(key);
  }
};

const getPartMarriageData = async ({
  fromDate,
  toDate,
  clusterId,
  lineId,
  stationId,
  subStationId,
  shift,
  pageNumber = 1,
  pageSize = 50,
}) => {
  const safePageNumber = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 50;

  const params = {
    fromDate,
    toDate,
    clusterId,
    lineId,
    stationId,
    subStationId,
    shift,
    pageNumber: safePageNumber,
    pageSize: safePageSize,
  };

  const cacheKey = buildCacheKey(params);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now < cached.expiry) {
    return cached.data;
  }

  if (cache.size > 100) {
    evictExpiredCache();
  }

  const commonSpParams = {
    ClusterId: { type: sql.Int, value: clusterId ?? null },
    LineId: { type: sql.Int, value: lineId ?? null },
    StationId: { type: sql.Int, value: stationId ?? null },
    SubStationId: { type: sql.Int, value: subStationId ?? null },
    Shifts: { type: sql.VarChar(20), value: (!shift || shift === 'All') ? null : shift },
    StartDate: { type: sql.Date, value: fromDate },
    EndDate: { type: sql.Date, value: toDate },
  };

  const chartData = await executeStoredProcedure(
    "dbo.app_GetPartMarriageGraphData",
    commonSpParams,
  );

  const tableData = await executeStoredProcedure("dbo.app_GetPartMarriagePaginated", {
    ...commonSpParams,
    PageNumber: { type: sql.Int, value: safePageNumber },
    PageSize: { type: sql.Int, value: safePageSize },
  });

  const [countRecordset, dataRecordset] = tableData.recordsets;
  const totalCount = countRecordset?.[0]?.TotalCount ?? 0;

  const response = {
    pagination: {
      pageNumber: safePageNumber,
      pageSize: safePageSize,
      totalCount,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / safePageSize),
    },
    tableData: dataRecordset ?? [],
    chartData: chartData.recordset ?? [],
  };

  cache.set(cacheKey, {
    data: response,
    expiry: now + CACHE_TTL_MS,
  });

  return response;
};

module.exports = { getPartMarriageData };
