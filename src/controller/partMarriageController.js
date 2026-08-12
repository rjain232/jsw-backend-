
const partMarriageService = require("../services/partMarriageService");
const { validatePartMarriageQuery } = require("../utils/partMarriageValidators");

async function getPartMarriage(req, res) {
  const { error, value } = validatePartMarriageQuery(req.query);
  if (error) {
    return res.status(400).json({ error: error.details });
  }

  try {
    const result = await partMarriageService.getPartMarriageData(value);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch part marriage data" });
  }
}

module.exports = { getPartMarriage };
