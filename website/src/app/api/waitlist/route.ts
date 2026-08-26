import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { name, email, phone, reason } = await req.json();

    if (!name || !email || !phone || !reason) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const newWaitlistEntry = await prisma.waitlist.create({
      data: {
        name,
        email,
        phone,
        reason,
      },
    });

    return NextResponse.json(newWaitlistEntry, { status: 201 });
  } catch (error) {
    console.error('Error in waitlist POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const waitlistEntries = await prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(waitlistEntries);
  } catch (error) {
    console.error('Error in waitlist GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
