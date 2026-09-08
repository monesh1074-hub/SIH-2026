import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET() {
  try {
    const roles = dbStore.getRoles();
    return NextResponse.json({
      success: true,
      data: roles,
      count: roles.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, message: 'Role name is required.' },
        { status: 400 }
      );
    }

    const newRole = dbStore.addRole(body);

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create role' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Role ID is required for updates.' },
        { status: 400 }
      );
    }

    const updated = dbStore.updateRole(id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Role updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Role ID required' }, { status: 400 });
    }

    const success = dbStore.deleteRole(id);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Role not found or system protected role cannot be deleted.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully.'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete role' },
      { status: 500 }
    );
  }
}
