import React, { useEffect, useState } from "react";
import { Branch } from "../../types";
import { db } from "../../lib/firebase";
import { collection, getDocs, where, query, getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, UserGroupIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface ShopAdminBranchListProps {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  shopId?: string;
  onAddBranch?: () => void;
  onEditBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branch: Branch) => void;
}

export const ShopAdminBranchList: React.FC<ShopAdminBranchListProps> = ({ 
  branches, 
  loading, 
  error, 
  shopId, 
  onAddBranch, 
  onDeleteBranch 
}) => {
  const [techniciansByBranch, setTechniciansByBranch] = useState<Record<string, string[]>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!branches.length || !shopId) {
        return;
      }
      
      try {
        const byBranch: Record<string, string[]> = {};
        
        // Fetch technicians from branch members array for each branch
        for (const branch of branches) {
          try {
            const branchDoc = await getDoc(doc(db, "shops", shopId, "branches", branch.id));
            if (branchDoc.exists()) {
              const branchData = branchDoc.data();
              const members = branchData.members || [];
              
              const technicianNames: string[] = [];
              
              // Fetch user names for each technician
              for (const member of members) {
                if (member.role === "technician" && member.userId) {
                  try {
                    // Try to get user document directly by ID first
                    try {
                      const userDoc = await getDoc(doc(db, "users", member.userId));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userName = userData.name || "Unknown User";
                        technicianNames.push(userName);
                        continue; // Skip the query method if direct access worked
                      }
                    } catch {
                      // Direct access failed, try query method
                    }
                    
                    // Method 2: Try query method
                    const userQuery = query(
                      collection(db, "users"),
                      where("uid", "==", member.userId)
                    );
                    const userSnapshot = await getDocs(userQuery);
                    
                    if (!userSnapshot.empty) {
                      const userData = userSnapshot.docs[0].data();
                      const userName = userData.name || "Unknown User";
                      technicianNames.push(userName);
                    } else {
                      // Fallback: Use name from member data if available
                      if (member.name) {
                        technicianNames.push(member.name);
                      }
                    }
                  } catch {
                    // Fallback: Use name from member data if available
                    if (member.name) {
                      technicianNames.push(member.name);
                    }
                  }
                }
              }
              
              byBranch[branch.id] = technicianNames;
            } else {
              byBranch[branch.id] = [];
            }
          } catch {
            byBranch[branch.id] = [];
          }
        }
        
        setTechniciansByBranch(byBranch);
      } catch {
        setTechniciansByBranch({});
      }
    };
    fetchTechnicians();
  }, [branches, shopId]);

  // Helper function to get the correct field values
  const getBranchField = (branch: Branch, field: 'location' | 'phone' | 'email') => {
    switch (field) {
      case 'location':
        return branch.location || 'No location';
      case 'phone':
        return branch.phone || 'No phone';
      case 'email':
        return branch.email || 'No email';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading branches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Branches</h3>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches yet</h3>
          <p className="text-sm text-gray-600 mb-6">Get started by adding your first branch to manage multiple locations.</p>
          {onAddBranch && (
            <button
              onClick={onAddBranch}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Branch
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technicians</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id || `branch-${Math.random()}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                        <div className="text-xs text-gray-500">{getBranchField(branch, 'location')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="w-4 h-4 text-gray-400 mr-2" />
                        {getBranchField(branch, 'phone')}
                      </div>
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400 mr-2" />
                        {getBranchField(branch, 'email')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <UserGroupIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {techniciansByBranch[branch.id]?.length || 0} {techniciansByBranch[branch.id]?.length === 1 ? 'technician' : 'technicians'}
                      </span>
                    </div>
                    {techniciansByBranch[branch.id]?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {techniciansByBranch[branch.id]?.slice(0, 2).join(', ')}
                        {techniciansByBranch[branch.id]?.length > 2 && ` +${techniciansByBranch[branch.id]?.length - 2} more`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      branch.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        branch.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                      }`}></span>
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        onClick={() => branch.id && router.push(`/branch/edit?id=${branch.id}`)}
                        title="Edit branch"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {onDeleteBranch && (
                        <button
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete branch '${branch.name}'?`)) {
                              onDeleteBranch(branch);
                            }
                          }}
                          title="Delete branch"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden">
        <div className="space-y-4">
          {branches.map((branch) => (
            <div key={branch.id || `branch-${Math.random()}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{branch.name}</h4>
                    <p className="text-xs text-gray-500">{getBranchField(branch, 'location')}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  branch.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    branch.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                  }`}></span>
                  {branch.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center text-xs text-gray-600">
                  <PhoneIcon className="w-3 h-3 text-gray-400 mr-2" />
                  <span>{getBranchField(branch, 'phone')}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <EnvelopeIcon className="w-3 h-3 text-gray-400 mr-2" />
                  <span>{getBranchField(branch, 'email')}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <UserGroupIcon className="w-3 h-3 text-gray-400 mr-2" />
                  <span>
                    {techniciansByBranch[branch.id]?.length || 0} {techniciansByBranch[branch.id]?.length === 1 ? 'technician' : 'technicians'}
                  </span>
                </div>
                {techniciansByBranch[branch.id]?.length > 0 && (
                  <div className="text-xs text-gray-500 ml-5">
                    {techniciansByBranch[branch.id]?.slice(0, 2).join(', ')}
                    {techniciansByBranch[branch.id]?.length > 2 && ` +${techniciansByBranch[branch.id]?.length - 2} more`}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors border border-blue-200 rounded-md hover:bg-blue-50"
                  onClick={() => branch.id && router.push(`/branch/edit?id=${branch.id}`)}
                >
                  <PencilIcon className="w-3 h-3" />
                  Edit
                </button>
                {onDeleteBranch && (
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 text-xs font-medium transition-colors border border-red-200 rounded-md hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete branch '${branch.name}'?`)) {
                        onDeleteBranch(branch);
                      }
                    }}
                  >
                    <TrashIcon className="w-3 h-3" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopAdminBranchList;

