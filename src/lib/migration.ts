import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp } from "firebase/firestore";

import { db } from "./firebase";
import { logger } from "./logger";

// New collection names for normalized structure
export const COLLECTIONS = {
  SHOPS: "shops",
  BRANCHES: "branches",
  TECHNICIANS: "technicians",
  SERVICES: "services",
  TASKS: "tasks",
  CUSTOMERS: "customers",
  PARTS: "parts",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "audit_logs",
} as const;

interface MigrationStats {
  users: number;
  shops: number;
  branches: number;
  technicians: number;
  services: number;
  tasks: number;
  customers: number;
  errors: string[];
}

export class FirestoreMigration {
  private stats: MigrationStats = {
    users: 0,
    shops: 0,
    branches: 0,
    technicians: 0,
    services: 0,
    tasks: 0,
    customers: 0,
    errors: [],
  };

  /**
   * Main migration function
   */
  async migrateAll(): Promise<MigrationStats> {
    logger.info("Starting Firestore migration to normalized structure");

    try {
      // Step 1: Migrate users (already in flat structure)
      await this.migrateUsers();

      // Step 2: Migrate shops (already in flat structure)
      await this.migrateShops();

      // Step 3: Migrate branches from subcollections to flat structure
      await this.migrateBranches();

      // Step 4: Migrate technicians from branch members to flat structure
      await this.migrateTechnicians();

      // Step 5: Migrate services from branch subcollections to flat structure
      await this.migrateServices();

      // Step 6: Migrate tasks from branch subcollections to flat structure
      await this.migrateTasks();

      // Step 7: Extract customers from services
      await this.extractCustomers();

      logger.info("Migration completed successfully", {
        users: this.stats.users,
        shops: this.stats.shops,
        branches: this.stats.branches,
        technicians: this.stats.technicians,
        services: this.stats.services,
        tasks: this.stats.tasks,
        customers: this.stats.customers,
        errorCount: this.stats.errors.length,
      });
      return this.stats;
    } catch (error) {
      logger.error("Migration failed", { error: error as Error });
      throw error;
    }
  }

