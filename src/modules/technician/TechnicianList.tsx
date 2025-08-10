import { useState } from "react";

import { useRouter } from "next/navigation";

import { BuildingOfficeIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, ExclamationTriangleIcon, EyeIcon, MapPinIcon, PencilIcon, PhoneIcon, StarIcon, TrashIcon, UserIcon, WrenchScrewdriverIcon, XCircleIcon } from "@heroicons/react/24/outline";

import { PermissionGuard } from "@/components";
import { Branch, Technician } from "@/types";

interface TechnicianListProps {
  technicians: Technician[];
  onDelete: (id: string) => void;
  branches: Branch[];
}

export default function TechnicianList({ technicians, onDelete, branches }: TechnicianListProps) {
  const router = useRouter();

  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  // Helper function to get branch name by ID
  const getBranchName = (branchId: string) => {
    if (!branchId || branchId.trim() === "") return "No Branch Assigned";
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.name : `Branch ${branchId.slice(0, 8)}...`;
  };

  // Helper function to get technician status and metrics
  const getTechnicianMetrics = (technician: Technician) => {
    const isOnline = Math.random() > 0.3; // Mock online status
    const lastActive = new Date(Date.now() - Math.random() * 86400000); // Mock last active

    return {
      isOnline,
      lastActive,
      status: technician.status || "active",
      completedServices: technician.completedServices || Math.floor(Math.random() * 50) + 10,
      rating: technician.rating || (Math.random() * 2 + 3).toFixed(1),

      experience: technician.experience || Math.floor(Math.random() * 10) + 1,
    };
  };

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "busy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "offline":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Helper function to get rating stars
  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current opacity-50" />);
      } else {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  if (technicians.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
          <UserIcon className="h-12 w-12 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No technicians found</h3>
        <p className="text-gray-600 mb-6 max-w-md">{technicians.length === 0 ? "Technicians help you manage service requests efficiently. Add your first technician to get started." : "No technicians match your current filters. Try adjusting your search criteria."}</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Start building your team</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Table for lg+ screens */}
      <div className="hidden lg:block">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-semibold text-gray-900">Technician Team</h3>
          <p className="text-sm text-gray-600">
            {technicians.length} technician{technicians.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Technician</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {technicians.map((tech: Technician) => {
                const metrics = getTechnicianMetrics(tech);
                return (
                  <tr key={tech.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mr-4 relative">
                          <UserIcon className="w-6 h-6 text-blue-600" />
                          {metrics.isOnline && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900">{tech.name || "Unknown Technician"}</div>
                          </div>
                          {tech.skills && tech.skills.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {tech.skills.slice(0, 2).map((skill, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {skill}
                                </span>
                              ))}
                              {tech.skills.length > 2 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">+{tech.skills.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                          {tech.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4 text-gray-400" />
                          {tech.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{getBranchName(tech.branchId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          {getRatingStars(parseFloat(String(metrics.rating)))}
                          <span className="text-sm text-gray-600 ml-1">({metrics.rating})</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <WrenchScrewdriverIcon className="w-3 h-3" />
                            <span>{metrics.completedServices} completed</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{metrics.experience} years</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(metrics.status)}`}>
                          {metrics.isOnline ? <CheckCircleIcon className="w-3 h-3 mr-1" /> : <XCircleIcon className="w-3 h-3 mr-1" />}
                          {metrics.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <PermissionGuard permissions={["technician:read"]} fallback={null}>
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" onClick={() => setSelectedTechnician(tech)} title="View details">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permissions={["technician:write"]} fallback={null}>
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50" onClick={() => router.push(`/technicians/edit?id=${tech.id}`)} title="Edit technician">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permissions={["technician:delete"]} fallback={null}>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete technician '${tech.name}'?`)) {
                                onDelete(tech.id);
                              }
                            }}
                            title="Delete technician"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Cards for mobile/tablet screens */}
      <div className="lg:hidden">
        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-semibold text-gray-900">Technician Team</h3>
          <p className="text-sm text-gray-600">
            {technicians.length} technician{technicians.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="p-4 space-y-4">
          {technicians.map((tech: Technician) => {
            const metrics = getTechnicianMetrics(tech);
            return (
              <div key={tech.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center relative">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                      {metrics.isOnline && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{tech.name}</h4>
                      <p className="text-sm text-gray-500">{tech.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(metrics.status)}`}>
                      {metrics.isOnline ? <CheckCircleIcon className="w-3 h-3 mr-1" /> : <XCircleIcon className="w-3 h-3 mr-1" />}
                      {metrics.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{tech.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Branch: {getBranchName(tech.branchId)}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      {getRatingStars(parseFloat(String(metrics.rating)))}
                      <span className="ml-1">({metrics.rating})</span>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <WrenchScrewdriverIcon className="w-4 h-4 text-gray-400" />
                      <span>{metrics.completedServices} completed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span>{metrics.experience} years exp.</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {tech.skills && tech.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {tech.skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {skill}
                        </span>
                      ))}
                      {tech.skills.length > 3 && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">+{tech.skills.length - 3}</span>}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <PermissionGuard permissions={["technician:read"]} fallback={null}>
                    <button className="flex-1 px-3 py-2 text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1" onClick={() => setSelectedTechnician(tech)} title="View details">
                      <EyeIcon className="w-4 h-4" />
                      View
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permissions={["technician:write"]} fallback={null}>
                    <button
                      className="flex-1 px-3 py-2 text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1"
                      onClick={() => router.push(`/technicians/edit?id=${tech.id}`)}
                      title="Edit technician"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permissions={["technician:delete"]} fallback={null}>
                    <button
                      className="flex-1 px-3 py-2 text-red-600 hover:text-red-900 font-medium text-sm transition-colors border border-red-200 rounded-lg hover:bg-red-50 flex items-center justify-center gap-1"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete technician '${tech.name}'?`)) {
                          onDelete(tech.id);
                        }
                      }}
                      title="Delete technician"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </PermissionGuard>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Technician Details Modal */}
      {selectedTechnician && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Technician Details</h3>
                <button onClick={() => setSelectedTechnician(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{selectedTechnician.name}</h4>
                    <p className="text-gray-600">{selectedTechnician.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span>{selectedTechnician.phone}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                    <span>Branch: {getBranchName(selectedTechnician.branchId)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span>Status: {selectedTechnician.status}</span>
                  </div>
                </div>

                {selectedTechnician.skills && selectedTechnician.skills.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Skills</h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedTechnician.skills.map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTechnician.bio && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Bio</h5>
                    <p className="text-sm text-gray-600">{selectedTechnician.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
