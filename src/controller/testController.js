const { processAndSaveAlarms, getDbConnection } = require('../server');

exports.runPipeline = async (req, res) => {
    try {
        await processAndSaveAlarms();

        const pool = await getDbConnection();
        const [processed] = await pool.query('SELECT COUNT(*) as count FROM processed_alarms');
        const [unprocessed] = await pool.query('SELECT COUNT(*) as count FROM unprocessed_alarms');

        res.status(200).json({ 
            message: 'Pipeline executed successfully',
            processed_alarms_count: processed[0].count,
            unprocessed_alarms_count: unprocessed[0].count
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to run pipeline', error: error.message });
    }
};
