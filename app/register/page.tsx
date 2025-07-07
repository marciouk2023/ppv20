"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Add this new component for the phone input with country selection
function PhoneInputWithCountry({ value, onChange, error }) {
  // List of countries with their codes and flags
  const countries = [
    { code: "55", name: "Brasil", flag: "🇧🇷" },
    { code: "1", name: "Estados Unidos", flag: "🇺🇸" },
    { code: "351", name: "Portugal", flag: "🇵🇹" },
    { code: "34", name: "Espanha", flag: "🇪🇸" },
    { code: "44", name: "Reino Unido", flag: "🇬🇧" },
    { code: "49", name: "Alemanha", flag: "🇩🇪" },
    { code: "33", name: "França", flag: "🇫🇷" },
    { code: "39", name: "Itália", flag: "🇮🇹" },
    { code: "81", name: "Japão", flag: "🇯🇵" },
    { code: "86", name: "China", flag: "🇨🇳" },
  ]

  const [countryCode, setCountryCode] = useState("55") // Default to Brazil
  const [phoneNumber, setPhoneNumber] = useState("")

  const handleCountryChange = (code) => {
    setCountryCode(code)
    onChange(`+${code}${phoneNumber}`)
  }

  const handlePhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, "") // Remove non-digits
    setPhoneNumber(newPhone)
    onChange(`+${countryCode}${newPhone}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-[140px]">
          <Select defaultValue="55" onValueChange={handleCountryChange}>
            <SelectTrigger className="bg-blue-50 border-blue-100">
              <SelectValue placeholder="País">
                {countries.find((c) => c.code === countryCode)?.flag} +{countryCode}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                    <span className="text-gray-500">+{country.code}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="tel"
          placeholder="DDD + número"
          value={phoneNumber}
          onChange={handlePhoneChange}
          className="flex-1 bg-blue-50 border-blue-100"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Update the RegisterPage component to include the WhatsApp field
export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [whatsappError, setWhatsappError] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const validateWhatsapp = () => {
    if (!whatsapp) {
      setWhatsappError("WhatsApp é obrigatório")
      return false
    }

    // Remove all non-digits and check if we have at least 10 digits (including country code)
    const digitsOnly = whatsapp.replace(/\D/g, "")
    if (digitsOnly.length < 10) {
      setWhatsappError("Número de WhatsApp inválido")
      return false
    }

    setWhatsappError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setWhatsappError("")

    // Validate WhatsApp
    if (!validateWhatsapp()) {
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    setLoading(true)

    try {
      // Pass the WhatsApp number to the signUp function
      // You'll need to update your auth context to handle this additional field
      await signUp(email, password, name, whatsapp)
      toast({
        title: "Conta criada com sucesso",
        description: "Sua conta foi criada e você foi autenticado automaticamente.",
      })
      router.push("/dashboard")
    } catch (error: any) {
      let errorMessage = "Falha ao criar conta. Tente novamente."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está em uso. Tente outro email."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido. Verifique o formato do email."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Senha muito fraca. Use uma senha mais forte."
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

        <h1 className="text-2xl font-bold text-center mb-1">Criar Conta</h1>
        <p className="text-center text-gray-600 mb-6">Preencha os dados abaixo para criar sua conta</p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700">
              Nome
            </Label>
            <Input
              id="name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-blue-50 border-blue-100"
            />
          </div>

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
            <Label htmlFor="whatsapp" className="text-gray-700 flex items-center">
              WhatsApp <span className="text-red-500 ml-1">*</span>
            </Label>
            <PhoneInputWithCountry value={whatsapp} onChange={setWhatsapp} error={whatsappError} />
            <p className="text-xs text-gray-500">Número que será usado para envio de mensagens</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-blue-50 border-blue-100"
            />
            <p className="text-xs text-gray-500">A senha deve ter pelo menos 6 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700">
              Confirmar Senha
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                Criando conta...
              </>
            ) : (
              "Criar Conta"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-green-500 hover:text-green-600">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}
