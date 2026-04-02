import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((request) => {
  const { nextUrl } = request;
  const session = request.auth;
  const pathname = nextUrl.pathname;

  const publicPaths = ['/login', '/book', '/api', '/agendamento', '/plano'];
  const isPublic = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/';

  if (!isPublic && !session) {
    const url = nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && session) {
    const url = nextUrl.clone();
    const role = (session.user as any)?.role;
    url.pathname = role === 'Super Admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|icons|manifest.json).*)',
  ],
};
