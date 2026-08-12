const service = require("../services/lineVariantService");

const getLineAndVariantData = async (req, res) => {
  try {
    const data = await service.getLineAndVariantData();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = { getLineAndVariantData };