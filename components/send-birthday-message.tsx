"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Send, Loader2, Gift } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { checkUserSession } from "@/lib/session-manager"
import { db } from "@/lib/firebase-config"
import { doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore"

interface SendBirthdayMessageProps {
  contactId: string
  contactName: string
  contactPhone: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Mensagens de aniversário pré-definidas
const birthdayMessages = [
  {
    id: 1,
    content: "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
  },
  {
    id: 2,
    content:
      "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
  },
  {
    id: 3,
    content:
      "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
  },
]

export function SendBirthdayMessage({
  contactId,
  contactName,
  contactPhone,
  onSuccess,
  onCancel,
}: SendBirthdayMessageProps) {
  const [messageType, setMessageType] = useState<"template" | "custom">("template")
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(1)
  const [customMessage, setCustomMessage] = useState<string>("")
  const [isSending, setIsSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Substituir placeholders na mensagem
  const replacePlaceholders = (message: string) => {
    return message.replace(/\{nome\}/g, contactName).replace(/\{data\}/g, new Date().toLocaleDateString("pt-BR"))
  }

  // Obter a mensagem atual com base na seleção
  const getCurrentMessage = () => {
    if (messageType === "custom") {
      return customMessage
    } else {
      const template = birthdayMessages.find((msg) => msg.id === selectedTemplateId)
      return template ? template.content : ""
    }
  }

  // Enviar mensagem
  const sendMessage = async () => {
    if (!contactPhone) {
      setError("Este contato não possui número de telefone cadastrado.")
      return
    }

    if (!user?.email) {
      setError("Você precisa estar logado para enviar mensagens.")
      return
    }

    setIsSending(true)
    setError(null)

    try {
      // Verificar se há uma sessão WhatsApp ativa
      const sessionInfo = await checkUserSession(user.email)

      if (!sessionInfo.hasSession || !sessionInfo.sessionName) {
        throw new Error("Nenhuma sessão WhatsApp ativa encontrada. Conecte na página de Configurações.")
      }

      const activeSessionName = sessionInfo.sessionName
      const apiUrl = process.env.NEXT_PUBLIC_WAHA_API_URL

      if (!apiUrl) {
        throw new Error("Configuração da URL da API ausente.")
      }

      // Preparar a mensagem final com substituição de placeholders
      const finalMessage = replacePlaceholders(getCurrentMessage())

      // Preparar payload para a API
      const payload = {
        chatId: `${contactPhone.replace(/\D/g, "")}@c.us`,
        text: finalMessage,
        session: activeSessionName,
      }

      // Enviar mensagem via API
      const correctedApiUrl = apiUrl.replace(/\/$/, "")
      const response = await fetch(`${correctedApiUrl}/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.message || `Erro ${response.status} ao enviar mensagem.`)
      }

      // Registrar mensagem enviada no Firebase
      await registerMessageInFirebase(finalMessage)

      // Notificar sucesso
      toast({
        title: "Mensagem enviada!",
        description: `Mensagem de aniversário enviada para ${contactName}.`,
      })

      // Chamar callback de sucesso
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Erro ao enviar mensagem de aniversário:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem.")

      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Registrar mensagem enviada no Firebase
  const registerMessageInFirebase = async (message: string) => {
    if (!user?.email || !contactId) return

    try {
      const contactRef = doc(db, `parabenspravoce/${user.email}/users`, contactId)

      // Adicionar mensagem ao histórico do contato
      await updateDoc(contactRef, {
        messageHistory: arrayUnion({
          message,
          type: "birthday",
          sentAt: Timestamp.now(),
          sentBy: user.email,
        }),
        lastMessageSent: Timestamp.now(),
      })
    } catch (error) {
      console.error("Erro ao registrar mensagem no Firebase:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-start gap-3">
        <Gift className="h-5 w-5 text-green-600 mt-0.5" />
        <div>
          <h3 className="font-medium text-green-800">Enviar mensagem de aniversário</h3>
          <p className="text-sm text-green-700">Envie uma mensagem de felicitações para {contactName} pelo WhatsApp.</p>
        </div>
      </div>

      <RadioGroup value={messageType} onValueChange={(value) => setMessageType(value as "template" | "custom")}>
        <div className="space-y-4">
          <div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="template" id="template" />
              <Label htmlFor="template" className="font-medium">
                Usar modelo pré-definido
              </Label>
            </div>

            {messageType === "template" && (
              <div className="mt-3 ml-6 space-y-3">
                {birthdayMessages.map((template) => (
                  <div key={template.id} className="flex items-start space-x-2">
                    <RadioGroupItem
                      value={`template-${template.id}`}
                      id={`template-${template.id}`}
                      checked={selectedTemplateId === template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className="mt-1"
                    />
                    <Label htmlFor={`template-${template.id}`} className="text-sm">
                      {template.content}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="font-medium">
                Escrever mensagem personalizada
              </Label>
            </div>

            {messageType === "custom" && (
              <div className="mt-3 ml-6">
                <Textarea
                  placeholder="Digite sua mensagem personalizada aqui..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[120px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dica: Use {"{nome}"} para incluir o nome do contato na mensagem.
                </p>
              </div>
            )}
          </div>
        </div>
      </RadioGroup>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSending}>
          Cancelar
        </Button>
        <Button
          className="bg-green-500 hover:bg-green-600"
          onClick={sendMessage}
          disabled={isSending || (messageType === "custom" && !customMessage)}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensagem
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
