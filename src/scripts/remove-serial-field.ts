import { db } from "../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function removeSerialField() {
  console.log("Starting cleanup: Remove serial field from all services");
  
  try {
    // Get all services
    const servicesRef = collection(db, "services");
    const querySnapshot = await getDocs(servicesRef);
    
    console.log(`Found ${querySnapshot.size} services to process`);
    
    let cleanedCount = 0;
    let errorCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const data = docSnapshot.data();
        
        // Check if the service has a device with serial field
        if (data.device && data.device.serial !== undefined) {
          console.log(`Cleaning service ${docSnapshot.id}: removing serial field`);
          
          // Remove the serial field completely
          await updateDoc(doc(db, "services", docSnapshot.id), {
            "device.serial": null // This will remove the field
          });
          
          cleanedCount++;
          console.log(`✅ Successfully cleaned service ${docSnapshot.id}`);
        } else {
          console.log(`Service ${docSnapshot.id} has no serial field, skipping`);
        }
      } catch (error) {
        console.error(`❌ Error cleaning service ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\nCleanup completed!`);
    console.log(`✅ Successfully cleaned: ${cleanedCount} services`);
    console.log(`❌ Errors: ${errorCount} services`);
    console.log(`📊 Total processed: ${querySnapshot.size} services`);
    
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// Run the cleanup
removeSerialField().then(() => {
  console.log("Cleanup script completed");
  process.exit(0);
}).catch((error) => {
  console.error("Cleanup script failed:", error);
  process.exit(1);
});
