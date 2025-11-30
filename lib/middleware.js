import { verifyAccessToken, extractBearerToken } from './auth';
import { query } from '@/lib/db';

/**
 * Middleware to verify JWT token and authenticate requests
 */
export async function authenticate(req) {
  const authHeader = req.headers.get('authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      authenticated: false,
      error: 'No token provided',
    };
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return {
      authenticated: false,
      error: 'Invalid or expired token',
    };
  }

  // Verify user still exists and is active
  const users = await query(
    'SELECT id, email, role, is_active, is_verified FROM users WHERE id = ?',
    [decoded.userId]
  );

  if (users.length === 0) {
    return {
      authenticated: false,
      error: 'User not found',
    };
  }

  const user = users[0];

  if (!user.is_active) {
    return {
      authenticated: false,
      error: 'User account is inactive',
    };
  }

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
    },
  };
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(allowedRoles) {
  return async (req, authResult) => {
    if (!authResult.authenticated) {
      return authResult;
    }

    if (!allowedRoles.includes(authResult.user.role)) {
      return {
        authenticated: false,
        error: 'Insufficient permissions',
      };
    }

    return authResult;
  };
}

/**
 * Helper to wrap authenticated routes
 */
export async function withAuth(req, handler, options = {}) {
  const { requireVerified = false, allowedRoles = null } = options;

  const authResult = await authenticate(req);

  if (!authResult.authenticated) {
    return {
      status: 401,
      data: { error: authResult.error },
    };
  }

  if (requireVerified && !authResult.user.isVerified) {
    return {
      status: 403,
      data: { error: 'Email verification required' },
    };
  }

  if (allowedRoles && !allowedRoles.includes(authResult.user.role)) {
    return {
      status: 403,
      data: { error: 'Insufficient permissions' },
    };
  }

  return handler(req, authResult.user);
}