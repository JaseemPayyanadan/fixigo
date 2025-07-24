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
      const value = data[field] || '';
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
        errors[field] = fieldErrors.join(', ');
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export type { ValidationRule, ValidationSchema, ValidationResult };

// Common validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  url: /^https?:\/\/.+/,
  numeric: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/
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
  alphanumeric: { pattern: patterns.alphanumeric }
};

// Utility functions
export function validateEmail(email: string): boolean {
  return patterns.email.test(email);
}

export function validatePhone(phone: string): boolean {
  return patterns.phone.test(phone.replace(/\s/g, ''));
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function validateStrongPassword(password: string): boolean {
  return patterns.password.test(password);
} 