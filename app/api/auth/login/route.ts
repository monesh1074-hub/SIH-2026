import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role, userId } = body;

    let user = null;

    if (userId) {
      user = dbStore.getUserById(userId);
    } else if (role) {
      // Demo 1-click login by role
      user = dbStore.getUsers().find(u => u.role === role);
    } else if (email) {
      user = dbStore.authenticate(email, password);
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials or user not found' },
        { status: 401 }
      );
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Your account is deactivated. Contact System Administrator.' },
        { status: 403 }
      );
    }

    // Set active session in memory and cookie
    dbStore.setCurrentUser(user.id);
    const cookieStore = await cookies();
    cookieStore.set('sih_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: false, // allow client to read for quick state if needed
      sameSite: 'lax'
    });
    cookieStore.set('sih_user_role', user.role, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: 'lax'
    });

    dbStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      details: `Successful authenticated login for ${user.name} (${user.role}) from IP 127.0.0.1`
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Login successful'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
