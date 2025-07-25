import { useState } from "react";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { 
  User, 
  Service, 
  WorkLog, 
  Notification, 
  CustomerFeedback, 
  Report, 
  AuditLog, 
  Setting 
} from "../types";

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
  return emailRegex.test(email);
};



const sanitizeString = (str: string, maxLength: number = 1000): boolean => {
  return typeof str === 'string' && str.length <= maxLength;
};

const sanitizeDescription = (desc: string): boolean => {
  return typeof desc === 'string' && desc.length <= 5000;
};

// Rate limiting (simplified - in production use a proper rate limiting service)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (operation: string, maxRequests: number, timeWindow: number): boolean => {
  const now = Date.now();
  const key = operation;
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + timeWindow });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
};

// Audit logging helper
const createAuditLog = async (
  operation: "create" | "update" | "delete" | "read",
  resourcePath: string,
  userId: string,
  userRole: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
): Promise<void> => {
  try {
    const auditLog: Omit<AuditLog, "id"> = {
      operation,
      resourcePath,
      userId,
      userRole,
      timestamp: new Date(),
      oldData,
      newData,
      ipAddress: "client-side" // In production, get from request
    };
    
    await addDoc(collection(db, "audit_logs"), auditLog);
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

export function useFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User operations
  const getUser = async (uid: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return { uid, ...userDoc.data() } as User;
      }
      return null;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: Omit<User, "uid">, uid: string): Promise<void> => {
    if (!checkRateLimit('user_create', 5, 60000)) {
      throw new Error("Rate limit exceeded for user creation");
    }

    // Validate user data
    if (!userData.name || !sanitizeString(userData.name, 100)) {
      throw new Error("Invalid name");
    }
    if (!validateEmail(userData.email)) {
      throw new Error("Invalid email format");
    }
    if (!userData.role || !["shop_admin", "branch_admin", "technician", "super_admin"].includes(userData.role)) {
      throw new Error("Invalid role");
    }

    setLoading(true);
    setError(null);
    try {
      const userWithTimestamps = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: userData.status || "active"
      };
      
      await setDoc(doc(db, "users", uid), userWithTimestamps);
      await createAuditLog("create", `users/${uid}`, uid, userData.role, undefined, userWithTimestamps);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (uid: string, updates: Partial<User>): Promise<void> => {
    if (!checkRateLimit('user_update', 10, 60000)) {
      throw new Error("Rate limit exceeded for user updates");
    }

    // Validate updates
    if (updates.name && !sanitizeString(updates.name, 100)) {
      throw new Error("Invalid name");
    }
    if (updates.email && !validateEmail(updates.email)) {
      throw new Error("Invalid email format");
    }
    if (updates.bio && !sanitizeDescription(updates.bio)) {
      throw new Error("Invalid bio length");
    }

    setLoading(true);
    setError(null);
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, "users", uid), updateData);
      await createAuditLog("update", `users/${uid}`, uid, "unknown", undefined, updateData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (uid: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "users", uid));
      await createAuditLog("delete", `users/${uid}`, uid, "unknown");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Service operations
  const createService = async (serviceData: Omit<Service, "id">): Promise<string> => {
    if (!checkRateLimit('service_create', 20, 60000)) {
      throw new Error("Rate limit exceeded for service creation");
    }

    // Validate service data
    if (!serviceData.name || !sanitizeString(serviceData.name, 100)) {
      throw new Error("Invalid service name");
    }
    if (!sanitizeDescription(serviceData.description)) {
      throw new Error("Invalid description length");
    }
    if (serviceData.price < 0 || serviceData.price > 1000000) {
      throw new Error("Invalid price");
    }
    if (!serviceData.shopId || !serviceData.branchId) {
      throw new Error("Missing shop or branch ID");
    }

    setLoading(true);
    setError(null);
    try {
      const serviceWithTimestamps = {
        ...serviceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "services"), serviceWithTimestamps);
      await createAuditLog("create", `services/${docRef.id}`, "unknown", "unknown", undefined, serviceWithTimestamps);
      return docRef.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateService = async (serviceId: string, updates: Partial<Service>): Promise<void> => {
    if (!checkRateLimit('service_update', 30, 60000)) {
      throw new Error("Rate limit exceeded for service updates");
    }

    // Validate updates
    if (updates.name && !sanitizeString(updates.name, 100)) {
      throw new Error("Invalid service name");
    }
    if (updates.workNotes && !sanitizeDescription(updates.workNotes.join('\n'))) {
      throw new Error("Invalid work notes length");
    }
    if (updates.customerFeedback?.comment && !sanitizeDescription(updates.customerFeedback.comment)) {
      throw new Error("Invalid feedback comment length");
    }

    setLoading(true);
    setError(null);
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, "services", serviceId), updateData);
      await createAuditLog("update", `services/${serviceId}`, "unknown", "unknown", undefined, updateData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Work log operations
  const createWorkLog = async (workLogData: Omit<WorkLog, "id">): Promise<string> => {
    if (!checkRateLimit('worklog_create', 50, 60000)) {
      throw new Error("Rate limit exceeded for work log creation");
    }

    // Validate work log data
    if (!sanitizeString(workLogData.action)) {
      throw new Error("Invalid action");
    }
    if (!sanitizeDescription(workLogData.description)) {
      throw new Error("Invalid description length");
    }

    setLoading(true);
    setError(null);
    try {
      const workLogWithTimestamps = {
        ...workLogData,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "work_logs"), workLogWithTimestamps);
      await createAuditLog("create", `work_logs/${docRef.id}`, workLogData.technicianId, "technician", undefined, workLogWithTimestamps);
      return docRef.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Customer feedback operations
  const createCustomerFeedback = async (feedbackData: Omit<CustomerFeedback, "id">): Promise<string> => {
    if (!checkRateLimit('feedback_create', 10, 60000)) {
      throw new Error("Rate limit exceeded for feedback creation");
    }

    // Validate feedback data
    if (feedbackData.rating < 1 || feedbackData.rating > 5) {
      throw new Error("Invalid rating");
    }
    if (feedbackData.comment && !sanitizeDescription(feedbackData.comment)) {
      throw new Error("Invalid comment length");
    }

    setLoading(true);
    setError(null);
    try {
      const feedbackWithTimestamps = {
        ...feedbackData,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "customer_feedback"), feedbackWithTimestamps);
      await createAuditLog("create", `customer_feedback/${docRef.id}`, "public", "customer", undefined, feedbackWithTimestamps);
      return docRef.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Notification operations
  const createNotification = async (notificationData: Omit<Notification, "id">): Promise<string> => {
    // Validate notification data
    if (!sanitizeString(notificationData.title)) {
      throw new Error("Invalid title");
    }
    if (!sanitizeDescription(notificationData.message)) {
      throw new Error("Invalid message length");
    }
    if (!["info", "success", "warning", "error"].includes(notificationData.type)) {
      throw new Error("Invalid notification type");
    }

    setLoading(true);
    setError(null);
    try {
      const notificationWithTimestamps = {
        ...notificationData,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "notifications"), notificationWithTimestamps);
      return docRef.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Report operations
  const createReport = async (reportData: Omit<Report, "id">): Promise<string> => {
    // Validate report data
    if (!["sales", "services", "technicians", "customers", "financial"].includes(reportData.type)) {
      throw new Error("Invalid report type");
    }

    setLoading(true);
    setError(null);
    try {
      const reportWithTimestamps = {
        ...reportData,
        generatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "reports"), reportWithTimestamps);
      await createAuditLog("create", `reports/${docRef.id}`, reportData.createdBy, "unknown", undefined, reportWithTimestamps);
      return docRef.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Setting operations
  const createSetting = async (settingData: Omit<Setting, "id">): Promise<string> => {
    // Validate setting data
    if (!["notification", "billing", "security", "workflow", "custom"].includes(settingData.type)) {
      throw new Error("Invalid setting type");
    }

    setLoading(true);
    setError(null);
    try {
      const settingWithTimestamps = {
        ...settingData,
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "settings"), settingWithTimestamps);
      await createAuditLog("create", `settings/${docRef.id}`, "unknown", "unknown", undefined, settingWithTimestamps);
      return docRef.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Query helpers with pagination
  const getServicesByShop = async (shopId: string, limitCount: number = 100): Promise<Service[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "services"),
        where("shopId", "==", shopId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getWorkLogsByService = async (serviceId: string, limitCount: number = 100): Promise<WorkLog[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "work_logs"),
        where("serviceId", "==", serviceId),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkLog));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getNotificationsByUser = async (userId: string, limitCount: number = 100): Promise<Notification[]> => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    // User operations
    getUser,
    createUser,
    updateUser,
    deleteUser,
    
    // Service operations
    createService,
    updateService,
    
    // Work log operations
    createWorkLog,
    
    // Customer feedback operations
    createCustomerFeedback,
    
    // Notification operations
    createNotification,
    
    // Report operations
    createReport,
    
    // Setting operations
    createSetting,
    
    // Query helpers
    getServicesByShop,
    getWorkLogsByService,
    getNotificationsByUser,
    
    // State
    loading,
    error,
  };
} 