// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Giả sử bạn lưu accessToken trong cookie (hoặc nếu không có, kiểm tra cookie refreshToken)
  const token = req.cookies.get('refreshToken');
  
  // Nếu không có token, chuyển hướng về trang login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Nếu có token, cho phép request tiếp tục
  return NextResponse.next();
}

// Áp dụng cho các route cần bảo vệ
export const config = {
  matcher: ['/user/:path*'],
};