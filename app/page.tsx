"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If user is authenticated, redirect to dashboard
      // Otherwise, redirect to login
      router.push(user ? "/dashboard" : "/login")
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <p className="text-sm text-gray-500">Redirecionando...</p>
      </div>
    </div>
  )
}
