const { executeStoredProcedure, sql } = require("../utils/dbUtils");

// Constants for shift identifiers
const SHIFT_A = 'A';
const SHIFT_B = 'B';
const SHIFT_C = 'C';
const VALID_SHIFTS = [SHIFT_A, SHIFT_B, SHIFT_C];

/**
 * Fetches shift data from the database.
 * @param {string} [shiftFilter] - Optional shift to filter by (e.g., 'A', 'B', 'C').
 * @returns {Promise<Array>} A promise that resolves to an array of shift data.
 */
const getShifts = async (shiftFilter) => {
  try {
    let validatedShift = null;
    if (shiftFilter) {
      const upperShift = shiftFilter.toUpperCase();
      if (!VALID_SHIFTS.includes(upperShift)) {
        throw new Error(`Invalid shift filter: ${shiftFilter}. Must be one of ${VALID_SHIFTS.join(', ')}.`);
      }
      validatedShift = upperShift;
    }

    const result = await executeStoredProcedure("sp_GetShiftData", {
      Shift: { type: sql.VarChar(5), value: validatedShift },
    });
    return result.recordset || [];
  } catch (error) {
    console.error("Error in shiftService.getShifts:", error);
    throw new Error(`Failed to retrieve shift data: ${error.message}`);
  }
};

/**
 * Updates a single shift record in the database.
 * @param {number} hourId - The ID of the hour to update.
 * @param {string} shift - The shift identifier (A, B, or C).
 * @param {string} startHour - The new start time.
 * @param {string} endHour - The new end time.
 * @returns {Promise<Array>} A promise that resolves to the updated recordset.
 */
const updateShift = async (hourId, shift, startHour, endHour) => {
  try {
    const parsedHourId = parseInt(hourId, 10);
    if (isNaN(parsedHourId)) {
      throw new Error(`Invalid hourId: ${hourId}. Must be a number.`);
    }

    const upperShift = shift.toUpperCase();
    if (!VALID_SHIFTS.includes(upperShift)) {
      throw new Error(`Invalid shift: ${shift}. Must be one of ${VALID_SHIFTS.join(', ')}.`);
    }

    // Basic validation for time format (can be expanded with regex if needed)
    if (!/^\d{2}:\d{2}:\d{2}$/.test(startHour) || !/^\d{2}:\d{2}:\d{2}$/.test(endHour)) {
      throw new Error('Invalid time format. startHour and endHour must be in HH:MM:SS format.');
    }
     
    const startHourDate = new Date(`2000-01-01T${startHour}`);
    const endHourDate = new Date(`2000-01-01T${endHour}`);

    const result = await executeStoredProcedure("sp_UpdateShiftHour", {
      HourId: { type: sql.Int, value: parsedHourId },
      Shift: { type: sql.VarChar(5), value: upperShift },
      StartHour: { type: sql.Time, value: startHourDate },
      EndHour: { type: sql.Time, value: endHourDate },
    });
    return result.recordset?.[0] || null; // Return the first updated record or null
  } catch (error) {
    console.error("Error in shiftService.updateShift:", error);
    throw new Error(`Failed to update shift data: ${error.message}`);
  }
};

module.exports = {
  getShifts,
  updateShift,
  SHIFT_A,
  SHIFT_B,
  SHIFT_C,
  VALID_SHIFTS,
};