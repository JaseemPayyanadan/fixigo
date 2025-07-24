import React from "react";
import { useRouter } from "next/navigation";
import { Technician, Branch } from "@/types";

interface TechnicianListProps {
  technicians: Technician[];
  onDelete: (id: string) => void;
  branches: Branch[];
}

export default function TechnicianList({ technicians, onDelete, branches }: TechnicianListProps) {
  const router = useRouter();

  // Helper function to get branch name by ID
  const getBranchName = (branchId: string) => {
    if (!branchId || branchId.trim() === '') return 'No Branch Assigned';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : `Branch ${branchId.slice(0, 8)}...`;
  };

  if (technicians.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No technicians yet</h3>
        <p className="text-gray-600 mb-6 max-w-md">Technicians help you manage service requests efficiently. Add your first technician to get started.</p>
      </div>
    );
  }

  return (
    <>
      {/* Table for md+ screens */}
      <div className="hidden md:block">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Technician Team</h3>
          <p className="text-sm text-gray-600">Manage your technical staff and their assignments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {technicians.map((tech: Technician) => (
                <tr key={tech.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{tech.name}</div>
                        <div className="text-xs text-gray-500">ID: {tech.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900">{tech.email}</div>
                      <div className="text-sm text-gray-600">{tech.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getBranchName(tech.branchId)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-green-400"></span>
                      Available
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors"
                        onClick={() => router.push(`/technicians/edit?id=${tech.id}`)}
                        title="Edit technician"
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900 font-medium text-sm transition-colors"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete technician '${tech.name}'?`)) {
                            onDelete(tech.id);
                          }
                        }}
                        title="Delete technician"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards for mobile screens */}
      <div className="md:hidden">
        <div className="px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Technician Team</h3>
          <p className="text-sm text-gray-600">Manage your technical staff</p>
        </div>
        <div className="p-4 space-y-4">
          {technicians.map((tech: Technician) => (
            <div key={tech.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{tech.name}</h4>
                    <p className="text-sm text-gray-500">ID: {tech.id}</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-green-400"></span>
                  Available
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{tech.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-medium">{tech.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                                          <span className="font-medium">Branch: {getBranchName(tech.branchId)}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  className="flex-1 px-4 py-2 text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors border border-blue-200 rounded-lg hover:bg-blue-50"
                  onClick={() => router.push(`/technicians/edit?id=${tech.id}`)}
                  title="Edit technician"
                >
                  Edit
                </button>
                <button
                  className="flex-1 px-4 py-2 text-red-600 hover:text-red-900 font-medium text-sm transition-colors border border-red-200 rounded-lg hover:bg-red-50"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete technician '${tech.name}'?`)) {
                      onDelete(tech.id);
                    }
                  }}
                  title="Delete technician"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
} 