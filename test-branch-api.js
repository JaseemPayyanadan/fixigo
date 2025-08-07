// Simple test script for branch creation API
// Run with: node test-branch-api.js

const testBranchCreation = async () => {
  const testData = {
    name: "Test Branch",
    location: "Test City, Test Area",
    phone: "1234567890",
    email: "test.branch@example.com",
    password: "testpassword123",
    shopId: "test-shop-id",
    managerName: "Test Branch Manager",
    managerEmail: "manager@testbranch.com",
    managerPhone: "9876543210"
  };

  try {
    console.log("Testing branch creation API...");
    console.log("Test data:", JSON.stringify(testData, null, 2));

    const response = await fetch("http://localhost:3000/api/branches/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    
    console.log("Response status:", response.status);
    console.log("Response:", JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log("✅ Branch creation test PASSED");
      console.log("Created user ID:", result.data.user.id);
      console.log("Created branch ID:", result.data.branch.id);
    } else {
      console.log("❌ Branch creation test FAILED");
      console.log("Error:", result.error);
    }
  } catch (error) {
    console.log("❌ Test failed with error:", error.message);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  testBranchCreation();
}

module.exports = { testBranchCreation }; 