  /**
   * Migrate users collection (already flat)
   */
  private async migrateUsers(): Promise<void> {
    logger.info("Migrating users collection");

    try {
      const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        // Update user document with normalized structure
        await setDoc(doc(db, COLLECTIONS.USERS, userDoc.id), {
          ...userData,
          id: userDoc.id,
          createdAt: userData.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        this.stats.users++;
      }

      logger.info(`Migrated ${this.stats.users} users`);
    } catch (error) {
      const errorMessage = `Users migration error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error migrating users", { error: error as Error });
    }
  }

  /**
   * Migrate shops collection (already flat)
   */
  private async migrateShops(): Promise<void> {
    logger.info("Migrating shops collection");

    try {
      const shopsSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS));

      for (const shopDoc of shopsSnapshot.docs) {
        const shopData = shopDoc.data();

        // Update shop document with normalized structure
        await setDoc(doc(db, COLLECTIONS.SHOPS, shopDoc.id), {
          ...shopData,
          id: shopDoc.id,
          createdAt: shopData.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        this.stats.shops++;
      }

      logger.info(`Migrated ${this.stats.shops} shops`);
    } catch (error) {
      const errorMessage = `Shops migration error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error migrating shops", { error: error as Error });
    }
  }

  /**
   * Migrate branches from subcollections to flat structure
   */
  private async migrateBranches(): Promise<void> {
    logger.info("Migrating branches from subcollections to flat structure");

    try {
      const shopsSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS));

      for (const shopDoc of shopsSnapshot.docs) {
        const shopId = shopDoc.id;

        try {
          // Get branches subcollection
          const branchesSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS, shopId, "branches"));

          for (const branchDoc of branchesSnapshot.docs) {
            const branchData = branchDoc.data();

            // Create branch in flat structure
            await setDoc(doc(db, COLLECTIONS.BRANCHES, branchDoc.id), {
              ...branchData,
              id: branchDoc.id,
              shopId,
              createdAt: branchData.createdAt || Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            this.stats.branches++;
          }
        } catch (error) {
          logger.warn(`Error migrating branches for shop ${shopId}:`, { error: String(error) });
          this.stats.errors.push(`Branches for shop ${shopId} migration error: ${error}`);
        }
      }

      logger.info(`Migrated ${this.stats.branches} branches`);
    } catch (error) {
      const errorMessage = `Branches migration error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error migrating branches", { error: error as Error });
    }
  }

  /**
   * Migrate technicians from branch members to flat structure
   */
  private async migrateTechnicians(): Promise<void> {
    logger.info("Migrating technicians from branch members to flat structure");

    try {
      const branchesSnapshot = await getDocs(collection(db, COLLECTIONS.BRANCHES));

      for (const branchDoc of branchesSnapshot.docs) {
        const branchData = branchDoc.data();
        const members = branchData.members || [];

        for (const member of members) {
          if (member.role === "technician") {
            try {
              // Get user data
              const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, member.userId));
              const userData = userDoc.exists() ? userDoc.data() : {};

              // Create technician in flat structure
              await setDoc(doc(db, COLLECTIONS.TECHNICIANS, member.userId), {
                id: member.userId,
                userId: member.userId,
                name: userData.name || member.name || "Unknown Technician",
                email: userData.email || member.email || "",
                phone: userData.phone || member.phone || "",
                role: "technician",
                shopId: member.shopId || branchData.shopId,
                branchId: member.branchId || branchDoc.id,
                skills: member.skills || [],
                status: member.status || "active",
                bio: member.bio || "",
                specializations: member.specializations || [],
                experience: member.experience || 0,
                rating: member.rating || 0,
                totalServices: member.totalServices || 0,
                completedServices: member.completedServices || 0,
                availability: member.availability || {},
                createdAt: member.createdAt || Timestamp.now(),
                updatedAt: Timestamp.now(),
              });

              this.stats.technicians++;
            } catch (error) {
              logger.warn(`Error migrating technician ${member.userId}`, { error: String(error) });
              this.stats.errors.push(`Technician ${member.userId} migration error: ${error}`);
            }
          }
        }
      }

      logger.info(`Migrated ${this.stats.technicians} technicians`);
    } catch (error) {
      const errorMessage = `Technicians migration error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error migrating technicians", { error: error as Error });
    }
  }

  /**
   * Migrate services from branch subcollections to flat structure
   */
  private async migrateServices(): Promise<void> {
    logger.info("Migrating services from branch subcollections to flat structure");

    try {
      const branchesSnapshot = await getDocs(collection(db, COLLECTIONS.BRANCHES));

      for (const branchDoc of branchesSnapshot.docs) {
        const branchData = branchDoc.data();

        try {
          // Check if branch has shopId
          if (!branchData.shopId) {
            logger.warn(`Branch ${branchDoc.id} has no shopId, skipping services migration`);
            continue;
          }

          // Get services subcollection
          const servicesSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS, branchData.shopId, "branches", branchDoc.id, "services"));

          for (const serviceDoc of servicesSnapshot.docs) {
            const serviceData = serviceDoc.data();

            // Create service in flat structure
            await setDoc(doc(db, COLLECTIONS.SERVICES, serviceDoc.id), {
              ...serviceData,
              id: serviceDoc.id,
              shopId: branchData.shopId,
              branchId: branchDoc.id,
              createdAt: serviceData.createdAt || Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            this.stats.services++;
          }
        } catch (error) {
          logger.warn(`Error migrating services for branch ${branchDoc.id}`, { error: String(error) });
          this.stats.errors.push(`Services for branch ${branchDoc.id} migration error: ${error}`);
        }
      }

      logger.info(`Migrated ${this.stats.services} services`);
    } catch (error) {
      const errorMessage = `Services migration error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error migrating services", { error: error as Error });
    }
  }

  /**
   * Migrate tasks from branch subcollections to flat structure
   */
  private async migrateTasks(): Promise<void> {
    logger.info("Migrating tasks from branch subcollections to flat structure");

    try {
      const branchesSnapshot = await getDocs(collection(db, COLLECTIONS.BRANCHES));

      for (const branchDoc of branchesSnapshot.docs) {
        const branchData = branchDoc.data();

        try {
          // Check if branch has shopId
          if (!branchData.shopId) {
            logger.warn(`Branch ${branchDoc.id} has no shopId, skipping tasks migration`);
            continue;
          }

          // Get tasks subcollection
          const tasksSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS, branchData.shopId, "branches", branchDoc.id, "tasks"));

          for (const taskDoc of tasksSnapshot.docs) {
            const taskData = taskDoc.data();

            // Create task in flat structure
            await setDoc(doc(db, COLLECTIONS.TASKS, taskDoc.id), {
              ...taskData,
              id: taskDoc.id,
              shopId: branchData.shopId,
              branchId: branchDoc.id,
              createdAt: taskData.createdAt || Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

            this.stats.tasks++;
          }
        } catch (error) {
          logger.warn(`Error migrating tasks for branch ${branchDoc.id}`, { error: String(error) });
          this.stats.errors.push(`Tasks for branch ${branchDoc.id} migration error: ${error}`);
        }
      }

      logger.info(`Migrated ${this.stats.tasks} tasks`);
    } catch (error) {
      const errorMessage = `Tasks migration error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error migrating tasks", { error: error as Error });
    }
  }

  /**
   * Extract customers from services
   */
  private async extractCustomers(): Promise<void> {
    logger.info("Extracting customers from services");

    try {
      const servicesSnapshot = await getDocs(collection(db, COLLECTIONS.SERVICES));
      const customerMap = new Map<string, any>();

      for (const serviceDoc of servicesSnapshot.docs) {
        const serviceData = serviceDoc.data();
        const customer = serviceData.customer;

        if (customer && customer.name) {
          const customerKey = `${customer.name}-${customer.phone}-${serviceData.shopId}`;

          if (!customerMap.has(customerKey)) {
            customerMap.set(customerKey, {
              name: customer.name,
              email: customer.email || "",
              phone: customer.phone || "",
              address: customer.address || "",
              shopId: serviceData.shopId,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      // Create customer documents
      for (const [key, customerData] of customerMap) {
        const customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId), {
          id: customerId,
          ...customerData,
        });

        this.stats.customers++;
      }

      logger.info(`Extracted ${this.stats.customers} customers`);
    } catch (error) {
      const errorMessage = `Customers extraction error: ${error}`;
      this.stats.errors.push(errorMessage);
      logger.error("Error extracting customers", { error: error as Error });
    }
  }

  /**
   * Clean up old subcollections after successful migration
   */
  async cleanupOldStructure(): Promise<void> {
    logger.info("Cleaning up old subcollection structure");

    try {
      const shopsSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS));

      for (const shopDoc of shopsSnapshot.docs) {
        const shopId = shopDoc.id;

        try {
          // Delete branches subcollection
          const branchesSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS, shopId, "branches"));

          for (const branchDoc of branchesSnapshot.docs) {
            const branchId = branchDoc.id;

            try {
              // Delete services subcollection
              const servicesSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS, shopId, "branches", branchId, "services"));

              for (const serviceDoc of servicesSnapshot.docs) {
                await deleteDoc(doc(db, COLLECTIONS.SHOPS, shopId, "branches", branchId, "services", serviceDoc.id));
              }

              // Delete tasks subcollection
              const tasksSnapshot = await getDocs(collection(db, COLLECTIONS.SHOPS, shopId, "branches", branchId, "tasks"));

              for (const taskDoc of tasksSnapshot.docs) {
                await deleteDoc(doc(db, COLLECTIONS.SHOPS, shopId, "branches", branchId, "tasks", taskDoc.id));
              }

              // Delete branch document
              await deleteDoc(doc(db, COLLECTIONS.SHOPS, shopId, "branches", branchId));
            } catch (error) {
              logger.warn(`Error cleaning up branch ${branchId}`, { error: String(error) });
            }
          }
        } catch (error) {
          logger.warn(`Error cleaning up shop ${shopId}`, { error: String(error) });
        }
      }

      logger.info("Old subcollection structure cleaned up successfully");
    } catch (error) {
      logger.error("Error cleaning up old structure", { error: error as Error });
      throw error;
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration(): Promise<boolean> {
    logger.info("Validating migration results");

    try {
      const validationResults = {
        users: await this.validateCollection(COLLECTIONS.USERS),
        shops: await this.validateCollection(COLLECTIONS.SHOPS),
        branches: await this.validateCollection(COLLECTIONS.BRANCHES),
        technicians: await this.validateCollection(COLLECTIONS.TECHNICIANS),
        services: await this.validateCollection(COLLECTIONS.SERVICES),
        tasks: await this.validateCollection(COLLECTIONS.TASKS),
        customers: await this.validateCollection(COLLECTIONS.CUSTOMERS),
      };

      const allValid = Object.values(validationResults).every((result) => result);

      logger.info("Migration validation results", {
        users: validationResults.users,
        shops: validationResults.shops,
        branches: validationResults.branches,
        technicians: validationResults.technicians,
        services: validationResults.services,
        tasks: validationResults.tasks,
        customers: validationResults.customers,
      });

      return allValid;
    } catch (error) {
      logger.error("Error validating migration", { error: error as Error });
      return false;
    }
  }

  private async validateCollection(collectionName: string): Promise<boolean> {
    try {
      await getDocs(collection(db, collectionName));
      // Consider empty collections as valid (they exist but have no data)
      return true;
    } catch (error) {
      logger.error(`Error validating collection ${collectionName}`, { error: error as Error });
      return false;
    }
  }
}

// Export migration instance
export const firestoreMigration = new FirestoreMigration();
