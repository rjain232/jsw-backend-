// controllers/tipChangeCountController.js
const tipChangeCountService = require("../services/tipChangeCountService");
const { validateTipChangeQuery } = require("../utils/tipChangeValidators");

async function getTipChangeCount(req, res) {
    const { error, value } = validateTipChangeQuery(req.query);
    if (error) {
        return res.status(400).json({ error: error.details });
    }

    try {
        const result = await tipChangeCountService.getTipChangeCount(value);
        return res.status(200).json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch tip change data" });
    }
}

module.exports = { getTipChangeCount };