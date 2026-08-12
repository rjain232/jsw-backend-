const productionService = require("../services/productionService");

const getProductionTransactions = async (req, res, next) => {
  try {
    const rows = await productionService.getProductionTransactions({
      top: req.query.top,
      lineId: req.query.lineId,
      hourId: req.query.hourId,
      shift: req.query.shift,
      date: req.query.date,
      from: req.query.from,
      to: req.query.to,
    });

    return res.json({ count: rows.length, rows });
  } catch (error) {
    return next(error);
  }
};

const getProductionSummary = async (req, res, next) => {
  try {
    let { from, to, shifts } = req.query;

    const todayIST = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());

    if (!from) {
      from = todayIST;
    }

    if (!to) {
      to = todayIST;
    }

    if (!shifts || shifts.trim() === "") {
      shifts = "A,B,C";
    }

    const start = from;
    const end = to;

    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format.",
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "From Date cannot be greater than To Date.",
      });
    }

    // Optional Shift Validation
    if (shifts) {
      const validShifts = ["A", "B", "C"];

      const selected = shifts.split(",").map((x) => x.trim().toUpperCase());

      const invalid = selected.filter((x) => !validShifts.includes(x));

      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid Shift(s): ${invalid.join(", ")}`,
        });
      }
    }

    const rows = await productionService.getProductionSummary({
      from: start,
      to: end,
      shifts,
    });

    return res.json({
      count: rows.length,
      from: start,
      to: end,
      shifts: shifts,
      rows,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProductionTransactions,
  getProductionSummary,
};
