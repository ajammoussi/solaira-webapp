import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, isStrongPassword } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/password-reset/confirm:
 *   post:
 *     summary: Confirm password reset with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        { 
          error: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character' 
        },
        { status: 400 }
      );
    }

    // Find valid reset token
    const resetTokens = await query(
      `SELECT * FROM password_resets 
       WHERE token = ? AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (resetTokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const resetToken = resetTokens[0];

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_resets SET used_at = NOW() WHERE id = ?',
      [resetToken.id]
    );

    // Revoke all refresh tokens for this user (force re-login)
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [resetToken.user_id]
    );

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password', message: error.message },
      { status: 500 }
    );
  }
}