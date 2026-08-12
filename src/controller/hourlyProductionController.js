const hourlyProductionService = require("../services/hourlyProductionService");

const getHourlyProductionReport = async (req, res, next) => {
  try {
    const rows = await hourlyProductionService.getHourlyProductionReport({
      lineId: req.query.lineId,
      clusterId: req.query.clusterId,
      model: req.query.model,
      shift: req.query.shift,
      date: req.query.date,
      from: req.query.from,
      to: req.query.to,
      hourId: req.query.hourId,
      pageNumber: req.query.pageNumber,
      pageSize: req.query.pageSize,
    });

    const totalRecords = rows.length > 0 ? rows[0].TotalRecords : 0;
    const totalPages = rows.length > 0 ? rows[0].TotalPages : 0;
    const pageNumber = rows.length > 0 ? rows[0].PageNumber : 1;
    const pageSize = rows.length > 0 ? rows[0].PageSize : 24;

    return res.json({ totalRecords, totalPages, pageNumber, pageSize, rows });
  } catch (error) {
    return next(error);
  }
};

const updateHourlyProductionRemark = async (req, res, next) => {
  try {
    const { Id, VariantCode, Remark } = req.body;

    if (!Id) {
      return res.status(400).json({
        success: false,
        message: "Id is required.",
      });
    }

    const result = await hourlyProductionService.updateHourlyProductionRemark(
      Id,
      VariantCode,
      Remark,
    );

    return res.status(200).json({
      success: true,
      ...result[0],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = { getHourlyProductionReport, updateHourlyProductionRemark };
