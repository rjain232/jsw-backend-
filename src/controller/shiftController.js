const shiftService = require('../services/shiftService');
const { VALID_SHIFTS } = require('../services/shiftService'); // Import VALID_SHIFTS for controller-level validation if desired

/**
 * Controller to handle fetching shift data.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const getShiftData = async (req, res, next) => {
    try {
        const { shift } = req.query; // Extracts ?shift=A from the URL
        const data = await shiftService.getShifts(shift);
        
        return res.status(200).json({ success: true, data });
    } catch (error) {
        // For operational errors, send a specific message. For others, send a generic one.
        if (error.message.startsWith('Invalid shift')) {
            console.error('Validation error in getShiftData:', error.message);
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Error in getShiftData controller:', error);
        return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

/**
 * Controller to handle updating a single shift's data.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
const updateShiftData = async (req, res, next) => {
    try {
        const { hourId } = req.params; // Extracts from /api/shifts/:hourId
        const { shift, startHour, endHour } = req.body;

        if (!shift || !startHour || !endHour) {
            return res.status(400).json({ success: false, message: 'Missing required fields: shift, startHour, and endHour are required.' });
        }

        const data = await shiftService.updateShift(hourId, shift, startHour, endHour);
        
        if (!data) {
            return res.status(404).json({ success: false, message: `Shift with hourId ${hourId} not found or no changes made.` });
        }

        return res.status(200).json({ success: true, message: 'Shift updated successfully', data });
    } catch (error) {
        // Catch specific errors from the service to return appropriate HTTP status codes
        if (error.message.includes('Invalid hourId') || error.message.includes('Invalid shift') || error.message.includes('Invalid time format')) {
            console.error('Validation error in updateShiftData:', error.message);
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.message.includes('Failed to update shift data')) {
            console.error('Database error in updateShiftData:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
        console.error('Error in updateShiftData controller:', error);
        return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

module.exports = {
    getShiftData,
    updateShiftData
};
