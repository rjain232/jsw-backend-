const { executeStoredProcedure, sql } = require("../utils/dbUtils");
const { getPool } = require("../config/db");

// ── Cache config ───────────────────────────────────────────────────────────
const CATEGORIES_TTL_MS = 10 * 60 * 1000; // 10 min — master data, rarely changes
const HISTORICAL_TTL_MS = 5 * 60 * 1000; // 5 min  — past dates, data won't change
const TODAY_TTL_MS = 15 * 1000; // 15s    — today's data, semi-live
// No cache for real-time (no date filter)

const categoriesCache = { data: null, expiry: 0 };
const reportCache = new Map(); // key → { data, expiry }

const getTodayStr = () => new Date().toISOString().split("T")[0];

// Determine TTL based on date range
const getReportTTL = (startDate, endDate) => {
  if (!startDate && !endDate) return 0; // real-time — no cache
  const today = getTodayStr();
  const end = endDate || today;
  if (end >= today) return TODAY_TTL_MS; // range includes today
  return HISTORICAL_TTL_MS; // fully historical
};

// Build a deterministic cache key from all params
const buildCacheKey = (params) =>
  [
    params.areaId ?? "",
    params.lineId ?? "",
    params.stationId ?? "",
    params.equipmentId ?? "",
    params.shift ?? "",
    params.alarmCategory ?? "",
    params.startDate ?? "",
    params.endDate ?? "",
    params.pageNumber ?? 1,
    params.pageSize ?? 50,
  ].join("|");

// Evict expired entries to prevent unbounded memory growth
const evictExpiredReportCache = () => {
  const now = Date.now();
  for (const [key, entry] of reportCache.entries()) {
    if (now >= entry.expiry) reportCache.delete(key);
  }
};

// ── Alarm Categories ───────────────────────────────────────────────────────
const getAlarmCategories = async () => {
  const now = Date.now();
  if (categoriesCache.data && now < categoriesCache.expiry) {
    return categoriesCache.data;
  }

  const pool = getPool();
  const result = await pool
    .request()
    .query(
      "SELECT CategoryID, Name FROM dbo.tbl_Mast_AlarmCategory WHERE IsActive = 1 ORDER BY CategoryID",
    );

  categoriesCache.data = result.recordset;
  categoriesCache.expiry = now + CATEGORIES_TTL_MS;
  return categoriesCache.data;
};

// ── Alarm Report ───────────────────────────────────────────────────────────
const getAlarmReportData = async ({
  areaId,
  lineId,
  stationId,
  equipmentId,
  shift,
  alarmCategory,
  startDate,
  endDate,
  pageNumber,
  pageSize,
}) => {
  const params = {
    areaId,
    lineId,
    stationId,
    equipmentId,
    shift,
    alarmCategory,
    startDate,
    endDate,
    pageNumber,
    pageSize,
  };

  const ttl = getReportTTL(startDate, endDate);
  const now = Date.now();

  if (ttl > 0) {
    const key = buildCacheKey(params);
    const cached = reportCache.get(key);
    if (cached && now < cached.expiry) return cached.data;

    // Evict stale entries periodically (every ~50 cache hits)
    if (reportCache.size > 50) evictExpiredReportCache();

    try {
      const data = await fetchFromDB(params);
      reportCache.set(key, { data, expiry: now + ttl });
      return data;
    } catch (error) {
      console.error("Alarm Service Error:", error);
      throw error;
    }
  }

  // Real-time — skip cache entirely
  try {
    return await fetchFromDB(params);
  } catch (error) {
    console.error("Alarm Service Error:", error);
    throw error;
  }
};

