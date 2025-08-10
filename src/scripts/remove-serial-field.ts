import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

import { db } from "../lib/firebase";
import { logger } from "../lib/logger";

async function removeSerialField() {
  logger.info("Starting cleanup: Remove serial field from all services");

  try {
    // Get all services
    const servicesRef = collection(db, "services");
    const querySnapshot = await getDocs(servicesRef);

    logger.info(`Found ${querySnapshot.size} services to process`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      try {
        const data = docSnapshot.data();

        // Check if the service has a device with serial field
        if (data.device && data.device.serial !== undefined) {
          logger.info(`Cleaning service ${docSnapshot.id}: removing serial field`);

          // Remove the serial field completely
          await updateDoc(doc(db, "services", docSnapshot.id), {
            "device.serial": null, // This will remove the field
          });

          cleanedCount++;
          logger.info(`✅ Successfully cleaned service ${docSnapshot.id}`);
        } else {
          logger.info(`Service ${docSnapshot.id} has no serial field, skipping`);
        }
      } catch (error) {
        logger.error(`❌ Error cleaning service ${docSnapshot.id}:`, { error: String(error) });
        errorCount++;
      }
    }

    logger.info(`\nCleanup completed!`);
    logger.info(`✅ Successfully cleaned: ${cleanedCount} services`);
    logger.info(`❌ Errors: ${errorCount} services`);
    logger.info(`📊 Total processed: ${querySnapshot.size} services`);
  } catch (error) {
    logger.error("Cleanup failed:", { error: String(error) });
  }
}

// Run the cleanup
removeSerialField()
  .then(() => {
    logger.info("Cleanup script completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Cleanup script failed:", { error: String(error) });
    process.exit(1);
  });
