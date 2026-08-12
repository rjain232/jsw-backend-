const { executeStoredProcedure, sql } = require("../utils/dbUtils");

// ── Cache config ───────────────────────────────────────────────────────────
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min — fully historical
const TODAY_TTL_MS      = 15 * 1000;     // 15 s  — range includes today

const reportCache = new Map();

const getTodayStr = () => new Date().toISOString().split("T")[0];

const getCacheTTL = (startDate, endDate) => {
  if (!startDate && !endDate) return 0;
  const today = getTodayStr();
  const end   = endDate || today;
  return end >= today ? TODAY_TTL_MS : HISTORICAL_TTL_MS;
};

const buildKey = (p) =>
  [p.clusterId, p.lineId, p.shift,
   p.startDate, p.endDate, p.pageNumber, p.pageSize]
    .map((v) => v ?? "")
    .join("|");

const evictExpired = (cache) => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiry) cache.delete(key);
  }
};

// ── DB fetch ───────────────────────────────────────────────────────────────
const fetchFromDB = async ({
  clusterId, lineId, shift,
  startDate, endDate, pageNumber, pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_GetShiftSummaryReport", {
    ClusterId:  { type: sql.Int,        value: clusterId  ? parseInt(clusterId,  10) : null },
    LineId:     { type: sql.Int,        value: lineId     ? parseInt(lineId,     10) : null },
    Shift:      { type: sql.VarChar(1), value: shift      || null },
    StartDate:  { type: sql.Date,       value: startDate  || null },
    EndDate:    { type: sql.Date,       value: endDate    || null },
    PageNumber: { type: sql.Int,        value: pageNumber },
    PageSize:   { type: sql.Int,        value: pageSize   },
  });

  const totalRecords = result.recordsets?.[0]?.[0]?.TotalRecords ?? 0;
  const tableData    = result.recordsets?.[1] || [];
  return { totalRecords, tableData };
};

// ── Public function (with cache) ───────────────────────────────────────────
const getShiftSummaryReport = async (params) => {
  const { startDate, endDate } = params;
  const ttl = getCacheTTL(startDate, endDate);
  const now = Date.now();

  if (ttl > 0) {
    const key    = buildKey(params);
    const cached = reportCache.get(key);
    if (cached && now < cached.expiry) return cached.data;
    if (reportCache.size > 100) evictExpired(reportCache);
    const data = await fetchFromDB(params);
    reportCache.set(key, { data, expiry: now + ttl });
    return data;
  }

  return fetchFromDB(params);
};

module.exports = { getShiftSummaryReport };
