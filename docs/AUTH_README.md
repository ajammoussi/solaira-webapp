# Solaira Authentication System

Complete authentication system for the Solaira PV Energy Management app using Supabase.

## Features

- 📧 **Email/Password Authentication** - Traditional signup and login
- 🔐 **OAuth Providers** - Google and GitHub social login
- 🔗 **Magic Link** (optional) - Passwordless email login
- 👤 **Guest Access** - Limited anonymous sessions
- 🛡️ **Route Protection** - Client and server-side protection
- 📱 **Mobile-First Design** - Responsive and accessible forms

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Sign In | `/signin` | Email/password + OAuth + guest login |
| Sign Up | `/signup` | Account registration |
| Forgot Password | `/forgot-password` | Password reset request |
| Reset Password | `/reset-password` | Set new password (from email link) |
| Account | `/account` | Profile settings (protected) |
| Callback | `/callback` | OAuth redirect handler |

## Environment Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Project URL
# Find in: Dashboard > Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Key (safe for client-side)
# Find in: Dashboard > Settings > API > Project API keys > anon/public
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role Key (server-side only!)
# Find in: Dashboard > Settings > API > Project API keys > service_role
# ⚠️ Never expose this key to the client!
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Configure OAuth Providers (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Authentication > Providers > Google, enable and add credentials

#### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Authentication > Providers > GitHub, enable and add credentials

### 4. Enable Anonymous Sign-ins (Guest Access)

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable "Anonymous Sign-ins"

### 5. Configure Email Templates (Optional)

Customize email templates in Supabase Dashboard > Authentication > Email Templates:
- Confirm signup
- Reset password
- Magic link

### 6. Run Database Migrations

Execute the schema in `database/schema.sql` in the Supabase SQL Editor to create the `profiles` table and RLS policies.

## Usage

### Protecting Pages (Client-Side)

```jsx
import { withAuth } from '../lib/auth';

function ProtectedPage() {
  return <div>Only authenticated users can see this</div>;
}

// Wrap with HOC
export default withAuth(ProtectedPage);

// Or with options:
export default withAuth(ProtectedPage, { 
  allowGuest: false,  // Require full account (not guest)
  redirectTo: '/signin' 
});
```

### Using the useRequireAuth Hook

```jsx
import { useRequireAuth } from '../lib/auth';

function ProtectedPage() {
  const { user, loading, isGuest } = useRequireAuth();

  if (loading) return <Loading />;

  return (
    <div>
      Welcome, {user.email}!
      {isGuest && <span>You're a guest</span>}
    </div>
  );
}
```

### Protecting API Routes (Server-Side)

```js
import { withApiAuth } from '../../lib/auth';

async function handler(req, res) {
  // req.user contains the authenticated user
  const { user } = req;
  
  res.json({ message: `Hello, ${user.email}` });
}

export default withApiAuth(handler);

// With options:
export default withApiAuth(handler, { 
  allowGuest: false,
  requireAdmin: true 
});
```

### Using Auth Context

```jsx
import { useAuth } from '../lib/hooks';

function MyComponent() {
  const { 
    user, 
    profile, 
    loading, 
    isAuthenticated,
    signIn, 
    signOut,
    signUp 
  } = useAuth();

  if (loading) return <Loading />;

  return isAuthenticated ? (
    <button onClick={signOut}>Sign Out</button>
  ) : (
    <button onClick={() => signIn(email, password)}>Sign In</button>
  );
}
```

## Components

Import reusable auth components:

```jsx
import {
  AuthContainer,
  AuthLogo,
  AuthHeader,
  Input,
  PasswordInput,
  PrimaryButton,
  OAuthButtons,
  GuestButton,
  Divider,
  ErrorMessage,
  SuccessMessage,
} from '../components/Auth';
```

## File Structure

```
├── components/
│   └── Auth/
│       ├── index.js          # Auth UI components
│       └── styles.module.css # Component styles
├── lib/
│   ├── auth/
│   │   ├── index.js          # Auth utilities exports
│   │   ├── withAuth.js       # Route protection HOC
│   │   └── apiMiddleware.js  # API route middleware
│   ├── hooks/
│   │   └── useAuth.js        # Auth context & hook
│   ├── services/
│   │   └── auth.js           # Auth API service
│   └── supabase.js           # Supabase client config
├── pages/
│   └── auth/
│       ├── index.js          # Redirect to signin
│       ├── signin.js         # Sign in page
│       ├── signup.js         # Sign up page
│       ├── forgot-password.js # Password reset request
│       ├── reset-password.js  # Set new password
│       ├── account.js        # Account settings
│       └── callback.js       # OAuth callback handler
```

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the client
2. **Use RLS policies** for all database tables
3. **Validate input** on both client and server
4. **Use HTTPS** in production
5. **Set secure cookie options** for production

## Troubleshooting

### "Invalid login credentials"
- Check email/password are correct
- Verify email is confirmed (check spam folder)

### OAuth not working
- Verify redirect URLs are configured correctly
- Check provider credentials in Supabase dashboard

### Guest access fails
- Enable "Anonymous Sign-ins" in Supabase Authentication settings

### Reset link expired
- Links expire after 1 hour by default
- Request a new reset link
