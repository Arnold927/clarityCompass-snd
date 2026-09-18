import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('shared_portal_token');
  const userRole = request.cookies.get('shared_portal_role');
  
  const protectedRoutes = {
    '/shared-portal/proposals/new': ['ngo_user'],
    '/shared-portal/proposals/[id]/edit': ['ngo_user'],
    '/shared-portal/reports/new': ['ngo_user'],
    '/shared-portal/admin': ['admin'],
  };
  
  const currentPath = request.nextUrl.pathname;
  
  const publicRoutes = [
    '/shared-portal/login',
    '/shared-portal/register',
    '/shared-portal/forgot-password',
  ];
  
  if (publicRoutes.includes(currentPath)) {
    return NextResponse.next();
  }
  
  if (!token) {
    const loginUrl = new URL('/shared-portal/login', request.url);
    loginUrl.searchParams.set('from', currentPath);
    return NextResponse.redirect(loginUrl);
  }
  
  for (const [route, requiredRoles] of Object.entries(protectedRoutes)) {
    if (currentPath.startsWith(route.replace('/[id]', ''))) {
      if (!userRole || !requiredRoles.includes(userRole.value)) {
        return NextResponse.redirect(new URL('/shared-portal/dashboard', request.url));
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/shared-portal/:path*',
};