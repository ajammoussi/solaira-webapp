/**
 * API Route Authentication Middleware
 * For protecting API routes
 */

import { createServerClient } from '../supabase';

/**
 * Middleware to verify authentication for API routes
 * @param {function} handler - The API route handler
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowGuest - Whether to allow guest users
 * @param {boolean} options.requireAdmin - Whether to require admin role
 */
export function withApiAuth(handler, options = {}) {
  const { allowGuest = true, requireAdmin = false } = options;

  return async (req, res) => {
    try {
      // Get the authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header' 
        });
      }

      const token = authHeader.replace('Bearer ', '');

      // Create server client and verify token
      const supabase = createServerClient();
      
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid or expired token' 
        });
      }

      // Check guest access
      if (!allowGuest && user.is_anonymous) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Guest accounts cannot access this resource' 
        });
      }

      // Check admin role if required
      if (requireAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          return res.status(403).json({ 
            error: 'Forbidden',
            message: 'Admin access required' 
          });
        }
      }

      // Add user to request object
      req.user = user;
      req.supabase = supabase;

      // Call the handler
      return handler(req, res);
    } catch (error) {
      console.error('API auth error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Authentication failed' 
      });
    }
  };
}

/**
 * Get user from request (for use in API routes)
 */
export async function getServerUser(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Verify session from cookies (for SSR)
 */
export async function getServerSession(req) {
  // Get access token from cookies or header
  const cookies = req.cookies;
  const accessToken = cookies['sb-access-token'] || cookies['supabase-auth-token'];
  
  if (!accessToken) {
    return null;
  }

  const supabase = createServerClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return null;
    }

    return { user };
  } catch (error) {
    console.error('Get server session error:', error);
    return null;
  }
}

export default withApiAuth;
