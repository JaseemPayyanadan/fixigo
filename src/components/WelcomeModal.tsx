"use client"
import React, { useState, useEffect } from "react";
import { HiSparkles, HiUsers, HiChartBar, HiCheckCircle, HiX } from "react-icons/hi";
import { MdStore, } from "react-icons/md";
import Link from "next/link";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name?: string; email?: string; role?: string };
}

export default function WelcomeModal({ isOpen, onClose, user }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [isOpen]);

  const steps = [
    {
      icon: <HiSparkles className="w-8 h-8 text-yellow-500" />,
      title: "Welcome to Fixigo!",
      description: "Your business profile has been set up successfully. Let's get you started with the basics.",
      action: "Get Started",
      link: "/branch"
    },
    {
      icon: <MdStore className="w-8 h-8 text-blue-500" />,
      title: "Add Your First Branch",
      description: "Create your first branch to start organizing your business operations.",
      action: "Add Branch",
      link: "/branch"
    },
    {
      icon: <HiUsers className="w-8 h-8 text-green-500" />,
      title: "Invite Your Team",
      description: "Add technicians and staff members to help manage your services.",
      action: "Add Technicians",
      link: "/technicians"
    },
    {
      icon: <HiChartBar className="w-8 h-8 text-purple-500" />,
      title: "Create Your First Service",
      description: "Start managing service requests and track your business performance.",
      action: "Create Service",
      link: "/services/new"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                ['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400'][Math.floor(Math.random() * 5)]
              }`} />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HiX className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiSparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Fixigo, {user?.name || 'Business Owner'}!
            </h2>
            <p className="text-gray-600">
              Your business profile is ready. Let&apos;s get you started with the essential setup.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep < steps.length ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {steps[currentStep].icon}
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {steps[currentStep].description}
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Previous
                  </button>
                )}
                
                <Link
                  href={steps[currentStep].link}
                  onClick={onClose}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  {steps[currentStep].action}
                </Link>
              </div>

              {/* Progress Dots */}
              <div className="flex justify-center space-x-2 mt-6">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiCheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  You&apos;re All Set!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your business is ready to go. You can now start managing services, tracking performance, and growing your business.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Tips:</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <HiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Add multiple branches to expand your business</span>
                  </div>
                  <div className="flex items-center">
                    <HiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Invite technicians to help manage services</span>
                  </div>
                  <div className="flex items-center">
                    <HiCheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span>Track your performance with detailed analytics</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Step {currentStep + 1} of {steps.length + 1}</span>
            <span>You can always access these features from your dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
} 