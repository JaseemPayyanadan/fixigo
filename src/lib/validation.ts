export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class Validator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(this.schema)) {
      const value = data[field];
      const error = this.validateField(field, value, rules);
      
      if (error) {
        errors[field] = error;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  private validateField(field: string, value: any, rules: ValidationRule): string | null {
    // Required check
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${this.formatFieldName(field)} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Type-specific validations
    if (typeof value === 'string') {
      // Length validations
      if (rules.minLength && value.length < rules.minLength) {
        return `${this.formatFieldName(field)} must be at least ${rules.minLength} characters`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        return `${this.formatFieldName(field)} must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${this.formatFieldName(field)} format is invalid`;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  }
}

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