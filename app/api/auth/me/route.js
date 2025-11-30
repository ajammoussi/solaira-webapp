import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 role:
 *                   type: string
 *                 isVerified:
 *                   type: boolean
 *                 isActive:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                 lastLoginAt:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
export async function GET(request) {
  return withAuth(request, async (req, user) => {
    try {
      // Get full user details
      const users = await query(
        `SELECT id, email, first_name, last_name, role, is_verified, 
                is_active, created_at, last_login_at
         FROM users WHERE id = ?`,
        [user.id]
      );

      if (users.length === 0) {
        return {
          status: 404,
          data: { error: 'User not found' },
        };
      }

      const userData = users[0];

      return {
        status: 200,
        data: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          isVerified: userData.is_verified,
          isActive: userData.is_active,
          createdAt: userData.created_at,
          lastLoginAt: userData.last_login_at,
        },
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        status: 500,
        data: { error: 'Failed to get user profile', message: error.message },
      };
    }
  }).then(result => {
    return NextResponse.json(result.data, { status: result.status });
  });
}