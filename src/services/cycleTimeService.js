const { executeStoredProcedure, sql } = require("../utils/dbUtils");
const { getPool } = require("../config/db");

// ── Cache config ───────────────────────────────────────────────────────────
const VARIANTS_TTL_MS = 10 * 60 * 1000; // 10 min — master-like data
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min  — fully historical range
const TODAY_TTL_MS = 15 * 1000; // 15s   — range includes today

const variantsCache = { data: null, expiry: 0 };
const reportCache = new Map();
const overviewCache = new Map();

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

// ── Distinct variant codes ─────────────────────────────────────────────────
const getVariants = async () => {
  const now = Date.now();
  if (variantsCache.data && now < variantsCache.expiry)
    return variantsCache.data;

  const pool = getPool();
  const result = await pool.request().query(
    `SELECT DISTINCT VarraintCode
       FROM [dbo].[tbl_Tran_CT_SubStation]
       WHERE VarraintCode IS NOT NULL AND VarraintCode <> ''
       ORDER BY VarraintCode`,
  );

  variantsCache.data = result.recordset.map((r) => r.VarraintCode);
  variantsCache.expiry = now + VARIANTS_TTL_MS;
  return variantsCache.data;
};

// ── Main report: paginated sub-station records ─────────────────────────────
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
  equipmentId,
  shift,
  variantCode,
  biwNo,
  startDate,
  endDate,
  startTime,
  endTime,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_CT_SubStation_Report", {
    AreaId: { type: sql.Int, value: areaId ? parseInt(areaId, 10) : null },
    LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
    StationId: {
      type: sql.Int,
      value: stationId ? parseInt(stationId, 10) : null,
    },
    EquipmentId: {
      type: sql.Int,
      value: equipmentId ? parseInt(equipmentId, 10) : null,
    },
    Shift: { type: sql.VarChar(1), value: shift || null },
    VariantCode: { type: sql.NVarChar(50), value: variantCode || null },
    BiwNo: { type: sql.NVarChar(50), value: biwNo || null },
    StartDate: { type: sql.Date, value: startDate || null },
    EndDate: { type: sql.Date, value: endDate || null },
    StartTime: { type: sql.VarChar(8), value: startTime || null },
    EndTime: { type: sql.VarChar(8), value: endTime || null },
    PageNumber: { type: sql.Int, value: pageNumber },
    PageSize: { type: sql.Int, value: pageSize },
  });

  const totalRecords = result.recordsets?.[0]?.[0]?.TotalRecords ?? 0;
  const tableData = result.recordsets?.[1] || [];
  return { totalRecords, tableData };
};

// ── Overview: aggregated CT per BIW ───────────────────────────────────────
const getOverview = async (params) => {
  const { startDate, endDate } = params;
  const ttl = getCacheTTL(startDate, endDate);
  const now = Date.now();

  if (ttl > 0) {
    const key = buildKey(params);
    const cached = overviewCache.get(key);
    if (cached && now < cached.expiry) return cached.data;
    if (overviewCache.size > 100) evictExpired(overviewCache);
    const data = await fetchOverview(params);
    overviewCache.set(key, { data, expiry: now + ttl });
    return data;
  }

  return await fetchOverview(params);
};

const fetchOverview = async ({
  areaId,
  lineId,
  stationId,
  equipmentId,
  variantCode,
  startDate,
  endDate,
  startTime,
  endTime,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_CT_Overview", {
    AreaId: { type: sql.Int, value: areaId ? parseInt(areaId, 10) : null },
    LineId: { type: sql.Int, value: lineId ? parseInt(lineId, 10) : null },
    StationId: {
      type: sql.Int,
      value: stationId ? parseInt(stationId, 10) : null,
    },
    EquipmentId: {
      type: sql.Int,
      value: equipmentId ? parseInt(equipmentId, 10) : null,
    },
    VariantCode: { type: sql.NVarChar(50), value: variantCode || null },
    StartDate: { type: sql.Date, value: startDate || null },
    EndDate: { type: sql.Date, value: endDate || null },
    StartTime: { type: sql.VarChar(8), value: startTime || null },
    EndTime: { type: sql.VarChar(8), value: endTime || null },
    PageNumber: { type: sql.Int, value: pageNumber },
    PageSize: { type: sql.Int, value: pageSize },
  });

  const totalRecords = result.recordsets?.[0]?.[0]?.TotalRecords ?? 0;
  const tableData = result.recordsets?.[1] || [];
  return { totalRecords, tableData };
};

module.exports = { getVariants, getReport, getOverview };
