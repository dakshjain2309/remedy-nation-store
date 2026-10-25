
 // PhonePe payment integration — preparation only.
 // Live payments are not enabled.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PhonePe checkout remains disabled until merchant onboarding,
// payment verification, and webhook security are complete.
export async function POST() {
  return NextResponse.json(
    { error: 'PhonePe payments are not available yet.' },
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
