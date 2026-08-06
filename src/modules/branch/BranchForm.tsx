"use client";

import React, { useEffect, useState } from "react";

import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import TextInput from "@/components/ui/TextInput";

interface BranchFormProps {
  onSubmit: (branch: {
    name: string;
    location: string;
    phone: string;
    email: string;
    password: string;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
  }) => Promise<void>;
  loading: boolean;
  initialData?: Partial<{
    name: string;
    location: string;
    phone: string;
    email: string;
    managerName?: string;
    managerEmail?: string;
    managerPhone?: string;
  }>;
  editing?: boolean;
  onCancel?: () => void;
}

export const BranchForm: React.FC<BranchFormProps> = ({
  onSubmit,
  loading,
  initialData,
  editing,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    location: initialData?.location || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    password: "",
    managerName: initialData?.managerName || "",
    managerEmail: initialData?.managerEmail || "",
    managerPhone: initialData?.managerPhone || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialData) return;
    setFormData((prev) => ({
      ...prev,
      name: initialData.name || "",
      location: initialData.location || "",
      phone: initialData.phone || "",
      email: initialData.email || "",
      managerName: initialData.managerName || "",
      managerEmail: initialData.managerEmail || "",
      managerPhone: initialData.managerPhone || "",
    }));
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Branch name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Branch name must be at least 2 characters";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    } else if (formData.location.trim().length < 2) {
      newErrors.location = "Location must be at least 2 characters";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!editing) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit({
        name: formData.name.trim(),
        location: formData.location.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
        managerName: formData.managerName.trim() || (editing ? undefined : ""),
        managerEmail: formData.managerEmail.trim() || (editing ? undefined : ""),
        managerPhone: formData.managerPhone.trim() || (editing ? undefined : ""),
      });

      if (!editing) {
        setFormData({
          name: "",
          location: "",
          phone: "",
          email: "",
          password: "",
          managerName: "",
          managerEmail: "",
          managerPhone: "",
        });
      }
    } catch (error: unknown) {
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5 px-4 py-6 md:px-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Branch information</h2>
        <p className="mb-4 text-sm text-gray-500">
          {editing ? "Update the branch details" : "Enter the basic details for this location"}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            type="text"
            name="name"
            id="name"
            label="Branch Name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Downtown"
            required
            icon={<BuildingOfficeIcon className="h-5 w-5 text-gray-400" />}
            error={errors.name}
            autoComplete="off"
          />

          <TextInput
            type="text"
            name="location"
            id="location"
            label="Location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="City, area"
            required
            icon={<MapPinIcon className="h-5 w-5 text-gray-400" />}
            error={errors.location}
            autoComplete="off"
          />

          <TextInput
            type="tel"
            name="phone"
            id="phone"
            label="Phone Number"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Phone number"
            required
            icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
            error={errors.phone}
            autoComplete="off"
          />

          <TextInput
            type="email"
            name="email"
            id="email"
            label="Email Address"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="branch@example.com"
            required
            icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
            error={errors.email}
            autoComplete="off"
          />
        </div>
      </section>

      {!editing && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Branch manager</h2>
          <p className="mb-4 text-sm text-gray-500">Optional — who runs this location day to day</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              type="text"
              name="managerName"
              id="managerName"
              label="Manager Name"
              value={formData.managerName}
              onChange={handleInputChange}
              placeholder="Manager name"
              icon={<UserIcon className="h-5 w-5 text-gray-400" />}
              error={errors.managerName}
              autoComplete="off"
            />

            <TextInput
              type="tel"
              name="managerPhone"
              id="managerPhone"
              label="Manager Phone"
              value={formData.managerPhone}
              onChange={handleInputChange}
              placeholder="Manager phone"
              icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
              error={errors.managerPhone}
              autoComplete="off"
            />
          </div>
        </section>
      )}

      {!editing && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Account setup</h2>
          <p className="mb-4 text-sm text-gray-500">
            Login password for the branch email above
          </p>

          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder="Enter password"
            icon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
            error={errors.password}
          />
        </section>
      )}

      {errors.submit && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-400" />
          <p>{errors.submit}</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel || (() => window.history.back())}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} aria-busy={loading}>
          {loading
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save Changes"
              : "Create Branch"}
        </Button>
      </div>
    </form>
  );
};
