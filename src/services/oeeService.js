const { executeStoredProcedure, sql } = require("../utils/dbUtils");

// ── Cache config ───────────────────────────────────────────────────────────────
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min  — fully historical range
const TODAY_TTL_MS = 15 * 1000; // 15s    — range includes today

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

// ── Main report ────────────────────────────────────────────────────────────────
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
  lineId,
  stationId,
  startDate,
  endDate,
  shifts,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_OEE_Report", {
    LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
    StationId: {
      type: sql.Int,
      value: stationId ? parseInt(stationId, 10) : null,
    },
    StartDate: { type: sql.Date, value: startDate || null },
    EndDate: { type: sql.Date, value: endDate || null },
    Shifts: { type: sql.VarChar(10), value: shifts || null },
    PageNumber: { type: sql.Int, value: pageNumber },
    PageSize: { type: sql.Int, value: pageSize },
  });

  // RS0 — total records count
  const totalRecords = result.recordsets?.[0]?.[0]?.TotalRecords ?? 0;

  // RS1 — shift-wise line/station summary
  const shiftWise = result.recordsets?.[1] ?? [];

  // RS2 — sub-station rows; group by SubStationID
  const rs2 = result.recordsets?.[2] ?? [];
  const subStationMap = new Map();
  for (const row of rs2) {
    if (!subStationMap.has(row.SubStationId)) {
      subStationMap.set(row.SubStationId, {
        SubStationID: row.SubStationId,
        SubStationName: row.SubStationName,
        Type: row.Type,
        shiftWise: [],
      });
    }
    subStationMap.get(row.SubStationId).shiftWise.push(row);
  }
  const subStations = Array.from(subStationMap.values());

  // RS3 — paginated raw records
  const tableData = result.recordsets?.[3] ?? [];

  return {
    summary: { shiftWise },
    subStations,
    totalRecords,
    tableData,
  };
};

module.exports = { getReport };
