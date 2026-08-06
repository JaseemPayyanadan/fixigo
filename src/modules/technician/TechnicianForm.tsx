import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";

import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

import { Button } from "../../components/ui/Button";
import PasswordInput from "../../components/ui/PasswordInput";
import TextInput from "../../components/ui/TextInput";

interface Branch {
  id: string;
  name: string;
  location: string;
}

interface TechnicianFormProps {
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    branchId: string;
    role: "technician";
    experience: number;
  }) => void | Promise<void>;
  loading: boolean;
  editing: boolean;
  initialData?: {
    name: string;
    email: string;
    phone: string;
    branchId?: string;
    role?: "technician";
    experience?: number;
  };
  onCancel: () => void;
  branches: Branch[];
  userRole: "shop_admin" | "branch_admin";
  currentUserBranchId?: string;
  /** Lets a host footer submit via `form={formId}`. */
  formId?: string;
  /** Hide the inline Cancel/Submit row (use a slide-over footer instead). */
  hideSubmit?: boolean;
}

export default function TechnicianForm({
  onSubmit,
  loading,
  editing,
  initialData,
  onCancel,
  branches,
  userRole,
  currentUserBranchId,
  formId,
  hideSubmit = false,
}: TechnicianFormProps) {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    branchId: string;
    role: "technician";
    experience: string;
  }>({
    name: "",
    email: "",
    phone: "",
    password: "",
    branchId: "",
    role: "technician",
    experience: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        password: "",
        branchId: initialData.branchId || "",
        role: initialData.role || "technician",
        experience: initialData.experience === undefined ? "" : String(initialData.experience),
      });
    } else if (userRole === "branch_admin" && currentUserBranchId) {
      // For branch_admin, pre-select their branch
      setForm(prev => ({
        ...prev,
        branchId: currentUserBranchId,
        role: "technician", // Always set role as technician
      }));
    }
  }, [initialData, userRole, currentUserBranchId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required field validation
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Password validation (only for new technicians)
    if (!editing) {
      if (!form.password) {
        newErrors.password = "Password is required";
      } else if (form.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    // Branch validation (only for shop_admin)
    if (userRole === "shop_admin" && !form.branchId) {
      newErrors.branchId = "Branch selection is required";
    }

    if (form.experience.trim() !== "") {
      const experience = Number(form.experience);
      if (!Number.isFinite(experience) || experience < 0) {
        newErrors.experience = "Enter a valid number of years";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // The caller decides what "done" means — navigate away, close a
      // slide-over, refetch a list — so success here is silent, not a banner.
      await onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        branchId: form.branchId,
        role: form.role,
        experience: form.experience.trim() === "" ? 0 : Number(form.experience),
      });
    } catch (error: unknown) {
      setErrors({ submit: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Technician information</h2>
        <p className="mb-4 text-sm text-gray-500">
          {editing ? "Update the technician's details" : "Enter the technician's details"}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            id="name"
            name="name"
            type="text"
            label="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Full name"
            icon={<UserIcon className="h-5 w-5 text-gray-400" />}
            error={errors.name}
          />

          <TextInput
            id="email"
            name="email"
            type="email"
            label="Email Address"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="Email address"
            icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
            error={errors.email}
          />

          <TextInput
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="Phone number"
            icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
            error={errors.phone}
          />

          <TextInput
            id="experience"
            name="experience"
            type="number"
            min="0"
            step="1"
            label="Experience (years)"
            value={form.experience}
            onChange={handleChange}
            placeholder="e.g. 3"
            icon={<ClockIcon className="h-5 w-5 text-gray-400" />}
            error={errors.experience}
          />

          {userRole === "shop_admin" && (
            <div className="sm:col-span-2">
              <label htmlFor="branchId" className="mb-2 block text-xs md:text-sm font-normal text-gray-700">
                Branch *
              </label>
              <select
                id="branchId"
                name="branchId"
                value={form.branchId}
                onChange={handleChange}
                required
                className={`h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.branchId ? "border-red-400" : "border-gray-200"
                }`}
              >
                <option value="">Select a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.location}
                  </option>
                ))}
              </select>
              {errors.branchId && <p className="mt-1 text-xs text-red-600">{errors.branchId}</p>}
            </div>
          )}
        </div>
      </section>

      {/* Only for new technicians — an existing technician already has login credentials. */}
      {!editing && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Account setup</h2>
          <p className="mb-4 text-sm text-gray-500">Create login credentials for the technician</p>

          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={form.password}
            onChange={handleChange}
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

      {!hideSubmit && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? (editing ? "Saving…" : "Creating…") : editing ? "Save Changes" : "Create Technician"}
          </Button>
        </div>
      )}
    </form>
  );
}