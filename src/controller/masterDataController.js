const service = require("../services/masterService");

const getMasterData = async (req, res) => {
  try {
    const data = await service.getMasterData();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMasterData };
