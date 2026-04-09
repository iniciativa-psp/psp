import { NextRequest, NextResponse } from 'next/server'
import { getProvincias, getDistritos, getCorregimientos } from '@/lib/territorial/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const parent = searchParams.get('parent')

  try {
    if (type === 'provincias') {
      const data = await getProvincias()
      return NextResponse.json(data)
    }

    if (type === 'distritos') {
      const provinceId = parent ? Number(parent) : undefined
      const data = await getDistritos(provinceId)
      return NextResponse.json(data)
    }

    if (type === 'corregimientos') {
      const districtId = parent ? Number(parent) : undefined
      const data = await getCorregimientos(districtId)
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Tipo inválido. Use: provincias, distritos, corregimientos' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
