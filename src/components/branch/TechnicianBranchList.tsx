import React, { useEffect, useState } from "react";
import { Branch } from "../../types";
import { db } from "../../lib/firebase";
import { collection, getDocs, where, query, getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useUser } from "../../hooks/useUser";
import { BuildingOfficeIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, UserGroupIcon, EyeIcon } from "@heroicons/react/24/outline";

interface TechnicianBranchListProps {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  shopId?: string;
  onAddBranch?: () => void;
  onEditBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branch: Branch) => void;
}

export const TechnicianBranchList: React.FC<TechnicianBranchListProps> = ({ 
  branches, 
  loading, 
  error, 
  shopId, 
  onAddBranch, 
  onDeleteBranch 
}) => {
  const [techniciansByBranch, setTechniciansByBranch] = useState<Record<string, string[]>>({});
  const router = useRouter();
  const { user } = useUser();

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
                    } catch (directError) {
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
                  } catch (userError) {
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
          } catch (error) {
            byBranch[branch.id] = [];
          }
        }
        
        setTechniciansByBranch(byBranch);
      } catch (error) {
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
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 font-medium">Loading branch...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Branch</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No branch assigned</h3>
        <p className="text-gray-600 mb-6 max-w-md">You haven&apos;t been assigned to any branch yet. Contact your branch admin for assistance.</p>
      </div>
    );
  }

  return (
    <>
      {/* Table for md+ screens */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Team</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id || `branch-${Math.random()}`} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{branch.name}</div>
                        <div className="text-xs text-gray-500">Your Work Location</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getBranchField(branch, 'location')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getBranchField(branch, 'phone')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getBranchField(branch, 'email')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {techniciansByBranch[branch.id]?.length ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              {techniciansByBranch[branch.id]?.length} {techniciansByBranch[branch.id]?.length === 1 ? 'technician' : 'technicians'}
                            </span>
                          </div>
                          <div className="text-gray-600 text-xs">
                            {techniciansByBranch[branch.id]?.slice(0, 3).map((name, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                <span>{name}</span>
                              </div>
                            ))}
                            {techniciansByBranch[branch.id]?.length > 3 && (
                              <div className="text-gray-400 italic">
                                +{techniciansByBranch[branch.id]?.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span>No technicians assigned</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors"
                        onClick={() => branch.id && router.push(`/branch/edit?id=${branch.id}`)}
                        title="View branch details"
                      >
                        View
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
          <h3 className="text-lg font-semibold text-gray-900">Your Work Location</h3>
          <p className="text-sm text-gray-600">Branch information and team details</p>
        </div>
        <div className="p-4 space-y-4">
          {branches.map((branch) => (
            <div key={branch.id || `branch-${Math.random()}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{branch.name}</h4>
                    <p className="text-sm text-gray-500">Your Work Location</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPinIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{getBranchField(branch, 'location')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{getBranchField(branch, 'phone')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{getBranchField(branch, 'email')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <UserGroupIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">
                    {techniciansByBranch[branch.id]?.length || 0} {techniciansByBranch[branch.id]?.length === 1 ? 'technician' : 'technicians'}
                  </span>
                </div>
                {techniciansByBranch[branch.id]?.length > 0 ? (
                  <div className="text-xs text-gray-500 ml-6 space-y-1">
                    {techniciansByBranch[branch.id]?.slice(0, 3).map((name, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{name}</span>
                      </div>
                    ))}
                    {techniciansByBranch[branch.id]?.length > 3 && (
                      <div className="text-gray-400 italic">
                        +{techniciansByBranch[branch.id]?.length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 ml-6">
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>No technicians assigned</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  className="flex-1 px-4 py-2 text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                  onClick={() => branch.id && router.push(`/branch/edit?id=${branch.id}`)}
                  title="View branch details"
                >
                  <EyeIcon className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default TechnicianBranchList;
