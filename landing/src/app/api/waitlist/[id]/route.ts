import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.waitlist.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Waitlist entry deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in waitlist DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
