import { NextRequest, NextResponse } from 'next/server'
import { searchActors } from '@/lib/actores/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  try {
    const actors = await searchActors(q, undefined, limit)
    const result = actors.map(a => ({
      id: a.id,
      full_name: a.full_name,
      actor_type: a.actor_type,
    }))
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
