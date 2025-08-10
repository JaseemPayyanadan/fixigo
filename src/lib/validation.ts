interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationSchema {
  [field: string]: ValidationRule;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class Validator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  validate(data: Record<string, string>): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(this.schema)) {
      const value = data[field] || "";
      const fieldErrors: string[] = [];

      // Required validation
      if (rules.required && !value.trim()) {
        fieldErrors.push(`${field} is required`);
      }

      // Min length validation
      if (rules.minLength && value.length < rules.minLength) {
        fieldErrors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      // Max length validation
      if (rules.maxLength && value.length > rules.maxLength) {
        fieldErrors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        fieldErrors.push(`${field} format is invalid`);
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
          fieldErrors.push(customError);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors.join(", ");
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export type { ValidationResult, ValidationRule, ValidationSchema };

// Common validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  url: /^https?:\/\/.+/,
  numeric: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
};

// Common validation rules
export const rules = {
  required: { required: true },
  email: { required: true, pattern: patterns.email },
  phone: { required: true, pattern: patterns.phone },
  password: { required: true, minLength: 6 },
  strongPassword: { required: true, pattern: patterns.password },
  url: { pattern: patterns.url },
  numeric: { pattern: patterns.numeric },
  alphanumeric: { pattern: patterns.alphanumeric },
};

// Utility functions
export function validateEmail(email: string): boolean {
  return patterns.email.test(email);
}

export function validatePhone(phone: string): boolean {
  return patterns.phone.test(phone.replace(/\s/g, ""));
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function validateStrongPassword(password: string): boolean {
  return patterns.password.test(password);
}

// Invoice-specific validation rules
export const invoiceValidationRules = {
  customerName: { required: true, minLength: 2, maxLength: 100 },
  customerEmail: { required: true, pattern: patterns.email },
  customerPhone: { required: true, pattern: patterns.phone },
  amount: {
    required: true,
    custom: (value: string) => {
      const num = parseFloat(value);
      return isNaN(num) || num < 0 ? "Amount must be a positive number" : null;
    },
  },
  tax: {
    custom: (value: string) => {
      const num = parseFloat(value);
      return isNaN(num) || num < 0 ? "Tax must be a positive number" : null;
    },
  },
  total: {
    required: true,
    custom: (value: string) => {
      const num = parseFloat(value);
      return isNaN(num) || num < 0 ? "Total must be a positive number" : null;
    },
  },
  discount: {
    custom: (value: string) => {
      const num = parseFloat(value);
      return isNaN(num) || num < 0 ? "Discount must be a positive number" : null;
    },
  },
  advance: {
    custom: (value: string) => {
      const num = parseFloat(value);
      return isNaN(num) || num < 0 ? "Advance must be a positive number" : null;
    },
  },
  dueDate: {
    required: true,
    custom: (value: string) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? "Invalid due date" : null;
    },
  },
  items: {
    required: true,
    custom: (value: any) => {
      if (!Array.isArray(value) || value.length === 0) {
        return "At least one item is required";
      }
      for (const item of value) {
        if (!item.name || !item.quantity || !item.unitPrice) {
          return "All items must have name, quantity, and unit price";
        }
        if (item.quantity <= 0 || item.unitPrice < 0) {
          return "Quantity and unit price must be positive";
        }
      }
      return null;
    },
  },
};

// Invoice validation function
export function validateInvoice(invoice: any): ValidationResult {
  const validator = new Validator(invoiceValidationRules);
  return validator.validate(invoice);
}

// Calculate invoice totals
export function calculateInvoiceTotals(items: any[], discount: number = 0, tax: number = 0, advance: number = 0) {
  const subtotal = items.reduce((sum, item) => {
    const quantity = item.quantity || item.qty || 1;
    const unitPrice = item.unitPrice || item.price || 0;
    return sum + quantity * unitPrice;
  }, 0);

  const totalAfterDiscount = subtotal - discount;
  const totalAfterTax = totalAfterDiscount + tax;
  const finalTotal = totalAfterTax - advance;

  return {
    subtotal,
    totalAfterDiscount,
    totalAfterTax,
    finalTotal,
    discount,
    tax,
    advance,
  };
}

// Validate invoice status transitions
export function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    draft: ["sent", "cancelled"],
    sent: ["paid", "overdue", "cancelled"],
    paid: ["refunded"],
    overdue: ["paid", "cancelled"],
    cancelled: [],
    Pending: ["paid", "cancelled"], // Legacy status
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// Validate payment status transitions
export function validatePaymentStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ["paid", "failed", "partial"],
    paid: ["refunded"],
    failed: ["pending"],
    partial: ["paid", "refunded"],
    refunded: [],
    Pending: ["paid", "failed", "partial"], // Legacy status
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}
