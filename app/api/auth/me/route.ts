import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;

    let user = null;
    if (userId) {
      user = dbStore.getUserById(userId);
    }

    // Default to current active user if no cookie (e.g. dev demo)
    if (!user) {
      user = dbStore.getCurrentUser();
    }

    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
