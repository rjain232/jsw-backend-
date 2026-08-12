const axios = require('axios');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    wincc: {
        // Assuming an auth URL. If token is static, you can replace getAuthToken with a static token.
        authUrl: 'https://192.168.1.228/api/v1/auth/login',
        graphQlUrl: 'https://192.168.1.228/graphql/',
        username: 'graphql',
        password: 'Admin@1234'
    },
    db: {
        host: 'localhost',
        user: 'root',
        password: 'Password123',
        database: 'SCADA',
        connectionLimit: 10
    }
};

// ==========================================
// 1. SERVICE STATE
// ==========================================

// In-memory state for the last poll time. For production, consider persisting this.
let lastPollTime = new Date(Date.now() - 5 * 60 * 1000); // Start by fetching the last 5 minutes of data

// Database Pool
const pool = mysql.createPool(CONFIG.db);

// ==========================================
// 2. BUSINESS LOGIC & DATA FETCHING
// Shift A: 07:00 AM - 03:30 PM
// Shift B: 03:30 PM - 11:00 PM
// Shift C: 11:00 PM - 07:00 AM (Next Day)
// ==========================================
function getShiftInfo(timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    const minutesSinceMidnight = (hour * 60) + minute;
    
    let shift = '';
    // 7:00 AM = 420 mins | 3:30 PM = 930 mins | 11:00 PM = 1380 mins
    if (minutesSinceMidnight >= 420 && minutesSinceMidnight < 930) {
        shift = 'A';
    } else if (minutesSinceMidnight >= 930 && minutesSinceMidnight < 1380) {
        shift = 'B';
    } else {
        shift = 'C';
    }

    const shiftDate = new Date(date);
    if (minutesSinceMidnight < 420) {
        shiftDate.setDate(shiftDate.getDate() - 1);
    }
    
    const dateCode = shiftDate.toISOString().split('T')[0];
    const shiftId = `${dateCode}-${shift}`;

    return { shift, shiftId };
}

async function getAuthToken() {
    try {
        const response = await axios.post(CONFIG.wincc.authUrl, {
            username: CONFIG.wincc.username,
            password: CONFIG.wincc.password
        });
        return response.data.token;
    } catch (error) {
        console.error('Failed to authenticate with WinCC:', error.message);
        throw error;
    }
}

async function fetchWinCCAlarms(authToken, from, to) {
    const graphqlQuery = {
        query: `
            query GetRecentlyChangedAlarms($from: Timestamp!, $to: Timestamp!) {
                loggedAlarms(
                    languages:["en-US"]
                    startTime:$from
                    endTime:$to
                ) {
                    name
                    instanceID
                    alarmClassID
                    alarmClassName
                    eventText
                    alarmText1
                    origin
                    area
                    priority
                    raiseTime
                    acknowledgmentTime
                    clearTime
                    resetTime
                    duration
                    modificationTime
                    state
                    stateText
                    changeReason
                    userName
                    hostName
                }
            }
        `,
        variables: {
            from: from.toISOString(),
            to: to.toISOString()
        }
    };

    try {
        const response = await axios.post(CONFIG.wincc.graphQlUrl, graphqlQuery, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Use this if your server has a self-signed certificate
        });
        return response.data.data.loggedAlarms;
    } catch (error) {
        console.error('Failed to fetch GraphQL alarms:', error.message);
        throw error;
    }
}

// ==========================================
// 3. DB STORE & RETENTION CLEANUP
// ==========================================
async function processAndSaveAlarms() {
    let connection;
    try {
        console.log('--- Starting Pipeline Execution ---');

        const pollStartTime = lastPollTime;
        const pollEndTime = new Date();
        const token = await getAuthToken();
        const rawAlarms = await fetchWinCCAlarms(token, pollStartTime, pollEndTime);

        if (!rawAlarms || rawAlarms.length === 0) {
            console.log('No new alarm tags received.');
            return;
        }

        const processedRecords = [];
        const unprocessedRecords = [];

        rawAlarms.forEach(alarm => {
            // Using modificationTime for shift calculation, as it reflects the latest change.
            const timestamp = alarm.modificationTime || alarm.raiseTime;
            const { shift, shiftId } = getShiftInfo(timestamp);
            
            const record = [
                alarm.instanceID,
                alarm.name,
                alarm.alarmClassID,
                alarm.alarmClassName,
                alarm.eventText,
                alarm.alarmText1,
                alarm.origin,
                alarm.area,
                alarm.priority,
                alarm.raiseTime ? new Date(alarm.raiseTime) : null,
                alarm.acknowledgmentTime ? new Date(alarm.acknowledgmentTime) : null,
                alarm.clearTime ? new Date(alarm.clearTime) : null,
                alarm.resetTime ? new Date(alarm.resetTime) : null,
                alarm.duration,
                alarm.modificationTime ? new Date(alarm.modificationTime) : null,
                alarm.state,
                alarm.stateText,
                alarm.changeReason,
                alarm.userName,
                alarm.hostName,
                shift,
                shiftId
            ];

            // Assuming 'Inactive' or 'Cleared' means the alarm is processed. Adjust if needed.
            if (['inactive', 'cleared', 'acknowledged'].includes(alarm.state?.toLowerCase())) {
                processedRecords.push(record);
            } else {
                unprocessedRecords.push(record);
            }
        });

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Using INSERT IGNORE to prevent errors on duplicate instance_id
        const insertQuery = (tableName) => `
            INSERT IGNORE INTO ${tableName} 
            (instance_id, alarm_name, alarm_class_id, alarm_class_name, event_text, alarm_text, origin, area, priority, raise_time, ack_time, clear_time, reset_time, duration, modification_time, state, state_text, change_reason, user_name, host_name, shift, shift_id)
            VALUES ?
        `;

        if (processedRecords.length > 0) {
            await connection.query(insertQuery('processed_alarms'), [processedRecords]);
            console.log(`Inserted ${processedRecords.length} completed records to [processed_alarms].`);
        }

        if (unprocessedRecords.length > 0) {
            await connection.query(insertQuery('unprocessed_alarms'), [unprocessedRecords]);
            console.log(`Inserted ${unprocessedRecords.length} pending records to [unprocessed_alarms].`);
        }

        const createCleanupQuery = (tableName) => `
            DELETE FROM ${tableName} 
            WHERE shift_id NOT IN (
                SELECT shift_id FROM (
                    SELECT DISTINCT shift_id 
                    FROM ${tableName} 
                    ORDER BY shift_id DESC 
                    LIMIT 6
                ) AS keep_shifts
            );
        `;

        const [pRes] = await connection.query(createCleanupQuery('processed_alarms'));
        const [uRes] = await connection.query(createCleanupQuery('unprocessed_alarms'));

        console.log(`Purged old shifts — Processed deleted: ${pRes.affectedRows}, Unprocessed deleted: ${uRes.affectedRows}`);
        
        await connection.commit();

        // Update last poll time only on successful execution
        lastPollTime = pollEndTime;
        
        console.log('--- Pipeline Completed Successfully ---');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Pipeline failure:', error.message);
    } finally {
        if (connection) connection.release();
    }
}

// ==========================================
// 4. SCHEDULER
// ==========================================

// This cron expression runs the job every 5 minutes.
cron.schedule('*/5 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Cron trigger: Starting SCADA pipeline.`);
    await processAndSaveAlarms();
});

console.log('SCADA GraphQL fetcher service started. Waiting for next cron interval...');

module.exports = {
    processAndSaveAlarms,
    getDbConnection: () => pool
};
