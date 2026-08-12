const { executeStoredProcedure, sql } = require("../utils/dbUtils");

// ── Cache config ───────────────────────────────────────────────────────────
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min  — fully historical range
const TODAY_TTL_MS = 15 * 1000; // 15s   — range includes today

const reportCache = new Map();

const getTodayStr = () => new Date().toISOString().split("T")[0];

const getCacheTTL = (startDate, endDate) => {
  if (!startDate && !endDate) return 0; // real-time, skip cache
  const today = getTodayStr();
  const end = endDate || today;
  return end >= today ? TODAY_TTL_MS : HISTORICAL_TTL_MS;
};

const evictExpired = (cache) => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiry) cache.delete(key);
  }
};

const buildKey = (params) =>
  Object.values(params)
    .map((v) => v ?? "")
    .join("|");

// ── Report: paginated line cycle time records ─────────────────────────────
const getReport = async (params) => {
  const { startDate, endDate } = params;
  const ttl = getCacheTTL(startDate, endDate);
  const now = Date.now();

  if (ttl > 0) {
    const key = buildKey(params);
    const cached = reportCache.get(key);
    if (cached && now < cached.expiry) return cached.data;
    if (reportCache.size > 100) evictExpired(reportCache);
    const data = await fetchReport(params);
    reportCache.set(key, { data, expiry: now + ttl });
    return data;
  }

  return await fetchReport(params);
};

const fetchReport = async ({
  areaId,
  lineId,
  shift,
  variantCode,
  startDate,
  endDate,
  startTime,
  endTime,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure(
    "dbo.app_Line_Cycle_Time_Report",
    {
      AreaId: { type: sql.Int, value: areaId ? parseInt(areaId, 10) : null },
      LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
      Shift: { type: sql.VarChar(1), value: shift || null },
      VariantCode: {
        type: sql.Int,
        value: variantCode ? parseInt(variantCode, 10) : null,
      },
      StartDate: { type: sql.Date, value: startDate || null },
      EndDate: { type: sql.Date, value: endDate || null },
      StartTime: { type: sql.VarChar(8), value: startTime || null },
      EndTime: { type: sql.VarChar(8), value: endTime || null },
      PageNumber: { type: sql.Int, value: pageNumber },
      PageSize: { type: sql.Int, value: pageSize },
    },
  );

  const totalRecords = result.recordsets?.[0]?.[0]?.TotalRecords ?? 0;
  const tableData = result.recordsets?.[1] || [];
  return { totalRecords, tableData };
};

module.exports = { getReport };
