"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Send, AlertTriangle, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function EnviarAudioForm() {
  const [telefone, setTelefone] = useState("")
  const [audioUrl, setAudioUrl] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ sucesso: boolean; mensagem: string } | null>(null)
  const { user } = useAuth()

  const enviarAudio = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate fields
    if (!telefone || !audioUrl) {
      setResultado({
        sucesso: false,
        mensagem: "Preencha todos os campos obrigatórios.",
      })
      return
    }

    if (!user?.email) {
      setResultado({
        sucesso: false,
        mensagem: "Você precisa estar logado para enviar áudios.",
      })
      return
    }

    // Clean phone number (numbers only)
    const numeroLimpo = telefone.replace(/\D/g, "")

    try {
      setEnviando(true)
      setResultado(null)

      console.log(`[Frontend] Enviando áudio para ${numeroLimpo} via usuário ${user.email}`)

      const response = await fetch("/api/whatsapp/send-audio-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: numeroLimpo,
          audioUrl: audioUrl,
          userEmail: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || `Erro ${response.status}`)
      }

      console.log(`[Frontend] Áudio enviado com sucesso:`, data)

      setResultado({
        sucesso: true,
        mensagem: "Áudio enviado com sucesso!",
      })
    } catch (error) {
      console.error(`[Frontend] Erro ao enviar áudio:`, error)

      setResultado({
        sucesso: false,
        mensagem: `Erro ao enviar áudio: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Enviar Áudio</CardTitle>
        <CardDescription>Envie um arquivo de áudio para um contato via WhatsApp</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={enviarAudio} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone do destinatário</Label>
            <Input
              id="telefone"
              placeholder="Ex: 5511987654321"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Apenas números, com código do país e DDD</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audioUrl">URL do arquivo de áudio</Label>
            <Input
              id="audioUrl"
              placeholder="https://example.com/audio.mp3"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">URL pública do arquivo de áudio (MP3, OGG, etc)</p>
          </div>

          {resultado && (
            <Alert
              variant={resultado.sucesso ? "default" : "destructive"}
              className={resultado.sucesso ? "bg-green-50 border-green-200" : ""}
            >
              {resultado.sucesso ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{resultado.sucesso ? "Sucesso" : "Erro"}</AlertTitle>
              <AlertDescription>{resultado.mensagem}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={enviando || !user?.email}>
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Áudio
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="text-xs text-gray-500">O WhatsApp deve estar conectado para o envio funcionar.</CardFooter>
    </Card>
  )
}
