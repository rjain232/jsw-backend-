const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SHIFTS = ['All', 'A', 'B', 'C'];

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 1000;

function toPositiveInt(value, fieldName, errors, defaultValue) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
        errors.push(`${fieldName} must be a positive integer`);
        return defaultValue;
    }
    return num;
}

function validateTipChangeQuery(query) {
    const errors = [];
    const result = {};

    // --- fromDate / toDate ---
    if (!query.fromDate || !DATE_REGEX.test(query.fromDate)) {
        errors.push('fromDate is required and must be in YYYY-MM-DD format');
    } else {
        result.fromDate = query.fromDate;
    }

    if (!query.toDate || !DATE_REGEX.test(query.toDate)) {
        errors.push('toDate is required and must be in YYYY-MM-DD format');
    } else {
        result.toDate = query.toDate;
    }

    if (result.fromDate && result.toDate && new Date(result.fromDate) > new Date(result.toDate)) {
        errors.push('fromDate must be on or before toDate');
    }

    // --- hierarchy filters ---
    result.clusterId = toPositiveInt(query.clusterId, 'clusterId', errors);
    result.lineId = toPositiveInt(query.lineId, 'lineId', errors);
    result.stationId = toPositiveInt(query.stationId, 'stationId', errors);
    result.robotId = toPositiveInt(query.robotId, 'robotId', errors);

    // --- shift ---
    const shift = query.shift || 'All';
    if (!VALID_SHIFTS.includes(shift)) {
        errors.push(`shift must be one of: ${VALID_SHIFTS.join(', ')}`);
    } else {
        result.shift = shift;
    }

    // --- pagination ---
    result.pageNumber = toPositiveInt(query.pageNumber, 'pageNumber', errors, DEFAULT_PAGE_NUMBER);
    result.pageSize = toPositiveInt(query.pageSize, 'pageSize', errors, DEFAULT_PAGE_SIZE);
    if (result.pageSize > MAX_PAGE_SIZE) {
        errors.push(`pageSize must be ${MAX_PAGE_SIZE} or less`);
        result.pageSize = MAX_PAGE_SIZE;
    }

    // --- hierarchy dependency rules (mirrors the SP's own checks) ---
    if (result.lineId && !result.clusterId) {
        errors.push('lineId requires clusterId');
    }
    if (result.stationId && !(result.clusterId && result.lineId)) {
        errors.push('stationId requires clusterId and lineId');
    }
    if (result.robotId && !(result.clusterId && result.lineId && result.stationId)) {
        errors.push('robotId requires clusterId, lineId and stationId');
    }

    if (errors.length > 0) {
        return { error: { details: errors }, value: null };
    }

    return { error: null, value: result };
}

module.exports = { validateTipChangeQuery };