const fetchFromDB = async ({
  areaId,
  lineId,
  stationId,
  equipmentId,
  shift,
  alarmCategory,
  startDate,
  endDate,
  pageNumber,
  pageSize,
}) => {
  const result = await executeStoredProcedure("dbo.app_Alarm_report", {
    AreaId: {
      type: sql.Int,
      value: areaId != null && areaId !== "" ? parseInt(areaId, 10) : null,
    },
    LineId: {
      type: sql.Int,
      value: lineId != null && lineId !== "" ? parseInt(lineId, 10) : null,
    },
    StationId: {
      type: sql.Int,
      value:
        stationId != null && stationId !== "" ? parseInt(stationId, 10) : null,
    },
    EquipmentId: {
      type: sql.Int,
      value:
        equipmentId != null && equipmentId !== ""
          ? parseInt(equipmentId, 10)
          : null,
    },
    Shift: {
      type: sql.VarChar(1),
      value: shift != null && shift !== "" ? shift : null,
    },
    AlarmCategory: {
      type: sql.VarChar(50),
      value:
        alarmCategory != null && alarmCategory !== "" ? alarmCategory : null,
    },
    StartDate: {
      type: sql.Date,
      value: startDate != null && startDate !== "" ? startDate : null,
    },
    EndDate: {
      type: sql.Date,
      value: endDate != null && endDate !== "" ? endDate : null,
    },
    PageNumber: { type: sql.Int, value: pageNumber },
    PageSize: { type: sql.Int, value: pageSize },
  });

  return {
    kpiCards: result.recordsets?.[0]?.[0] || {},
    graph: result.recordsets?.[1] || [],
    tableData: result.recordsets?.[2] || [],
  };
};

// ── Top X Alarms ───────────────────────────────────────────────────────────
const topXCache = new Map();

const buildTopXCacheKey = (p) =>
  [
    p.areaName ?? "",
    p.lineName ?? "",
    p.stationName ?? "",
    p.equipmentName ?? "",
    p.shift ?? "",
    p.startDate ?? "",
    p.endDate ?? "",
    p.viewType,
    p.topCount,
  ].join("|");

const fetchTopXFromDB = async ({
  areaName,
  lineName,
  stationName,
  equipmentName,
  shift,
  startDate,
  endDate,
  viewType,
  topCount,
}) => {
  const result = await executeStoredProcedure("dbo.app_TopX_Alarms", {
    AreaName: { type: sql.NVarChar(50), value: areaName || null },
    LineName: { type: sql.NVarChar(50), value: lineName || null },
    StationName: { type: sql.NVarChar(100), value: stationName || null },
    EquipmentName: { type: sql.NVarChar(100), value: equipmentName || null },
    Shift: { type: sql.VarChar(1), value: shift || null },
    StartDate: { type: sql.Date, value: startDate || null },
    EndDate: { type: sql.Date, value: endDate || null },
    ViewType: { type: sql.NVarChar(30), value: viewType },
    TopCount: { type: sql.Int, value: topCount },
  });

  return {
    summary: result.recordsets?.[0]?.[0] || {
      TotalRecords: 0,
      TotalDuration: 0,
    },
    data: result.recordsets?.[1] || [],
  };
};

const getTopXAlarmsData = async (params) => {
  const { startDate, endDate } = params;
  const ttl = getReportTTL(startDate, endDate);
  const now = Date.now();

  if (ttl > 0) {
    const key = buildTopXCacheKey(params);
    const cached = topXCache.get(key);
    if (cached && now < cached.expiry) return cached.data;

    if (topXCache.size > 50) {
      for (const [k, v] of topXCache.entries()) {
        if (now >= v.expiry) topXCache.delete(k);
      }
    }

    try {
      const data = await fetchTopXFromDB(params);
      topXCache.set(key, { data, expiry: now + ttl });
      return data;
    } catch (error) {
      console.error("TopX Alarm Service Error:", error);
      throw error;
    }
  }

  try {
    return await fetchTopXFromDB(params);
  } catch (error) {
    console.error("TopX Alarm Service Error:", error);
    throw error;
  }
};

module.exports = { getAlarmReportData, getAlarmCategories, getTopXAlarmsData };
