import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

import { db } from "../lib/firebase";

async function migrateShopIdField() {
  console.log("Starting migration: shop_id -> shopId");

  try {
    // Collections to migrate
    const collections = ["services", "branches", "technicians", "invoices", "tasks"];

    for (const collectionName of collections) {
      console.log(`\n🔄 Migrating ${collectionName} collection...`);

      const collectionRef = collection(db, collectionName);
      const querySnapshot = await getDocs(collectionRef);

      console.log(`Found ${querySnapshot.size} documents in ${collectionName}`);

      let migratedCount = 0;
      let errorCount = 0;

      // Use batch writes for better performance
      const batch = writeBatch(db);
      let batchCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit

      for (const docSnapshot of querySnapshot.docs) {
        try {
          const data = docSnapshot.data();

          // Check if document has shop_id field that needs migration
          if (data.shop_id && !data.shopId) {
            console.log(`Migrating ${collectionName} document ${docSnapshot.id}: shop_id -> shopId`);

            // Add shopId field and remove shop_id field
            batch.update(doc(db, collectionName, docSnapshot.id), {
              shopId: data.shop_id,
              shop_id: null, // This will remove the field
            });

            migratedCount++;
            batchCount++;

            // Commit batch when it reaches the limit
            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              console.log(`✅ Committed batch of ${batchCount} updates`);
              batchCount = 0;
            }
          } else if (data.shopId) {
            console.log(`Document ${docSnapshot.id} already has shopId field, skipping`);
          } else {
            console.log(`Document ${docSnapshot.id} has no shop_id field, skipping`);
          }
        } catch (error) {
          console.error(`❌ Error migrating ${collectionName} document ${docSnapshot.id}:`, error);
          errorCount++;
        }
      }

      // Commit any remaining batch operations
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Committed final batch of ${batchCount} updates`);
      }

      console.log(`\n📊 ${collectionName} migration completed!`);
      console.log(`✅ Successfully migrated: ${migratedCount} documents`);
      console.log(`❌ Errors: ${errorCount} documents`);
      console.log(`📊 Total processed: ${querySnapshot.size} documents`);
    }

    console.log(`\n🎉 All collections migrated successfully!`);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Also migrate branch_id to branchId for consistency
async function migrateBranchIdField() {
  console.log("\n🔄 Starting migration: branch_id -> branchId");

  try {
    // Collections that have branch_id field
    const collections = ["services", "technicians", "invoices", "tasks"];

    for (const collectionName of collections) {
      console.log(`\n🔄 Migrating ${collectionName} collection branch_id -> branchId...`);

      const collectionRef = collection(db, collectionName);
      const querySnapshot = await getDocs(collectionRef);

      console.log(`Found ${querySnapshot.size} documents in ${collectionName}`);

      let migratedCount = 0;
      let errorCount = 0;

      const batch = writeBatch(db);
      let batchCount = 0;
      const BATCH_SIZE = 500;

      for (const docSnapshot of querySnapshot.docs) {
        try {
          const data = docSnapshot.data();

          // Check if document has branch_id field that needs migration
          if (data.branch_id && !data.branchId) {
            console.log(`Migrating ${collectionName} document ${docSnapshot.id}: branch_id -> branchId`);

            batch.update(doc(db, collectionName, docSnapshot.id), {
              branchId: data.branch_id,
              branch_id: null, // This will remove the field
            });

            migratedCount++;
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              console.log(`✅ Committed batch of ${batchCount} updates`);
              batchCount = 0;
            }
          } else if (data.branchId) {
            console.log(`Document ${docSnapshot.id} already has branchId field, skipping`);
          } else {
            console.log(`Document ${docSnapshot.id} has no branch_id field, skipping`);
          }
        } catch (error) {
          console.error(`❌ Error migrating ${collectionName} document ${docSnapshot.id}:`, error);
          errorCount++;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Committed final batch of ${batchCount} updates`);
      }

      console.log(`\n📊 ${collectionName} branch_id migration completed!`);
      console.log(`✅ Successfully migrated: ${migratedCount} documents`);
      console.log(`❌ Errors: ${errorCount} documents`);
    }

    console.log(`\n🎉 All branch_id migrations completed successfully!`);
  } catch (error) {
    console.error("Branch ID migration failed:", error);
  }
}

// Run both migrations
async function runAllMigrations() {
  console.log("🚀 Starting field standardization migrations...");
  console.log("=".repeat(60));

  await migrateShopIdField();
  await migrateBranchIdField();

  console.log(`\n${  "=".repeat(60)}`);
  console.log("🎉 All migrations completed successfully!");
  console.log("✅ Firebase documents now use consistent field names:");
  console.log("   - shop_id → shopId");
  console.log("   - branch_id → branchId");
}

runAllMigrations()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
