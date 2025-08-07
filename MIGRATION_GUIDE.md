# Firestore Database Migration Guide

## Overview

This guide covers the migration from the current nested subcollection structure to a normalized flat structure for better scalability and performance.

## 🎯 Migration Goals

### Before (Nested Structure)
```
/shops/{shopId}/branches/{branchId}/services/{serviceId}
/shops/{shopId}/branches/{branchId}/invoices/{invoiceId}
/shops/{shopId}/branches/{branchId}/tasks/{taskId}
```

### After (Normalized Structure)
```
/services/{serviceId} (with shopId, branchId fields)
/invoices/{invoiceId} (with shopId, branchId fields)
/tasks/{taskId} (with shopId, branchId fields)
/technicians/{technicianId} (with shopId, branchId fields)
/customers/{customerId} (with shopId field)
```

## 🚀 Benefits of Migration

1. **Better Performance**: Direct queries without nested collection traversal
2. **Improved Scalability**: Easier to scale across multiple shops
3. **Simplified Queries**: Single collection queries instead of complex nested queries
4. **Better Indexing**: More efficient composite indexes
5. **Reduced Complexity**: Easier to maintain and debug

## 📋 Pre-Migration Checklist

- [ ] Backup your current Firestore data
- [ ] Ensure you have admin access to Firebase project
- [ ] Review current data structure
- [ ] Test migration on a development environment first
- [ ] Plan downtime window (if needed)

## 🔧 Migration Steps

### Step 1: Install Dependencies

```bash
npm install tsx --save-dev
```

### Step 2: Deploy Updated Security Rules

```bash
npm run firebase:deploy:rules
```

### Step 3: Deploy Updated Indexes

```bash
npm run firebase:deploy:indexes
```

### Step 4: Run Migration

```bash
npm run migrate
```

### Step 5: Validate Migration

```bash
npm run migrate:validate
```

### Step 6: Update Application Code

Update your application code to use the new flat structure:

#### Before (Old Structure)
```typescript
// Old nested query
const servicesQuery = query(
  collection(db, "shops", shopId, "branches", branchId, "services"),
  where("status", "==", "pending")
);
```

#### After (New Structure)
```typescript
// New flat query
const servicesQuery = query(
  collection(db, "services"),
  where("shopId", "==", shopId),
  where("branchId", "==", branchId),
  where("status", "==", "pending")
);
```

### Step 7: Cleanup (Optional)

After testing the new structure:

```bash
npm run migrate:cleanup
```

## 📊 New Collection Structure

