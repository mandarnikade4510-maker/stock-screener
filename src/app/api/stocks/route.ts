import { NextResponse } from 'next/server';
import { UNIVERSE } from '@/lib/universe';
/** GET /api/stocks?limit=100&offset=0 : mock REST endpoint over the generated universe. */
export function GET(req: Request) {
  const u = new URL(req.url); const limit = Math.min(5000, Number(u.searchParams.get('limit') ?? 5000)); const offset = Number(u.searchParams.get('offset') ?? 0);
  return NextResponse.json({ total: UNIVERSE.length, data: UNIVERSE.slice(offset, offset + limit) }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
