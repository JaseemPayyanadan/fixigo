/**
 * Field name mapping utilities for handling legacy and standardized field names
 */

// Legacy to standardized field name mappings
export const FIELD_MAPPINGS = {
  // Shop fields
  shop_id: "shopId",

  // Branch fields
  branch_id: "branchId",

  // Technician fields
  technician_id: "assignedTechnicianId",

  // Service fields
  serviceName: "name",
  total: "price",

  // User fields
  created_by: "createdBy",
} as const;

// Reverse mappings for backward compatibility
export const REVERSE_FIELD_MAPPINGS = Object.fromEntries(Object.entries(FIELD_MAPPINGS).map(([key, value]) => [value, key]));

/**
 * Standardize field names in an object
 */
export function standardizeFields<T extends Record<string, unknown>>(obj: T): T {
  const standardized = { ...obj };

  for (const [legacyField, standardField] of Object.entries(FIELD_MAPPINGS)) {
    if (legacyField in standardized && !(standardField in standardized)) {
      (standardized as Record<string, unknown>)[standardField] = (standardized as Record<string, unknown>)[legacyField];
      delete (standardized as Record<string, unknown>)[legacyField];
    }
  }

  return standardized;
}

/**
 * Convert to legacy field names for backward compatibility
 */
export function toLegacyFields<T extends Record<string, unknown>>(obj: T): T {
  const legacy = { ...obj };

  for (const [standardField, legacyField] of Object.entries(REVERSE_FIELD_MAPPINGS)) {
    if (standardField in legacy && !(legacyField in legacy)) {
      (legacy as Record<string, unknown>)[legacyField] = (legacy as Record<string, unknown>)[standardField];
      delete (legacy as Record<string, unknown>)[standardField];
    }
  }

  return legacy;
}

/**
 * Get the standardized field name for a given field
 */
export function getStandardFieldName(field: string): string {
  return FIELD_MAPPINGS[field as keyof typeof FIELD_MAPPINGS] || field;
}

/**
 * Get the legacy field name for a given field
 */
export function getLegacyFieldName(field: string): string {
  return REVERSE_FIELD_MAPPINGS[field] || field;
}

/**
 * Check if a field name is legacy
 */
export function isLegacyField(field: string): boolean {
  return field in FIELD_MAPPINGS && FIELD_MAPPINGS[field as keyof typeof FIELD_MAPPINGS] !== field;
}

/**
 * Get all possible field names for a given field
 */
export function getAllFieldNames(field: string): string[] {
  const standard = getStandardFieldName(field);
  const legacy = getLegacyFieldName(field);
  return [...new Set([field, standard, legacy])];
}

/**
 * Field name constants for consistent usage
 */
export const FIELD_NAMES = {
  // Shop fields
  SHOP_ID: "shopId",

  // Branch fields
  BRANCH_ID: "branchId",

  // Technician fields
  TECHNICIAN_ID: "assignedTechnicianId",

  // Service fields
  SERVICE_NAME: "name",
  SERVICE_PRICE: "price",

  // User fields
  USER_UID: "uid",
  USER_CREATED_BY: "createdBy",
} as const;

/**
 * Status constants for consistent usage
 */
export const STATUS_VALUES = {
  SERVICE: {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    ON_HOLD: "on_hold",
    AWAITING_PARTS: "awaiting_parts",
    READY_FOR_PICKUP: "ready_for_pickup",
    QUALITY_CHECK: "quality_check",
  },

  PAYMENT: {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    PARTIAL: "partial",
    REFUNDED: "refunded",
  },

  PRIORITY: {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
  },

  USER: {
    ACTIVE: "active",
    INACTIVE: "inactive",
  },
} as const;

/**
 * Helper function to get field value with fallbacks
 */
export function getFieldValue<T>(obj: Record<string, unknown>, field: string, fallback?: T): T | undefined {
  const allNames = getAllFieldNames(field);

  for (const name of allNames) {
    if (name in obj && obj[name] !== undefined && obj[name] !== null) {
      return obj[name] as T;
    }
  }

  return fallback;
}

/**
 * Helper function to set field value with standardization
 */
export function setFieldValue<T>(obj: Record<string, unknown>, field: string, value: T): void {
  const standardField = getStandardFieldName(field);
  obj[standardField] = value;

  // Also set legacy field for backward compatibility
  const legacyField = getLegacyFieldName(standardField);
  if (legacyField !== standardField) {
    obj[legacyField] = value;
  }
}
