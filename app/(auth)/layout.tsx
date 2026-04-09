import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autenticación – SIG-PSP',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.205_0.08_265)] to-[oklch(0.269_0.07_265)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
            <span className="text-white text-2xl font-bold">SIG</span>
          </div>
          <h1 className="text-white text-2xl font-bold">SIG-PSP</h1>
          <p className="text-white/70 text-sm mt-1">Panamá Sin Pobreza</p>
        </div>
        {children}
      </div>
    </div>
  )
}
