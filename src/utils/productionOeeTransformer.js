"use strict";

/**
 * The upstream/legacy source returns `productionOeeData` and `jphDetails`
 * as arrays-of-arrays, where meaning is implied purely by POSITION:
 *
 *   productionOeeData[0] -> [ { FromDate, Todate } ]                 (report duration)
 *   productionOeeData[1] -> [ { LineID, LineName, ... } ]            (per-line OEE)
 *   productionOeeData[2] -> [ { AvgAvailableTime, ... } ]            (shop-level OEE)
 *   productionOeeData[3] -> [ { AvgActualProductionCount, ... } ]    (shop-level production)
 *
 *   jphDetails[0] -> [ { LineID, HourID, AvgJPH, AvgActual } ]                      (hour-wise JPH, all lines)
 *   jphDetails[1] -> [ { LineID, HourID, CurrentHourJPH, CurrentHourAvgActual } ]   (current hour snapshot, one row per line)
 *
 * This is fragile: if the upstream ever changes array order, every consumer
 * silently breaks. This module converts it into a named object AND merges
 * each line's hourly JPH series + current-hour snapshot directly into that
 * line's own record, so a consumer never has to cross-reference LineID
 * across two separate top-level sections.
 */

/**
 * Round/normalize a number, passing through null/undefined untouched.
 * @param {number|null|undefined} value
 * @param {number} [decimals=2]
 * @returns {number|null}
 */
function safeNumber(value, decimals = 2) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number(num.toFixed(decimals));
}

/**
 * Groups the flat hour-wise JPH rows by LineID.
 * @param {Array} hourlyArr - jphDetails[0]
 * @returns {Object} map of lineId(string) -> [{ HourID, AvgJPH, AvgActual }, ...]
 */
function groupHourlyByLine(hourlyArr = []) {
  const byLine = {};
  for (const entry of hourlyArr) {
    const key = String(entry.LineID);
    if (!byLine[key]) byLine[key] = [];
    byLine[key].push({
      HourID: entry.HourID,
      AvgJPH: entry.AvgJPH ?? null,
      AvgActual: entry.AvgActual ?? null,
    });
  }
  return byLine;
}

/**
 * Maps the current-hour snapshot rows (one per line) by LineID.
 * @param {Array} currentHourArr - jphDetails[1]
 * @returns {Object} map of lineId(string) -> { HourID, CurrentHourJPH, CurrentHourAvgActual }
 */
function mapCurrentHourByLine(currentHourArr = []) {
  const byLine = {};
  for (const entry of currentHourArr) {
    byLine[String(entry.LineID)] = {
      HourID: entry.HourID,
      CurrentHourJPH: entry.CurrentHourJPH ?? null,
      CurrentHourAvgActual: entry.CurrentHourAvgActual ?? null,
    };
  }
  return byLine;
}

/**
 * Top-level transformer: pass in the raw payload exactly as it comes back
 * from the current query/procedure, get back a named object where every
 * line carries its own JPH hourly series + current-hour snapshot.
 *
 * @param {Object} raw
 * @param {Array} raw.productionOeeData
 * @param {Array} raw.jphDetails
 * @returns {Object}
 */
function transformOeeResponse(raw = {}) {
  const [
    durationArr = [],
    lineWiseArr = [],
    shopOeeArr = [],
    shopProductionArr = [],
  ] = raw.productionOeeData || [];
  const [hourlyArr = [], currentHourArr = []] = raw.jphDetails || [];

  const durationRaw = durationArr[0] || {};
  const shopOeeRaw = shopOeeArr[0] || {};
  const shopProductionRaw = shopProductionArr[0] || {};

  const hourlyByLine = groupHourlyByLine(hourlyArr);
  const currentHourByLine = mapCurrentHourByLine(currentHourArr);

  const lineWiseDetails = lineWiseArr.map((line) => {
    const key = String(line.LineID);
    return {
      LineID: line.LineID,
      LineName: line.LineName,
      ActualProductionCount: line.ActualProductionCount ?? null,
      TargetProductionCount: line.TargetProductionCount ?? null,
      PlanProductionCount: line.PlanProductionCount ?? null,
      AvgOEE: safeNumber(line.AverageOEE),
      CurrentHourDetails: currentHourByLine[key] || null,
      // merged in from jphDetails, keyed by this same LineID
      JphDetails: hourlyByLine[key] || [],
    };
  });

  return {
    FromDate: durationRaw.FromDate ?? null,
    Todate: durationRaw.Todate ?? null,
    shopDetails: {
      AvgActualProductionCount:
        shopProductionRaw.AvgActualProductionCount ?? null,
      AvgTargetProductionCount:
        shopProductionRaw.AvgTargetProductionCount ?? null,
      AvgPlanProductionCount: shopProductionRaw.AvgPlanProductionCount ?? null,
      AvgJPH: shopProductionRaw.AvgJPH ?? null,
      AvgActual: shopProductionRaw.AvgActual ?? null,
      AvgAvailableTime: shopOeeRaw.AvgAvailableTime ?? null,
      AvgBreakDownTime: shopOeeRaw.AvgBreakDownTime ?? null,
      AvgOEE: safeNumber(shopOeeRaw.AverageOEE),
      AvgAvailability: safeNumber(shopOeeRaw.AvgAvailability),
      AvgPerformance: safeNumber(shopOeeRaw.AvgPerformance),
      AvgQuality: safeNumber(shopOeeRaw.AvgQuality),
    },
    lineWiseDetails,
  };
}

module.exports = {
  transformOeeResponse,
  groupHourlyByLine,
  mapCurrentHourByLine,
  safeNumber,
};
