const countryService = require('../services/countryService');

const syncCountries = async (req, res) => {
  try {
    const result = await countryService.fetchAndStoreCountries();
    res.status(200).json({ message: 'Country data synchronized successfully.', ...result });
  } catch (error) {
    console.error('Error synchronizing country data:', error);
    res.status(500).json({ message: 'Failed to synchronize country data.', error: error.message });
  }
};

module.exports = {
  syncCountries,
};
