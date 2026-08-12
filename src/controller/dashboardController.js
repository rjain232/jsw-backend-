const dashboardService = require("../services/dashboardService");
const productionOeeTransformer = require("../utils/productionOeeTransformer");

// Allowed quick ranges
const ALLOWED_RANGES = ["today", "yesterday", "last10", "lastmonth"];
const DEFAULT_RANGE = "today";

function sendError(res, status = 500, message = "Internal server error", details) {
  const payload = { message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

function validateRangeParams(query) {
  const { range, start, end } = query || {};
  const usedRange = range || DEFAULT_RANGE;
  if (!ALLOWED_RANGES.includes(usedRange)) {
    return { valid: false, error: `Invalid range. Allowed: ${ALLOWED_RANGES.join(", ")}` };
  }

  return { valid: true, range: usedRange };
}

const getDashboardData = async (req, res) => {
  try {
    const validation = validateRangeParams(req.query);
    if (!validation.valid) return sendError(res, 400, "Invalid request", validation.error);


    const { range } = validation;

    // Run service calls in parallel for better performance
    const [productionOeeData, jphDetails] = await Promise.all([
      dashboardService.getProductionOeeData({ range }),
      dashboardService.getJPHDetails({ range }),
    ]);

    const transformed = productionOeeTransformer.transformOeeResponse({ productionOeeData, jphDetails });

    if (!transformed) return sendError(res, 204, "No content available");

    return res.status(200).json({range:range,...transformed});
  } catch (error) {
    console.error("Error fetching dashboard data:", {
      message: error && error.message,
      stack: error && error.stack,
      query: req && req.query,
    });
    return sendError(res);
  }
};

module.exports = { getDashboardData };
