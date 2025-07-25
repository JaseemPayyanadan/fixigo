"use client"
import React, { useState, useEffect } from "react";

import { useUser } from "@/hooks";
import { useRouter } from "next/navigation";
import TextInput from "@/components/ui/TextInput";
import { 
  MdStore, 
  MdPhone, 
  MdLocationOn, 
  MdMyLocation, 
  MdBusiness, 
  MdEmail,
  MdPerson,
  MdArrowForward,
  MdArrowBack
} from "react-icons/md";
import { HiCheckCircle } from "react-icons/hi";



interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function ShopOnboardingPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pinCode: "",
    gstNumber: "",
    description: ""
    });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "Business Information",
      subtitle: "Tell us about your shop",
      icon: <MdStore className="w-6 h-6" />,
      completed: false
    },
    {
      id: 2,
      title: "Owner Details",
      subtitle: "Tell us about the business owner",
      icon: <MdPerson className="w-6 h-6" />,
      completed: false
    },
    {
      id: 3,
      title: "Location Details",
      subtitle: "Where is your business located?",
      icon: <MdLocationOn className="w-6 h-6" />,
      completed: false
    },
    {
      id: 4,
      title: "Complete Setup",
      subtitle: "You're almost ready to go!",
      icon: <HiCheckCircle className="w-6 h-6" />,
      completed: false
    }
  ];

  // Check if user already has shop information
  useEffect(() => {
    const checkExistingShop = async () => {
      if (!user?.uid) {
        console.log("No user UID available");
        return;
      }
      
      console.log("Checking existing shop for user:", user.uid);
      
      try {
        // Dynamically import Firebase modules
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        // Check if shop document exists
        const shopDoc = await getDoc(doc(db, "shops", user.uid));
        if (shopDoc.exists()) {
          console.log("Shop document exists, redirecting to dashboard");
          // User already has shop information, redirect to dashboard
          router.push("/dashboard");
          return;
        }
        
        // Check if user has shopId and has completed onboarding
        if (user.shopId && user.onboardingCompleted) {
          console.log("User has completed onboarding, redirecting to dashboard");
          router.push("/dashboard");
          return;
        }
        
        console.log("No existing shop found, showing onboarding form");
        setCheckingExisting(false);
      } catch (err) {
        console.error("Error checking existing shop:", err);
        setCheckingExisting(false);
      }
    };

    if (user) {
      checkExistingShop();
    } else {
      console.log("User not available yet");
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLocationDetect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          alert(`Location detected: ${latitude}, ${longitude}. Please enter your address manually.`);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to detect your location. Please enter your address manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.shopName.trim().length > 0;
      case 2:
        return formData.ownerName.trim().length > 0 && formData.email.trim().length > 0;
      case 3:
        return formData.address.trim().length > 0 && formData.city.trim().length > 0 && formData.pinCode.trim().length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      setError("");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError("");
  };

  const saveShopInfo = async (uid: string, shopData: { shopName: string; ownerName: string; email: string; phone: string; address: string; city: string; pinCode: string; gstNumber: string; description: string }) => {
    // Dynamically import Firebase modules
    const { doc, setDoc, updateDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    
    // Create shop document
    await setDoc(doc(db, "shops", uid), {
      ...shopData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update user document with shopId and onboardingCompleted
    await updateDoc(doc(db, "users", uid), {
      shopId: uid,
      onboardingCompleted: true,
      updatedAt: new Date()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    
    try {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      // Save shop information to Firestore and update user document
      await saveShopInfo(user.uid, formData);
      
      // Show success state
      setShowSuccess(true);
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while user is loading or checking existing shop
  if (loading || checkingExisting) {
    console.log("Showing loading state - user loading or checking existing shop");
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show login prompt instead of redirecting
  if (!user) {
    console.log("No user available, showing login prompt");
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to complete your shop setup.</p>
          <button 
            onClick={() => router.push("/login")} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If user is not a shop_admin, show unauthorized message
  if (user.role !== "shop_admin") {
    console.log("User is not shop_admin, showing unauthorized message");
    return (
      <div className="min-h-screen w-full  bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access this page.</p>
          <button 
            onClick={() => router.push("/unauthorized")} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
            <HiCheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Fixigo!</h1>
          <p className="text-gray-600 mb-6">Your business profile has been set up successfully. You&apos;re now ready to start managing your services!</p>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-3">What&apos;s Next?</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <span className="text-sm text-gray-600">Add your first branch</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm font-semibold">2</span>
                </div>
                <span className="text-sm text-gray-600">Invite technicians to your team</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm font-semibold">3</span>
                </div>
                <span className="text-sm text-gray-600">Create your first service request</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  console.log("Rendering onboarding form for user:", user.uid);
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.id <= currentStep 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step.id < currentStep ? (
                    <HiCheckCircle className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep - 1].subtitle}</p>
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {currentStep === 1 && (
            <div className="space-y-6">
              <TextInput
                type="text"
                id="shopName"
                name="shopName"
                label="Shop Name"
                required
                placeholder="Enter your shop name"
                value={formData.shopName}
                onChange={handleInputChange}
                icon={<MdStore className="h-5 w-5 text-gray-400" />}
              />
              <TextInput
                type="text"
                id="description"
                name="description"
                label="Business Description"
                placeholder="Brief description of your services"
                value={formData.description}
                onChange={handleInputChange}
                icon={<MdBusiness className="h-5 w-5 text-gray-400" />}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <TextInput
                type="text"
                id="ownerName"
                name="ownerName"
                label="Owner Name"
                required
                placeholder="Enter owner's full name"
                value={formData.ownerName}
                onChange={handleInputChange}
                icon={<MdPerson className="h-5 w-5 text-gray-400" />}
              />
              <TextInput
                type="email"
                id="email"
                name="email"
                label="Email Address"
                required
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
                icon={<MdEmail className="h-5 w-5 text-gray-400" />}
              />
              <TextInput
                type="tel"
                id="phone"
                name="phone"
                label="Phone Number"
                required
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleInputChange}
                icon={<MdPhone className="h-5 w-5 text-gray-400" />}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="address"
                    placeholder="Enter your business address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleLocationDetect}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Detect my location"
                  >
                    <MdMyLocation className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  type="text"
                  id="city"
                  name="city"
                  label="City"
                  required
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={handleInputChange}
                  icon={<MdLocationOn className="h-5 w-5 text-gray-400" />}
                />
                <TextInput
                  type="text"
                  id="pinCode"
                  name="pinCode"
                  label="PIN Code"
                  required
                  placeholder="Enter PIN code"
                  value={formData.pinCode}
                  onChange={handleInputChange}
                  icon={<MdLocationOn className="h-5 w-5 text-gray-400" />}
                />
              </div>
              <TextInput
                type="text"
                id="gstNumber"
                name="gstNumber"
                label="GST Number (Optional)"
                placeholder="Enter GST number if applicable"
                value={formData.gstNumber}
                onChange={handleInputChange}
                icon={<MdBusiness className="h-5 w-5 text-gray-400" />}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Shop Name:</span>
                    <span className="text-gray-900">{formData.shopName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Owner Name:</span>
                    <span className="text-gray-900">{formData.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="text-gray-900">{formData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Address:</span>
                    <span className="text-gray-900">{formData.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">City:</span>
                    <span className="text-gray-900">{formData.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">PIN Code:</span>
                    <span className="text-gray-900">{formData.pinCode}</span>
                  </div>
                  {formData.gstNumber && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">GST Number:</span>
                      <span className="text-gray-900">{formData.gstNumber}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting up your profile...
                      </div>
                    ) : (
                      "Complete Setup"
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
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

          {/* Navigation Buttons */}
          {currentStep > 1 && currentStep < 5 && (
            <div className="flex justify-between mt-8">
              <button
                onClick={prevStep}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <MdArrowBack className="w-5 h-5 mr-2" />
                Previous
              </button>
              <button
                onClick={nextStep}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <MdArrowForward className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}

          {currentStep === 1 && (
            <div className="text-center mt-8">
              <button
                onClick={nextStep}
                className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                Get Started
                <MdArrowForward className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Step {currentStep} of {steps.length} • You can update this information later in your dashboard
          </p>
        </div>
      </div>
    </div>
  );
} 