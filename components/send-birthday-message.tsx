"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Send, Loader2, Gift } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

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

  // Check if a message was already sent to this contact today
  const checkIfMessageAlreadySent = async (): Promise<boolean> => {
    if (!user?.email || !contactId) return false

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const sentMessagesRef = collection(db, "sent_messages")
      const q = query(
        sentMessagesRef,
        where("userEmail", "==", user.email),
        where("contactId", "==", contactId),
        where("timestamp", ">=", Timestamp.fromDate(today)),
        where("status", "in", ["sent", "sending"]),
      )

      const snapshot = await getDocs(q)
      return !snapshot.empty
    } catch (error) {
      console.error("Error checking if message was already sent:", error)
      return false
    }
  }

  // Record that a message was sent
  const recordMessageSent = async (messageContent: string): Promise<string> => {
    if (!user?.email || !contactId) throw new Error("Missing user email or contact ID")

    try {
      const today = new Date().toISOString().split("T")[0]
      const recordId = `manual_birthday_${user.email}_${contactId}_${today}`

      await setDoc(doc(db, "sent_messages", recordId), {
        messageId: recordId,
        userEmail: user.email,
        contactId,
        contactName,
        phoneNumber: contactPhone,
        message: messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : ""),
        timestamp: Timestamp.now(),
        status: "sent",
        type: "manual_birthday",
        sentBy: "manual",
      })

      return recordId
    } catch (error) {
      console.error("Error recording message sent:", error)
      throw error
    }
  }

  // Enviar mensagem
  const handleSendMessage = async () => {
    setIsSending(true)
    setError(null)

    try {
      if (!user?.email) {
        throw new Error("Você precisa estar logado para enviar mensagens")
      }

      // Check if a message was already sent today
      const alreadySent = await checkIfMessageAlreadySent()
      if (alreadySent) {
        toast({
          title: "Mensagem já enviada",
          description: `Uma mensagem já foi enviada para ${contactName} hoje.`,
        })
        if (onSuccess) onSuccess()
        return
      }

      const finalMessage = replacePlaceholders(getCurrentMessage())

      // Format phone number
      let chatId = contactPhone.replace(/\D/g, "")
      if (!chatId.endsWith("@c.us")) {
        chatId = `${chatId}@c.us`
      }

      // Call WhatsApp API
      const wahaApiUrl = process.env.NEXT_PUBLIC_WAHA_API_URL || "https://api.parabenspravoce.com"

      const response = await fetch("/api/whatsapp/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: chatId,
          message: finalMessage,
          sessionName: "default",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Erro ${response.status}`)
      }

      // Record the message as sent
      await recordMessageSent(finalMessage)

      toast({
        title: "Mensagem enviada!",
        description: `Mensagem de aniversário enviada para ${contactName}.`,
      })

      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error("Erro ao enviar mensagem de aniversário:", err)
      setError(err.message || "Erro desconhecido ao enviar mensagem.")
      toast({
        title: "Erro ao enviar",
        description: err.message || "Erro desconhecido ao enviar mensagem.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
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
          onClick={handleSendMessage}
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
