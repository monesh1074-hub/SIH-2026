import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;

    if (userId) {
      const user = dbStore.getUserById(userId);
      if (user) {
        dbStore.addAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'LOGOUT',
          details: `User ${user.name} logged out of the session.`
        });
      }
    }

    cookieStore.delete('sih_user_id');
    cookieStore.delete('sih_user_role');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
