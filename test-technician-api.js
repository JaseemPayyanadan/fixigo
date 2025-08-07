// Simple test script for technician creation API
// Run with: node test-technician-api.js

const testTechnicianCreation = async () => {
  const testData = {
    name: "Test Technician",
    email: "test.technician@example.com",
    phone: "1234567890",
    password: "testpassword123",
    role: "technician", // Default role
    shopId: "test-shop-id",
    branchId: "test-branch-id",
    skills: ["repair", "maintenance"],
    bio: "Test technician bio",
    specializations: ["electronics", "computers"]
  };

  try {
    console.log("Testing technician creation API...");
    console.log("Test data:", JSON.stringify(testData, null, 2));

    const response = await fetch("http://localhost:3000/api/technicians/create", {
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
      console.log("✅ Technician creation test PASSED");
      console.log("Created user ID:", result.data.user.id);
      console.log("Created technician ID:", result.data.technician.id);
    } else {
      console.log("❌ Technician creation test FAILED");
      console.log("Error:", result.error);
    }
  } catch (error) {
    console.log("❌ Test failed with error:", error.message);
  }
};

// Only run if this script is executed directly
if (require.main === module) {
  testTechnicianCreation();
}

module.exports = { testTechnicianCreation }; 