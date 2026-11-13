import { NextResponse, type NextRequest } from "next/server";

/**
 * Reject URLs with malformed percent-escapes (e.g. /join/%E0%A4%A) with a 400 before routing,
 * instead of letting the router throw a 500 while decoding dynamic segments.
 */
export function proxy(request: NextRequest) {
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Bad request: the link is malformed.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return NextResponse.next();
}

export const config = {
  // Skip static assets and the image optimiser.
  matcher: ["/((?!_next/static|_next/image|media/|favicon).*)"],
};
