import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generatePasswordResetToken, getPasswordResetExpiry } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/password-reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const users = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If the email exists, a password reset link has been sent',
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const expiresAt = getPasswordResetExpiry();

    // Store reset token
    await query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, resetToken, expiresAt]
    );

    // TODO: Send password reset email with resetToken

    return NextResponse.json({
      message: 'If the email exists, a password reset link has been sent',
      // For development only - remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request', message: error.message },
      { status: 500 }
    );
  }
}