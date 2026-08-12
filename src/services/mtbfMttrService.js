const { executeStoredProcedure, sql } = require("../utils/dbUtils");

const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min
const TODAY_TTL_MS = 15 * 1000; // 15 s

const reportCache = new Map();

const getTodayStr = () => new Date().toISOString().split("T")[0];

const getCacheTTL = (startDate, endDate) => {
  if (!startDate && !endDate) return 0;
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

// ── Transform chart row ───────────────────────────────────────────────────────
function transformChartRow(row) {
  return {
    groupId: row.GroupId ?? null,
    groupName: row.GroupName ?? "",
    totalBreakDownTime: row.TotalBreakDownTime ?? 0,
    totalNetAvailTime: row.TotalNetAvailTime ?? 0,
    totalFailures: row.TotalFailures ?? 0,
    avgMTTR: row.AvgMTTR ?? 0,
    avgMTBF: row.AvgMTBF ?? 0,
  };
}

// ── Transform table row ───────────────────────────────────────────────────────
function transformTableRow(row, index) {
  return {
    srNo: row.SrNo ?? index + 1,
    area: row.Area ?? "",
    line: row.Line ?? "",
    station: row.Station ?? "",
    subStation: row.SubStation ?? "",
    shift: row.Shift ?? "",
    breakDownTime: row.BreakDownTime ?? 0,
    netAvailTime: row.NetAvail_OperTime ?? 0,
    failures: row.Failures ?? 0,
    mttr: row.MTTR ?? 0,
    mtbf: row.MTBF ?? 0,
    date: row.Date ? row.Date.toISOString().split("T")[0] : "",
  };
}

// ── Fetch from SP ─────────────────────────────────────────────────────────────
const fetchReport = async ({
  areaId,
  lineId,
  stationId,
  startDate,
  endDate,
  shifts,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_MTBF_MTTR_Report", {
    AreaId: { type: sql.Int, value: areaId ? parseInt(areaId, 10) : null },
    LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
    StationId: {
      type: sql.Int,
      value: stationId ? parseInt(stationId, 10) : null,
    },
    StartDate: { type: sql.Date, value: startDate || null },
    EndDate: { type: sql.Date, value: endDate || null },
    Shifts: { type: sql.NVarChar(50), value: shifts || null },
    PageNumber: { type: sql.Int, value: pageNumber },
    PageSize: { type: sql.Int, value: pageSize },
  });

  const chartData = (result.recordsets?.[0] || []).map(transformChartRow);
  const totalRecords = result.recordsets?.[1]?.[0]?.TotalRecords ?? 0;
  const tableData = (result.recordsets?.[2] || []).map(transformTableRow);

  return { chartData, totalRecords, tableData };
};

// ── Public: getReport (with caching) ─────────────────────────────────────────
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

  return fetchReport(params);
};

module.exports = { getReport };
