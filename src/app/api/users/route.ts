import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

// 모든 사용자 목록 조회 (관리자 전용)
export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        isApproved: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 사용자 정보 업데이트 (관리자 전용: 승인 및 등급 변경)
export async function PATCH(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role, isApproved } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(isApproved !== undefined && { isApproved }),
      },
    });

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 사용자 삭제 (관리자 전용)
export async function DELETE(req: Request) {
    try {
      const session = await verifySession();
      if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');
  
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }
  
      await prisma.user.delete({
        where: { id: userId },
      });
  
      return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
