"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, MessageSquare } from "lucide-react"
// Add router import
import { useRouter } from "next/navigation"

// Update the ResetPasswordPage component to include router
export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()
  const router = useRouter() // Add this line

  // Add this function
  const handleBackToLogin = () => {
    router.push("/login")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (error: any) {
      let errorMessage = "Falha ao enviar email de redefinição de senha."

      if (error.code === "auth/user-not-found") {
        errorMessage = "Não encontramos uma conta com este email."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido. Verifique o formato do email."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde."
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: "url('/images/login-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1">Redefinir Senha</h1>
        <p className="text-center text-gray-600 mb-6">Digite seu email para receber um link de redefinição de senha</p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Email enviado! Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </AlertDescription>
            <Button
              onClick={handleBackToLogin}
              className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2"
            >
              Voltar para o Login
            </Button>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-blue-50 border-blue-100"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Link de Redefinição"
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-green-500 hover:text-green-600">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
