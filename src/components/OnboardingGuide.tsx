"use client"
import React, { useState } from "react";
import { SparklesIcon, UsersIcon, ChartBarIcon, CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface OnboardingGuideProps {
  user: { name?: string; email?: string; role?: string };
  onDismiss: () => void;
}

export default function OnboardingGuide({ onDismiss }: OnboardingGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    {
      icon: <BuildingStorefrontIcon className="w-5 h-5" />,
      title: "Add Branch",
      description: "Create your first branch",
      link: "/branch",
      color: "bg-blue-500"
    },
    {
      icon: <UsersIcon className="w-5 h-5" />,
      title: "Add Technicians",
      description: "Invite your team",
      link: "/technicians",
      color: "bg-green-500"
    },
    {
      icon: <ChartBarIcon className="w-5 h-5" />,
      title: "Create Service",
      description: "Start managing requests",
      link: "/services/new",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <HiSparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Welcome to Fixigo!</h3>
            <p className="text-sm text-gray-600">Let&apos;s get your business up and running</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center text-sm text-gray-600">
          <HiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
          <span>Your business profile is set up</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.link}
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center mb-2">
                <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{action.title}</h4>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Show more tips →
          </button>
        )}

        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900">Pro Tips:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Set up multiple branches</p>
                  <p className="text-gray-600">Organize your business by location</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Invite your team</p>
                  <p className="text-gray-600">Add technicians and branch managers</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Track performance</p>
                  <p className="text-gray-600">Monitor services and revenue</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-yellow-600 text-xs font-bold">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Generate invoices</p>
                  <p className="text-gray-600">Create professional invoices</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 