"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, MessageSquare, Info } from "lucide-react"
import { signInWithPopup, browserPopupRedirectResolver } from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase-config"
import { useToast } from "@/hooks/use-toast"

// Admin user constant
const ADMIN_EMAIL = "ronaldo@graficaeleal.com.br"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showAdminInfo, setShowAdminInfo] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Check if email is admin email
  useEffect(() => {
    setShowAdminInfo(email.toLowerCase() === ADMIN_EMAIL.toLowerCase())
  }, [email])

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)

    try {
      // Use the imported googleProvider and specify the resolver
      const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver)

      // Log successful authentication details for debugging
      console.log("Google authentication successful:", {
        email: result.user.email,
        uid: result.user.uid,
        displayName: result.user.displayName,
      })

      toast({
        title: "Login bem-sucedido",
        description: "Você foi autenticado com sucesso!",
      })
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Erro ao fazer login com Google:", error)

      // More detailed error logging
      if (error.code) {
        console.error("Error code:", error.code)
      }

      if (error.message) {
        console.error("Error message:", error.message)
      }

      // Provide a more specific error message based on the error code
      let errorMessage = "Falha ao fazer login com Google. Tente novamente."

      if (error.code === "auth/popup-blocked") {
        errorMessage = "O popup foi bloqueado pelo navegador. Por favor, permita popups para este site."
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "O processo de login foi cancelado. Por favor, tente novamente."
      } else if (error.code === "auth/unauthorized-domain") {
        errorMessage = "Este domínio não está autorizado para autenticação. Entre em contato com o administrador."
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signIn(email, password)

      // Special message for Ronaldo
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        toast({
          title: "Bem-vindo, Ronaldo!",
          description: "Você está acessando sua conta com todos os seus dados.",
        })
      } else {
        toast({
          title: "Login bem-sucedido",
          description: "Você foi autenticado com sucesso!",
        })
      }

      router.push("/dashboard")
    } catch (error: any) {
      let errorMessage = "Falha ao fazer login. Verifique suas credenciais."

      if (error.code === "auth/user-not-found") {
        errorMessage = "Usuário não encontrado. Verifique seu email."
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Senha incorreta. Tente novamente."
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Credenciais inválidas. Verifique seu email e senha."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas de login. Tente novamente mais tarde."
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
        backgroundImage:
          "url('https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.firebasestorage.app/o/Untitled%20design%20(2).jpg?alt=media&token=b33a6565-55a9-4454-bfac-4568be47635e')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1">
          Nunca + esqueça
          <br />o aniversário de ninguém
        </h1>
        <p className="text-center text-gray-600 mb-6">Coloque seu email e senha</p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showAdminInfo && (
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Você está acessando a conta de Ronaldo Leal. Esta conta contém todos os dados originais do sistema.
            </AlertDescription>
          </Alert>
        )}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-gray-700">
                Senha
              </Label>
              <Link href="/reset-password" className="text-sm font-medium text-green-500 hover:text-green-600">
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">OU CONTINUE COM</span>
            </div>
          </div>

          <button
            className="mt-4 w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-md transition-all hover:shadow-lg bg-white"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            <span className="font-semibold">Continuar com Google</span>
          </button>
        </div>

        <div className="mt-6 text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/register" className="font-medium text-green-500 hover:text-green-600">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  )
}
