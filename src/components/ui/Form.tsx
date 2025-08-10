"use client";
import React, { useState, useCallback } from "react";

import { logger } from '@/lib/logger';
import { Validator, ValidationSchema } from '@/lib/validation';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  validation?: ValidationRule;
  options?: Array<{ value: string; label: string }>;
}

interface FormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
  submitText?: string;
  loading?: boolean;
  className?: string;
  initialData?: Record<string, string>;
}

export function Form({ 
  fields, 
  onSubmit, 
  initialData = {}, 
  submitText = "Submit",
  loading = false,
  className = ""
}: FormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationSchema: ValidationSchema = {};
  fields.forEach(field => {
    if (field.validation) {
      validationSchema[field.name] = field.validation;
    }
  });

  const validator = new Validator(validationSchema);

  const handleInputChange = useCallback((name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: String(value) }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const result = validator.validate(formData);
    setErrors(result.errors);
    return result.isValid;
  }, [formData, validator]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      logger.warn('Form validation failed', { errorCount: Object.keys(errors).length });
      return;
    }

    setIsSubmitting(true);
    
    try {
      logger.info('Form submission started', { fieldCount: Object.keys(formData).length });
      await onSubmit(formData);
      logger.info('Form submission completed successfully');
    } catch (error) {
      logger.error('Form submission failed', { error: error as Error, fieldCount: Object.keys(formData).length });
      setErrors({ submit: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, validateForm]);

  const renderField = (field: FormField) => {
    const { name, label, type, required, placeholder, options } = field;
    const value = formData[name] || '';
    const error = errors[name];

    const commonProps = {
      id: name,
      name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => 
        handleInputChange(name, e.target.value),
      className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`,
      placeholder,
      required,
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select {label}</option>
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={value === 'true'}
            onChange={(e) => handleInputChange(name, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type={type}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {fields.map(field => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {renderField(field)}
          
          {errors[field.name] && (
            <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
          )}
        </div>
      ))}

      {errors.submit && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{errors.submit}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting || loading ? 'Submitting...' : submitText}
      </button>
    </form>
  );
}

// Specialized form components
export function ContactForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => Promise<void> }) {
  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your name',
      validation: { required: true, minLength: 2 }
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Enter your email',
      validation: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      placeholder: 'Enter your message',
      validation: { required: true, minLength: 10 }
    }
  ];

  return <Form fields={fields} onSubmit={onSubmit} submitText="Send Message" />;
}

export function LoginForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => Promise<void> }) {
  const fields: FormField[] = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Enter your email',
      validation: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Enter your password',
      validation: { required: true, minLength: 6 }
    }
  ];

  return <Form fields={fields} onSubmit={onSubmit} submitText="Sign In" />;
} 