### Users Collection
```typescript
/users/{userId}
{
  id: string;
  uid: string;
  email: string;
  name: string;
  role: "shop_admin" | "branch_admin" | "technician";
  shopId: string;
  branchId?: string;
  status: "active" | "inactive" | "suspended";
  onboardingCompleted: boolean;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Shops Collection
```typescript
/shops/{shopId}
{
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  ownerId: string;
  gstNumber?: string;
  businessType?: string;
  description?: string;
  status: "active" | "inactive";
  settings?: object;
  businessHours?: object;
  createdAt: Date;
  updatedAt: Date;
}
```

### Branches Collection
```typescript
/branches/{branchId}
{
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "maintenance";
  shopId: string;
  managerId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Technicians Collection
```typescript
/technicians/{technicianId}
{
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: "technician";
  shopId: string;
  branchId: string;
  skills: string[];
  status: "active" | "inactive";
  bio?: string;
  specializations?: string[];
  experience?: number;
  rating?: number;
  totalServices?: number;
  completedServices?: number;
  availability?: object;
  createdAt: Date;
  updatedAt: Date;
}
```

### Services Collection
```typescript
/services/{serviceId}
{
  id: string;
  name: string;
  description: string;
  customer: object;
  device: object;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | "awaiting_parts" | "ready_for_pickup" | "quality_check";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTechnicianId?: string;
  shopId: string;
  branchId: string;
  estimatedDuration: number;
  actualDuration?: number;
  scheduledDate?: Date;
  completedDate?: Date;
  price: number;
  notes?: string;
  workNotes?: string[];
  partsUsed?: object[];
  customerFeedback?: object;
  qualityScore?: number;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Invoices Collection
```typescript
/invoices/{invoiceId}
{
  id: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  tax: number;
  total: number;
  discount?: number;
  advance?: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "partial" | "refunded";
  paymentMethod?: string;
  paymentDate?: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  shopId: string;
  branchId: string;
  items: object[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Tasks Collection
```typescript
/tasks/{taskId}
{
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTechnicianId: string;
  serviceId?: string;
  dueDate: Date;
  completedDate?: Date;
  notes?: string;
  shopId: string;
  branchId: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Customers Collection
```typescript
/customers/{customerId}
{
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  shopId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔐 Updated Security Rules

The new security rules provide:

- **Role-based access control**: Different permissions for shop_admin, branch_admin, technician
- **Resource-level permissions**: Users can only access resources in their shop/branch
- **Permission-based access**: Fine-grained control over read/write operations
- **Backward compatibility**: Legacy subcollections still work during migration

## 📈 Performance Improvements

### Query Performance
- **Before**: Multiple nested queries required
- **After**: Single collection queries with composite indexes

### Index Efficiency
- **Before**: Limited indexing on nested collections
- **After**: Comprehensive composite indexes for all common queries

### Scalability
- **Before**: Performance degrades with nested depth
- **After**: Consistent performance regardless of data depth

## 🛠️ Updated Hooks

### useTechnicians Hook
```typescript
const { technicians, loading, error, createTechnician, updateTechnician, deleteTechnician, getTechnicianStats } = useTechnicians(shopId, branchId);
```

### useServices Hook
```typescript
const { services, loading, error, createService, updateService, deleteService } = useServices(shopId, branchId);
```

### useInvoices Hook
```typescript
const { invoices, loading, error, createInvoice, updateInvoice, deleteInvoice } = useInvoices(shopId, branchId);
```

## 🔍 Monitoring & Validation

### Migration Validation
The migration script includes comprehensive validation:

1. **Data Integrity**: Ensures all data is migrated correctly
2. **Collection Validation**: Verifies all collections exist and have data
3. **Error Tracking**: Logs all migration errors for review
4. **Statistics**: Provides detailed migration statistics

### Post-Migration Checks

1. **Test all CRUD operations** on each collection
2. **Verify security rules** work correctly
3. **Check query performance** with new indexes
4. **Validate user permissions** across different roles

## 🚨 Troubleshooting

### Common Issues

#### 1. Migration Fails
**Symptoms**: Migration script throws errors
**Solutions**:
- Check Firebase permissions
- Verify network connectivity
- Review error logs for specific issues
- Ensure sufficient Firestore quota

#### 2. Security Rules Errors
**Symptoms**: Queries fail with permission errors
**Solutions**:
- Deploy updated security rules
- Check user authentication
- Verify user roles and permissions
- Test with different user types

#### 3. Index Errors
**Symptoms**: Queries fail with index errors
**Solutions**:
- Deploy updated indexes
- Wait for index creation to complete
- Check index status in Firebase console
- Verify query structure matches indexes

#### 4. Performance Issues
**Symptoms**: Slow queries after migration
**Solutions**:
- Check composite indexes are created
- Optimize query structure
- Monitor query performance
- Consider query optimization

### Rollback Plan

If migration fails or issues arise:

1. **Stop the application**
2. **Restore from backup** (if available)
3. **Revert to old code structure**
4. **Investigate and fix issues**
5. **Retry migration**

## 📞 Support

For migration support:

1. **Check logs**: Review migration script logs
2. **Firebase Console**: Monitor Firestore usage and errors
3. **Documentation**: Refer to this guide and Firebase docs
4. **Community**: Check Firebase community forums

## 🎉 Post-Migration

After successful migration:

1. **Test thoroughly**: All application functionality
2. **Monitor performance**: Query response times
3. **Update documentation**: Team documentation
4. **Train team**: New data structure and queries
5. **Plan cleanup**: Remove old subcollections when ready

## 📚 Additional Resources

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

**Migration completed successfully! 🎉**

Your Firestore database is now using the optimized normalized structure for better performance and scalability. 