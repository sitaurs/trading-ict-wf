const cron = require('node-cron');
const { getLogger } = require('../modules/logger');
const log = getLogger('CronSchedule.Test');

function testCronSchedules() {
    try {
        log.info('Testing cron schedule validity...');
        
        // Test Stage 1: Daily bias analysis (05:00 UTC)
        const stage1Valid = cron.validate('0 5 * * 1-5');
        if (!stage1Valid) {
            throw new Error('Stage 1 cron schedule is invalid');
        }
        
        // Test Stage 2: London manipulation (every 15 mins during London killzone)
        const stage2Valid = cron.validate('*/15 6-9 * * 1-5');
        if (!stage2Valid) {
            throw new Error('Stage 2 cron schedule is invalid');
        }
        
        // Test Stage 3: Entry confirmation (every 5 mins during distribution)
        const stage3Valid = cron.validate('*/5 7-12 * * 1-5');
        if (!stage3Valid) {
            throw new Error('Stage 3 cron schedule is invalid');
        }
        
        // Test EOD: End of day close (15:00 UTC / 22:00 WIB)
        const eodValid = cron.validate('0 15 * * 1-5');
        if (!eodValid) {
            throw new Error('EOD cron schedule is invalid');
        }
        
        log.info('All cron schedules are valid!');
        return true;
        
    } catch (error) {
        log.error('Cron schedule test failed:', error);
        return false;
    }
}

module.exports = { testCronSchedules };

// Run test if called directly
if (require.main === module) {
    const result = testCronSchedules();
    process.exit(result ? 0 : 1);
}
