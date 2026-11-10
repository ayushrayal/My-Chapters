import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { SomedayCategoryService } from '../services/someday-category.service.js';

/**
 * Migration Script: Ensures all existing Spaces have the predefined system 'Other' category.
 * Idempotent: can be safely executed multiple times.
 */
async function runMigration() {
  console.log('[Migration] Starting Someday Other category migration for all Spaces...');

  try {
    await connectDatabase();

    const result = await SomedayCategoryService.ensureOtherCategoriesForAllSpaces();

    console.log('[Migration] Someday Other category migration finished successfully:');
    console.log(`  - Total Spaces evaluated: ${result.totalSpaces}`);
    console.log(`  - Other categories newly provisioned: ${result.provisioned}`);
    console.log(`  - Other categories already existing: ${result.alreadyPresent}`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Migration failed with error:', error);
    try {
      await disconnectDatabase();
    } catch {
      // Ignore disconnect errors on fatal exit
    }
    process.exit(1);
  }
}

// Run when executed directly
if (process.argv[1] && process.argv[1].endsWith('migrate-someday-other.js')) {
  runMigration();
}

export { runMigration };

