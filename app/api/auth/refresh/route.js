import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  generateAccessToken, 
  generateRefreshToken,
  getRefreshTokenExpiry 
} from '@/lib/auth';

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Find refresh token
    const tokens = await query(
      `SELECT rt.*, u.id as user_id, u.email, u.role, u.is_active 
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = ? AND rt.revoked_at IS NULL`,
      [refreshToken]
    );

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const tokenData = tokens[0];

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!tokenData.is_active) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      id: tokenData.user_id,
      email: tokenData.email,
      role: tokenData.role,
    });
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenExpiry = getRefreshTokenExpiry();

    // Revoke old refresh token and store new one
    await query(
      `UPDATE refresh_tokens 
       SET revoked_at = NOW(), replaced_by_token = ?
       WHERE token = ?`,
      [newRefreshToken, refreshToken]
    );

    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [tokenData.user_id, newRefreshToken, newRefreshTokenExpiry, ipAddress, userAgent]
    );

    return NextResponse.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token', message: error.message },
      { status: 500 }
    );
  }
}