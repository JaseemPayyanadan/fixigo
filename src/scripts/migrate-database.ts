#!/usr/bin/env tsx

import { firestoreMigration } from "../lib/migration";

/**
 * Database Migration Script
 *
 * This script performs the migration from the current nested subcollection structure
 * to a normalized flat structure for better scalability and performance.
 *
 * Usage:
 * npm run migrate
 *
 * The script will:
 * 1. Backup current data
 * 2. Migrate all collections to flat structure
 * 3. Validate migration results
 * 4. Clean up old structure (optional)
 */

async function main() {
  console.log("🚀 Starting Firestore Database Migration");
  console.log("==========================================");

  try {
    // Step 1: Perform migration
    console.log("\n📊 Step 1: Migrating data to normalized structure...");
    const stats = await firestoreMigration.migrateAll();

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📈 Migration Statistics:");
    console.log(`   Users: ${stats.users}`);
    console.log(`   Shops: ${stats.shops}`);
    console.log(`   Branches: ${stats.branches}`);
    console.log(`   Technicians: ${stats.technicians}`);
    console.log(`   Services: ${stats.services}`);
    console.log(`   Branches: ${stats.branches}`);
    console.log(`   Technicians: ${stats.technicians}`);
    console.log(`   Tasks: ${stats.tasks}`);
    console.log(`   Customers: ${stats.customers}`);

    if (stats.errors.length > 0) {
      console.log("\n⚠️  Migration Errors:");
      stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Step 2: Validate migration
    console.log("\n🔍 Step 2: Validating migration results...");
    const isValid = await firestoreMigration.validateMigration();

    if (isValid) {
      console.log("✅ Migration validation passed!");
    } else {
      console.log("❌ Migration validation failed!");
      process.exit(1);
    }

    // Step 3: Ask for cleanup confirmation
    console.log("\n🧹 Step 3: Cleanup old structure");
    console.log("The migration has completed successfully. You can now:");
    console.log("1. Test the new structure with your application");
    console.log("2. Run cleanup to remove old subcollections (optional)");
    console.log("3. Update your application code to use the new structure");

    // Note: In a real scenario, you'd want to add a prompt here
    // For now, we'll just log the instructions
    console.log("\n📝 Next Steps:");
    console.log("1. Update your application code to use the new flat structure");
    console.log("2. Test all functionality with the new structure");
    console.log("3. Run cleanup when ready: npm run migrate:cleanup");
    console.log("4. Deploy updated security rules and indexes");

    console.log("\n🎉 Migration script completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Cleanup function
async function cleanup() {
  console.log("🧹 Starting cleanup of old subcollection structure...");

  try {
    await firestoreMigration.cleanupOldStructure();
    console.log("✅ Cleanup completed successfully!");
    console.log("\n⚠️  Warning: Old subcollection structure has been removed.");
    console.log("Make sure your application is fully updated to use the new structure.");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Validation function
async function validate() {
  console.log("🔍 Validating migration results...");

  try {
    const isValid = await firestoreMigration.validateMigration();

    if (isValid) {
      console.log("✅ Migration validation passed!");
    } else {
      console.log("❌ Migration validation failed!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case "cleanup":
    cleanup();
    break;
  case "validate":
    validate();
    break;
  default:
    main();
    break;
}
