# easyMO Admin Panel - API Reference

## 🔌 Supabase Integration

### Database Tables

#### Users Table
```typescript
interface User {
  id: string;
  phone: string;
  credits: number;
  referral_code: string;
  created_at: string;
}
```

#### Drivers Table
```typescript
interface Driver {
  id: string;
  user_id: string;
  vehicle_plate: string;
  driver_kind: 'moto' | 'car';
  is_online: boolean;
  current_location: string;
}
```

#### Businesses Table
```typescript
interface Business {
  id: string;
  owner_user_id: string;
  business_name: string;
  business_type: string;
  is_approved: boolean;
  created_at: string;
}
```

### Custom Hooks

#### useUnifiedData
```typescript
const {
  users,
  drivers, 
  businesses,
  loading,
  error,
  createUser,
  updateUser,
  deleteUser
} = useUnifiedData();
```

#### useAdminAuth
```typescript
const { user, signIn, signOut, loading } = useAdminAuth();
```

### Edge Functions

#### WhatsApp Integration
- `whatsapp-webhook`: Process incoming messages
- `send-whatsapp-message`: Send messages to users
- `whatsapp-analytics`: Get messaging metrics

#### Payment Processing
- `generate-payment`: Create payment QR codes
- `momo-webhook`: Handle payment confirmations

#### Driver Management
- `assign-driver`: Assign drivers to orders
- `driver-status`: Update driver availability

## 🎯 Component APIs

### AdminTable
```typescript
<AdminTable
  data={data}
  columns={columns}
  onEdit={(item) => handleEdit(item)}
  onDelete={(id) => handleDelete(id)}
  loading={loading}
/>
```

### UnifiedDashboard
- Real-time metrics display
- Quick action buttons
- Navigation to detail pages

---
*Complete API reference for easyMO Admin Panel*