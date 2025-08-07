# Branch Admin Access Control

## 🎯 **Goal**
Branch admin users should only access data from their specific branch, not all shop data.

## 🔧 **Current Implementation**

### **Access Control Rules**

1. **Branch Admin with branchId**:
   - ✅ Can access only their branch's services
   - ✅ Can access only their branch's invoices
   - ✅ Can access only their branch's technicians
   - ✅ Can access only their branch's data

2. **Branch Admin without branchId**:
   - ❌ Cannot access dashboard (shows error)
   - ❌ Must be assigned to a specific branch

3. **Shop Admin**:
   - ✅ Can access all shop data
   - ✅ Can see all branches, services, invoices

### **Data Filtering**

#### **Services Collection**
- **Branch Admin**: `shopId == user.shopId AND branchId == user.branchId`
- **Shop Admin**: `shopId == user.shopId`

#### **Invoices Collection**
- **Branch Admin**: `shopId == user.shopId AND branchId == user.branchId`
- **Shop Admin**: `shopId == user.shopId`

#### **Technicians Collection**
- **Branch Admin**: `shopId == user.shopId AND branchId == user.branchId`
- **Shop Admin**: `shopId == user.shopId`

## 🚨 **Required Setup**

### **Step 1: Update User Record**
The branch admin user must have a `branchId` field in their Firestore document:

```javascript
// In Firebase Console → Firestore → users collection
{
  id: "user-id",
  email: "branchadmin@example.com",
  name: "Branch Admin",
  role: "branch_admin",
  shopId: "shop-id",
  branchId: "branch-id", // ← This must be set
  onboardingCompleted: true,
  // ... other fields
}
```

### **Step 2: Verify Branch Exists**
Ensure the branch exists in the `branches` collection:

```javascript
// In Firebase Console → Firestore → branches collection
{
  id: "branch-id",
  name: "Branch Name",
  shopId: "shop-id",
  // ... other fields
}
```

## 🔍 **Troubleshooting**

### **Error: "Branch admin must be assigned to a specific branch"**
**Cause**: Branch admin user doesn't have a `branchId` field
**Solution**: 
1. Go to Firebase Console
2. Navigate to `users` collection
3. Find the branch admin user
4. Add `branchId` field with the correct branch ID

### **Error: "Branch not found"**
**Cause**: The `branchId` references a non-existent branch
**Solution**:
1. Verify the branch exists in `branches` collection
2. Ensure the branch belongs to the correct shop
3. Update the user's `branchId` to a valid branch ID

### **Debug Steps**
1. Visit `/api/debug/user` to check user data
2. Check browser console for logged user data
3. Verify branch exists in Firestore
4. Ensure user has correct `branchId`

## 📋 **Code Changes Made**

### **Dashboard Validation**
- ✅ Added validation for branch admin `branchId`
- ✅ Clear error message when `branchId` is missing
- ✅ Proper query filtering for branch-specific data

### **Query Logic**
- ✅ Branch admin queries include `branchId` filter
- ✅ Shop admin queries only filter by `shopId`
- ✅ Fallback queries handle index building errors

### **Hooks Updated**
- ✅ `useServices` - Branch-specific filtering
- ✅ `useInvoices` - Branch-specific filtering
- ✅ `useTechnicians` - Branch-specific filtering

## 🎯 **Expected Behavior**

Once properly configured:
- **Branch Admin**: Sees only their branch's data
- **Shop Admin**: Sees all shop data
- **Proper error messages** when configuration is incorrect
- **Secure access control** preventing cross-branch data access
