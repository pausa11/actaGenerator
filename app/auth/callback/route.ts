import { createClient } from '@/lib/supabase/server';
import { getOrCreateDbUser } from '@/lib/db/utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await getOrCreateDbUser(data.user).catch(() => {});
      return NextResponse.redirect(`${origin}/generar`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
}
