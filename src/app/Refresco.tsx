'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Refresco({ segundos = 20 }: { segundos?: number }) {
  const router = useRouter()
  useEffect(() => { const i = setInterval(() => router.refresh(), segundos * 1000); return () => clearInterval(i) }, [router, segundos])
  return null
}
