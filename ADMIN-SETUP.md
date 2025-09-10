# Admin System Setup Guide

## Overview
The FLDP GIS Portal now includes a comprehensive admin system that allows administrators to view all user favorites, manage user roles, and monitor system usage.

## Setup Instructions

### 1. Run the Admin SQL Setup
Execute the SQL commands in `admin-setup.sql` in your Supabase SQL Editor:

```sql
-- Add role column and set up admin policies
-- See admin-setup.sql for full setup
```

### 2. Set Your First Admin User
After running the setup SQL, manually set yourself as admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@domain.com';
```

Replace `'your-email@domain.com'` with your actual email address.

### 3. Admin Features

#### Admin Dashboard (`/admin`)
- **Overview Tab**: System statistics and county breakdown
- **Favorites Tab**: View all user favorites with ability to delete
- **Users Tab**: Manage user roles (promote/demote admins)

#### Admin Navigation
- Admin link appears in navbar (red color) only for admin users
- Mobile-responsive admin navigation

#### Admin Permissions
- View all user profiles
- View all favorites across all users
- Delete any favorite
- Change user roles (user ↔ admin)
- Access system statistics

### 4. Security Features

#### Row Level Security (RLS)
- Admins can view all data through special policies
- Regular users can only see their own data
- Admin status checked via `is_admin()` function

#### Role-Based Access
- Only users with `role = 'admin'` can access admin features
- Admin status checked on every admin operation
- Non-admins are redirected if they try to access admin pages

### 5. Admin Service (`adminService.js`)

Key functions:
- `isAdmin()` - Check if current user is admin
- `getAllUsers()` - Get all user profiles
- `getAllFavorites()` - Get all favorites with user info
- `getFavoritesStats()` - Get usage statistics
- `updateUserRole()` - Change user roles
- `deleteFavorite()` - Remove any favorite

### 6. Database Schema

#### Updated Profiles Table
```sql
profiles:
  - id (UUID, FK to auth.users)
  - email (TEXT)
  - full_name (TEXT)
  - role (TEXT) - 'user' or 'admin'
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
```

#### Admin Policies
- Admins can SELECT all profiles
- Admins can SELECT all favorite_parcels
- Regular RLS still applies for non-admins

### 7. Testing the Admin System

1. **Set yourself as admin** using the SQL command above
2. **Refresh the page** - you should see "Admin" link in navbar
3. **Visit `/admin`** - you should see the admin dashboard
4. **Test features**:
   - View all favorites from all users
   - See user statistics
   - Change user roles
   - Delete favorites

### 8. Usage Examples

#### Making Someone Admin
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
```

#### Removing Admin Access
```sql
UPDATE profiles SET role = 'user' WHERE email = 'admin@example.com';
```

#### View Admin Function in Code
```javascript
const isCurrentUserAdmin = await adminService.isAdmin();
if (isCurrentUserAdmin) {
  // Show admin features
}
```

## Important Notes

- Only make trusted users admins - they can see all user data
- Admin status is checked server-side for security
- The first admin must be set manually via SQL
- Admins can promote other users to admin
- Always use the admin service functions for admin operations

## Troubleshooting

### "Access Denied" Error
- Make sure you ran the `admin-setup.sql` commands
- Verify your user has `role = 'admin'` in the profiles table
- Check that RLS policies are properly created

### Admin Link Not Showing
- Refresh the page after setting admin role
- Check browser console for errors
- Verify the `adminService.isAdmin()` function is working

### Can't See Other Users' Data
- Confirm you're logged in as an admin user
- Check that the admin RLS policies were created correctly
- Verify the `is_admin()` function exists in your database
