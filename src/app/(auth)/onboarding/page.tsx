"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/ui/TextInput";
import { 
  MdStore, 
  MdPhone, 
  MdLocationOn, 
  MdBusiness, 
  MdEmail,
  MdPerson,
  MdArrowForward,
  MdCheckCircle
} from "react-icons/md";

export default function OnboardingPage() {
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
    gstNumber: ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const steps = [
    { id: 1, title: "Business Info", description: "Basic details about your business" },
    { id: 2, title: "Contact Details", description: "How customers can reach you" },
    { id: 3, title: "Location", description: "Where your business is located" }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.shopName.trim() !== "" && formData.ownerName.trim() !== "";
      case 2:
        return formData.email.trim() !== "" && formData.phone.trim() !== "";
      case 3:
        return formData.address.trim() !== "" && formData.city.trim() !== "" && formData.pinCode.trim() !== "";
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setError("");
    } else {
      setError("Please fill in all required fields");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");
    
    try {
      // Send shop data to API
      const response = await fetch("/api/shop/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save shop information");
      }

      const result = await response.json();
      console.log("Shop saved successfully:", result);
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save information");
    } finally {
      setSubmitting(false);
    }
  };
    
    return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">F</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to Fixigo!</h1>
          <p className="text-lg text-gray-600">Let&apos;s set up your business in just a few steps</p>
        </div>
  
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <MdCheckCircle className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">{steps[currentStep - 1].title}</h3>
            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MdStore className="w-5 h-5 mr-2 text-blue-600" />
                    Business Information
                  </h3>
                  <div className="space-y-4">
                  <TextInput
                      label="Shop Name"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleInputChange}
                      required
                    icon={<MdStore className="h-5 w-5 text-gray-400" />}
                      placeholder="Enter your shop name"
                    />
                    
                    <TextInput
                      label="Owner Name"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      required
                      icon={<MdPerson className="h-5 w-5 text-gray-400" />}
                      placeholder="Enter owner name"
                    />
                  </div>
                </div>
              </div>
            )}
                
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MdEmail className="w-5 h-5 mr-2 text-blue-600" />
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                  <TextInput
                      label="Email Address"
                      name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                      required
                  icon={<MdEmail className="h-5 w-5 text-gray-400" />}
                      placeholder="Enter business email"
                />
                    
                <TextInput
                      label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                      required
                  icon={<MdPhone className="h-5 w-5 text-gray-400" />}
                      placeholder="Enter phone number"
                />
              </div>
                </div>
            </div>
          )}

            {currentStep === 3 && (
            <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MdLocationOn className="w-5 h-5 mr-2 text-blue-600" />
                    Business Location
                  </h3>
                  <div className="space-y-4">
                    <TextInput
                      label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                      icon={<MdLocationOn className="h-5 w-5 text-gray-400" />}
                      placeholder="Enter business address"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                <TextInput
                        label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                        required
                  icon={<MdLocationOn className="h-5 w-5 text-gray-400" />}
                        placeholder="Enter city"
                />
                      
                <TextInput
                        label="PIN Code"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleInputChange}
                        required
                  icon={<MdLocationOn className="h-5 w-5 text-gray-400" />}
                        placeholder="Enter PIN code"
                />
              </div>
                    
              <TextInput
                      label="GST Number (Optional)"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                icon={<MdBusiness className="h-5 w-5 text-gray-400" />}
                      placeholder="Enter GST number"
                    />
                  </div>
                  </div>

                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                    <p><span className="font-medium">Shop:</span> {formData.shopName || "—"}</p>
                    <p><span className="font-medium">Owner:</span> {formData.ownerName || "—"}</p>
                    <p><span className="font-medium">Email:</span> {formData.email || "—"}</p>
                    <p><span className="font-medium">Phone:</span> {formData.phone || "—"}</p>
                    <p><span className="font-medium">Address:</span> {formData.address || "—"}</p>
                    <p><span className="font-medium">City:</span> {formData.city || "—"}</p>
                    {formData.gstNumber && <p><span className="font-medium">GST:</span> {formData.gstNumber}</p>}
                  </div>
              </div>
            </div>
          )}

          {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <MdArrowForward className="w-4 h-4 mr-2 rotate-180" />
                Back
              </button>

              {currentStep < 3 ? (
              <button
                  type="button"
                onClick={nextStep}
                  className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Continue
                  <MdArrowForward className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <MdCheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
              </button>
              )}
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            You can update this information later in your dashboard
          </p>
        </div>
      </div>
    </div>
  );
} 