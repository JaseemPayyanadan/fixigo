"use client";
import { useState } from "react";
import { AuthGuard } from "@/components";
import { useUser } from "@/hooks/useUser";
import { useUsers } from "@/hooks/useUsers";
import { useBranches } from "@/hooks/useBranches";
import { UserList } from "@/modules/user/UserList";
import UserForm from "@/modules/user/UserForm";
import { User, Role } from "@/types";
import { UsersIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function UsersPage() {
  const { user: currentUser } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get shop ID from current user
  const shopId = currentUser?.shopId;

  // Fetch users and branches
  const { users, loading: usersLoading, error: usersError, createUser, updateUser, deleteUser } = useUsers(shopId);
  const { branches, loading: branchesLoading } = useBranches(shopId);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user &apos;${user.name}&apos;?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteUser(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    // For now, just show user details in an alert
    alert(`User Details:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}`);
  };

  const handleSubmitUser = async (userData: {
    name: string;
    email: string;
    phone: string;
    role: Role;
    branchId?: string;
    status: "active" | "inactive" | "suspended";
  }) => {
    try {
      setLoading(true);
      setError(null);

      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.id, {
          ...userData,
          shopId: shopId!,
        });
      } else {
        // Create new user
        await createUser({
          ...userData,
          shopId: shopId!,
          uid: "", // This will be set by the backend
          onboardingCompleted: false,
        });
      }

      setShowForm(false);
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setError(null);
  };

  if (!currentUser || currentUser.role !== "shop_admin") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have permission to access user management.
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
                  <p className="text-gray-600">Manage branch admins and technicians</p>
                </div>
              </div>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Team Member
              </button>
            </div>
          </div>

          {/* Content */}
          {showForm ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <UserForm
                onSubmit={handleSubmitUser}
                loading={loading}
                editing={!!editingUser}
                initialData={editingUser || undefined}
                onCancel={handleCancelForm}
                branches={branches}
                currentUserRole={currentUser.role}
              />
            </div>
          ) : (
            <UserList
              users={users}
              loading={usersLoading || branchesLoading}
              error={usersError}
              onAddUser={handleAddUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onViewUser={handleViewUser}
            />
          )}

          {/* Global Error */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
} 