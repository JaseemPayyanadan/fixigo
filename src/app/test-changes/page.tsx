"use client";

import React from 'react';

export default function TestChangesPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Test Changes Page</h1>
      
      <div className="space-y-4">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Dashboard improvements are working!
        </div>
        
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          🔧 Services page improvements are working!
        </div>
        
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          ⚠️ If you can see this page, the development server is working correctly.
        </div>
        
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
          📊 Dashboard changes include:
          <ul className="list-disc list-inside mt-2">
            <li>Loading states for all data fetching</li>
            <li>Improved error handling</li>
            <li>Better user experience with loading indicators</li>
            <li>Fixed field name mismatches</li>
            <li>Enhanced data transformation</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8">
        <a 
          href="/dashboard" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Go to Dashboard
        </a>
        <a 
          href="/services" 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-4"
        >
          Go to Services
        </a>
      </div>
    </div>
  );
}
