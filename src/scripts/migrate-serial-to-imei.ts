import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

async function migrateSerialToImei() {
  console.log("Starting migration: serial -> imei");

  try {
    // Get all services
    const servicesRef = collection(db, "services");
    const querySnapshot = await getDocs(servicesRef);

    console.log(`Found ${querySnapshot.size} services to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      try {
        const data = docSnapshot.data();

        // Check if the service has a device with serial field
        if (data.device && data.device.serial && !data.device.imei) {
          console.log(`Migrating service ${docSnapshot.id}: serial -> imei`);

          // Update the document to rename serial to imei
          await updateDoc(doc(db, "services", docSnapshot.id), {
            "device.imei": data.device.serial,
            "device.serial": null, // Set to null to indicate it's been migrated
          });

          migratedCount++;
          console.log(`✅ Successfully migrated service ${docSnapshot.id}`);
        } else if (data.device && data.device.imei) {
          console.log(`Service ${docSnapshot.id} already has imei field, skipping`);
        } else {
          console.log(`Service ${docSnapshot.id} has no device or serial field, skipping`);
        }
      } catch (error) {
        console.error(`❌ Error migrating service ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\nMigration completed!`);
    console.log(`✅ Successfully migrated: ${migratedCount} services`);
    console.log(`❌ Errors: ${errorCount} services`);
    console.log(`📊 Total processed: ${querySnapshot.size} services`);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Run the migration
migrateSerialToImei()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
