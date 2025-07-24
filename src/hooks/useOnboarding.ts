import { useState, useEffect } from "react";
import { useUser } from "./useUser";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface OnboardingState {
  isCompleted: boolean;
  currentStep: number;
  totalSteps: number;
  hasSeenWelcome: boolean;
  lastCompletedAt?: Date;
}

export function useOnboarding() {
  const { user } = useUser();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    isCompleted: false,
    currentStep: 0,
    totalSteps: 5,
    hasSeenWelcome: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed onboarding
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isCompleted = userData.shopId && userData.role === "shop_admin";
          
          setOnboardingState({
            isCompleted,
            currentStep: isCompleted ? 5 : 0,
            totalSteps: 5,
            hasSeenWelcome,
            lastCompletedAt: userData.updatedAt?.toDate()
          });
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const markWelcomeAsSeen = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setOnboardingState(prev => ({
      ...prev,
      hasSeenWelcome: true
    }));
  };

  const updateCurrentStep = (step: number) => {
    setOnboardingState(prev => ({
      ...prev,
      currentStep: step
    }));
  };

  return {
    onboardingState,
    loading,
    markWelcomeAsSeen,
    updateCurrentStep
  };
} 