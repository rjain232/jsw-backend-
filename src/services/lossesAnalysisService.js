const { executeStoredProcedure, sql } = require("../utils/dbUtils");

// ── Cache config ───────────────────────────────────────────────────────────────
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min
const TODAY_TTL_MS = 15 * 1000; // 15 s
const LOSS_TYPES_TTL_MS = 60 * 60 * 1000; // 1 hour — loss types rarely change

const reportCache = new Map();
let lossTypesCache = null; // { data, expiry }

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

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert seconds (int) → "HH:mm:ss" */
function secsToHms(totalSec) {
  if (!totalSec || totalSec <= 0) return "00:00:00";
  const s = Math.round(totalSec);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function buildLosses(row, lossTypes) {
  const losses = {};

  for (const { key, label } of lossTypes) {
    const n = key.replace("P", "");
    const durationSec = row[`P${n}_Duration`] ?? 0;

    losses[key] = { label, duration: secsToHms(durationSec) };
  }

  return losses;
}

function transformRow(row, index, lossTypes) {
  return {
    srNo: row.SrNo ?? index + 1,
    cluster: row.ClusterName ?? "",
    line: row.LineName ?? "",
    station: row.StationName ?? "",
    subStation: row.SubStationName ?? "",
    shift: row.Shift ?? "",
    FromDate: row.FromDate ?? "",
    ToDate: row.ToDate ?? "",
    downtime: secsToHms(row.TotalDowntimeSec),
    losses: buildLosses(row, lossTypes),
  };
}

// ── Loss Types ────────────────────────────────────────────────────────────────

/** Fetch active loss types from DB (cached 1 hour). */
const getLossTypes = async () => {
  const now = Date.now();
  if (lossTypesCache && now < lossTypesCache.expiry) {
    return lossTypesCache.data;
  }

  const result = await executeStoredProcedure("dbo.app_GetLossTypes", {});
  const data = (result.recordset || []).map((r) => ({
    key: r.LossKey,
    label: r.LossLabel,
  }));

  lossTypesCache = { data, expiry: now + LOSS_TYPES_TTL_MS };
  return data;
};

// ── Report query ──────────────────────────────────────────────────────────────

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
  stationId,
  shift,
  startDate,
  endDate,
  pageNumber,
  pageSize,
}) => {
  const [lossTypes, result] = await Promise.all([
    getLossTypes(),
    executeStoredProcedure("dbo.app_Line_Station_Losses_Analysis", {
      AreaId: { type: sql.Int, value: areaId ? parseInt(areaId, 10) : null },
      LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
      StationId: {
        type: sql.Int,
        value: stationId ? parseInt(stationId, 10) : null,
      },
      Shift: { type: sql.VarChar(1), value: shift || null },
      StartDate: { type: sql.Date, value: startDate || null },
      EndDate: { type: sql.Date, value: endDate || null },
      PageNumber: { type: sql.Int, value: pageNumber },
      PageSize: { type: sql.Int, value: pageSize },
    }),
  ]);

  const categorySummary = result.recordsets?.[0] || [];
  const totalRecords = result.recordsets?.[1]?.[0]?.TotalRecords ?? 0;
  const rawRows = result.recordsets?.[2] || [];
  const tableData = rawRows.map((row, i) => transformRow(row, i, lossTypes));

  return { totalRecords, tableData, categorySummary };
};

module.exports = { getReport, getLossTypes };
