import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = request.cookies.get('sih_user_id')?.value;

  // Public paths that do not require authentication
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/documents/sample-') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/me';

  // If visiting login while already authenticated, redirect to dashboard
  if (pathname === '/login' && userId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If requesting a protected resource without active session cookie
  if (!isPublicPath && !userId) {
    // Return 401 JSON for unauthenticated API calls
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Session expired or missing.' },
        { status: 401 }
      );
    }

    // Redirect unauthenticated page requests to /login
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|webp|svg|gif)).*)',
  ],
};
