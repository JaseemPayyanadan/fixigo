import React, { useEffect, useState } from "react";
import { Branch } from "../../types";
import { db } from "../../lib/firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface BranchListProps {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  onAddBranch?: () => void;
  onEditBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branch: Branch) => void;
}

export const BranchList: React.FC<BranchListProps> = ({ branches, loading, error, onAddBranch, onDeleteBranch }) => {
  const [techniciansByBranch, setTechniciansByBranch] = useState<Record<string, string[]>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!branches.length) return;
      // Get all branch IDs
      const branchIds = branches.map(b => b.id);
      // Fetch all technicians whose branch_id is in branchIds
      const q = query(collection(db, "technicians"), where("branch_id", "in", branchIds));
      const snap = await getDocs(q);
      const byBranch: Record<string, string[]> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (!byBranch[data.branch_id]) byBranch[data.branch_id] = [];
        byBranch[data.branch_id].push(data.name);
      });
      setTechniciansByBranch(byBranch);
    };
    fetchTechnicians();
  }, [branches]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 font-medium">Loading branches...</span>
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
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Branches</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  if (branches.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No branches yet</h3>
        <p className="text-gray-600 mb-6 max-w-md">Branches help you organize your business locations. Get started by adding your first branch to manage multiple locations.</p>
        {onAddBranch && (
          <button
            onClick={onAddBranch}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Your First Branch
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      {/* Table for md+ screens */}
      <div className="hidden md:block">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Branch Locations</h3>
          <p className="text-sm text-gray-600">Manage your business locations and their details</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Technicians</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{branch.name}</div>
                        <div className="text-xs text-gray-500">Branch ID: {branch.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{branch.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{branch.contactNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{branch.branchEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {techniciansByBranch[branch.id]?.length ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {techniciansByBranch[branch.id].length} tech
                          </span>
                          <span className="text-gray-500 text-xs">
                            {techniciansByBranch[branch.id].slice(0, 2).join(", ")}
                            {techniciansByBranch[branch.id].length > 2 && "..."}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No technicians</span>
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
                        onClick={() => router.push(`/branch/edit?id=${branch.id}`)}
                        title="Edit branch"
                      >
                        Edit
                      </button>
                      {onDeleteBranch && (
                        <button
                          className="text-red-600 hover:text-red-900 font-medium text-sm transition-colors"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete branch '${branch.name}'?`)) {
                              onDeleteBranch(branch);
                            }
                          }}
                          title="Delete branch"
                        >
                          Delete
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

      {/* Cards for mobile screens */}
      <div className="md:hidden">
        <div className="px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Branch Locations</h3>
          <p className="text-sm text-gray-600">Manage your business locations</p>
        </div>
        <div className="p-4 space-y-4">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{branch.name}</h4>
                    <p className="text-sm text-gray-500">{branch.location}</p>
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
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-medium">{branch.contactNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{branch.branchEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-medium">
                    {techniciansByBranch[branch.id]?.length || 0} technicians
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  className="flex-1 px-4 py-2 text-blue-600 hover:text-blue-900 font-medium text-sm transition-colors border border-blue-200 rounded-lg hover:bg-blue-50"
                  onClick={() => router.push(`/branch/edit?id=${branch.id}`)}
                  title="Edit branch"
                >
                  Edit
                </button>
                {onDeleteBranch && (
                  <button
                    className="flex-1 px-4 py-2 text-red-600 hover:text-red-900 font-medium text-sm transition-colors border border-red-200 rounded-lg hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete branch '${branch.name}'?`)) {
                        onDeleteBranch(branch);
                      }
                    }}
                    title="Delete branch"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}; 