import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  hashPassword, 
  generateVerificationToken, 
  isValidEmail, 
  isStrongPassword 
} from '@/lib/auth';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@solaira.tn
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass@123
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: integer
 *                 email:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already exists
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        { 
          error: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character' 
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password and generate verification token
    const passwordHash = await hashPassword(password);
    const verificationToken = generateVerificationToken();

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, verification_token) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, passwordHash, firstName, lastName, verificationToken]
    );

    // TODO: Send verification email with verificationToken

    return NextResponse.json(
      {
        message: 'User registered successfully. Please check your email to verify your account.',
        userId: result.insertId,
        email: email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user', message: error.message },
      { status: 500 }
    );
  }
}