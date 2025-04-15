"use client"

import { useState } from "react"
import { Edit, Send, Loader2, MessageSquare, Mic, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AudioRecorderConverter } from "@/components/audio-recorder-converter"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { checkUserSession } from "@/lib/session-manager" // Certifique-se que o caminho está correto

// Sample data for messages
const mensagensIniciais = [
  {
    id: 1,
    titulo: "Mensagem 1",
    conteudo: "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
  },
  {
    id: 2,
    titulo: "Mensagem 2",
    conteudo:
      "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
  },
  {
    id: 3,
    titulo: "Mensagem 3",
    conteudo:
      "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
  },
]

export default function MensagensPage() {
  const [mensagens, setMensagens] = useState(mensagensIniciais)
  const [phoneNumber, setPhoneNumber] = useState("447897274321")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState("texto")
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const [editingMessage, setEditingMessage] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedContent, setEditedContent] = useState("")

  const handleEditMessage = (mensagem: any) => {
    setEditingMessage(mensagem)
    setEditedContent(mensagem.conteudo)
    setIsEditModalOpen(true)
  }

  const handleSaveMessage = () => {
    if (!editingMessage) return
    setMensagens(mensagens.map((msg) => (msg.id === editingMessage.id ? { ...msg, conteudo: editedContent } : msg)))
    setIsEditModalOpen(false)
    toast({
      title: "Mensagem atualizada",
      description: "Seu modelo de mensagem foi atualizado com sucesso!",
    })
  }

  // --- FUNÇÃO handleSendMessage COM CORREÇÃO DE URL ---
  const handleSendMessage = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o número de telefone e a mensagem.",
        variant: "destructive",
      })
      return
    }

    if (!user?.email) {
      toast({
        title: "Autenticação necessária",
        description: "Você precisa estar logado para enviar mensagens.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    setWhatsappError(null)

    try {
      console.log(`[Frontend] Verificando sessão ativa para ${user.email}`)
      const sessionInfo = await checkUserSession(user.email)

      if (!sessionInfo.hasSession || !sessionInfo.sessionName) {
        console.error("[Frontend] Nenhuma sessão ativa encontrada para o usuário.")
        setWhatsappError("Nenhuma sessão WhatsApp ativa encontrada. Por favor, conecte na página de Configurações.")
        toast({
          title: "Sessão não encontrada",
          description: "Conecte seu WhatsApp na página de Configurações primeiro.",
          variant: "destructive",
        })
        setIsSending(false)
        return
      }

      const activeSessionName = sessionInfo.sessionName
      console.log(`[Frontend] Usando sessão ativa: ${activeSessionName}`)

      const apiUrl = process.env.NEXT_PUBLIC_WAHA_API_URL

      if (!apiUrl) {
        console.error("[Frontend] ERRO CRÍTICO: NEXT_PUBLIC_WAHA_API_URL não definida!")
        throw new Error("Configuração da URL da API ausente.")
      }

      const endpointPath = "/api/sendText"

      const payload = {
        chatId: `${phoneNumber}@c.us`,
        text: message,
        session: activeSessionName,
      }

      const correctedApiUrl = apiUrl.replace(/\/$/, "")
      const fullEndpoint = `${correctedApiUrl}${endpointPath}`

      console.log(`[Frontend] Enviando para WAHA: POST ${fullEndpoint}`)
      console.log(`[Frontend] Payload:`, payload)

      const response = await fetch(fullEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log(`[Frontend] Resposta da WAHA (${response.status}):`, data)

      if (response.ok) {
        toast({
          title: "Mensagem enviada!",
          description: "Sua mensagem foi enviada com sucesso.",
        })
        setMessage("")
      } else {
        console.error(`[Frontend] Erro ao enviar mensagem pela API WAHA (${response.status}):`, data)

        const errorMessage =
          data?.message || data?.error?.message || data?.error || `Erro ${response.status} ao enviar mensagem.`

        setWhatsappError(errorMessage)
        toast({
          title: "Erro ao Enviar",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[Frontend] Erro GERAL ao enviar mensagem:", error)

      const description =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro desconhecido ao tentar enviar a mensagem. Verifique os logs."

      setWhatsappError(description)
      toast({
        title: "Erro Crítico",
        description: description,
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }
  // --- FIM DA FUNÇÃO handleSendMessage ---

  // ... (Restante do componente: handleAudioSuccess, handleAudioError, goToConfigPage, JSX return) ...

  const handleAudioSuccess = () => {
    toast({
      title: "Áudio enviado",
      description: "Seu áudio foi enviado com sucesso!",
    })
    setActiveTab("texto")
  }

  const handleAudioError = (errorMessage: string) => {
    if (
      errorMessage.includes("NO_SESSION") ||
      errorMessage.includes("necessária") ||
      errorMessage.includes("conectar")
    ) {
      setWhatsappError("Você precisa conectar seu WhatsApp na página de configurações antes de enviar mensagens.")
    } else {
      toast({
        title: "Erro ao enviar áudio",
        description: errorMessage || "Ocorreu um erro ao enviar o áudio.",
        variant: "destructive",
      })
    }
    console.error("[Frontend] Audio send error:", errorMessage)
  }

  const goToConfigPage = () => {
    router.push("/configuracoes")
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="mensagens" />

      {/* Main content */}
      <div className="flex-1 p-6 bg-[#faf7f0] ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Mensagens de Felicitações</h1>
          <p className="text-gray-600 mb-6">Crie, edite e envie mensagens personalizadas para datas especiais</p>

          {/* WhatsApp Connection Error Alert */}
          {whatsappError && (
            <Alert variant="destructive" className="mb-6 bg-red-100 border-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col">
                <span className="font-semibold text-lg">Erro WhatsApp</span>
                <span>{whatsappError}</span>
                {whatsappError.includes("Conecte") && (
                  <Button onClick={goToConfigPage} className="mt-2 bg-green-500 hover:bg-green-600 self-start">
                    Ir para Configurações
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* New Card for Direct Message Sending */}
          <Card className="bg-white border-0 shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Enviar Mensagem Direta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone-number">Número do WhatsApp</Label>
                <Input
                  id="phone-number"
                  placeholder="Ex: 5511999998888"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Formato internacional (ex: 5511999998888)</p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="texto" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Mensagem de Texto
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Mensagem de Áudio
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="texto" className="pt-4">
                  <div>
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      placeholder="Digite sua mensagem aqui..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="mt-1 min-h-[120px]"
                    />
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      className="bg-green-500 hover:bg-green-600"
                      onClick={handleSendMessage}
                      disabled={isSending || !phoneNumber || !message || !user?.email}
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
                </TabsContent>

                <TabsContent value="audio" className="pt-4">
                  <AudioRecorderConverter
                    apiUrl={process.env.NEXT_PUBLIC_WAHA_API_URL || ""}
                    phoneNumber={phoneNumber}
                    userEmail={user?.email || ""}
                    onSuccess={handleAudioSuccess}
                    onError={handleAudioError}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Message grid */}
          <h2 className="text-xl font-semibold text-[#1e3a29] mb-4">Modelos de Mensagens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mensagens.map((mensagem) => (
              <Card key={mensagem.id} className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">{mensagem.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-700">{mensagem.conteudo}</p>
                </CardContent>
                <CardFooter className="flex justify-end pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleEditMessage(mensagem)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar Conteúdo
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
      {/* Message edit modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editando: {editingMessage?.titulo}</DialogTitle>
            <DialogDescription>Modifique o conteúdo da mensagem conforme necessário.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">
                Conteúdo
              </Label>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="col-span-3"
                rows={5}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Emojis</Label>
              <div className="col-span-3 flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🎂")}
                  title="Bolo de aniversário"
                >
                  🎂
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🎉")}
                  title="Festa"
                >
                  🎉
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🎈")}
                  title="Balão"
                >
                  🎈
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🎁")}
                  title="Presente"
                >
                  🎁
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🥳")}
                  title="Rosto festivo"
                >
                  🥳
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "✨")}
                  title="Brilhos"
                >
                  ✨
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🎊")}
                  title="Bola de confete"
                >
                  🎊
                </span>
                <span
                  className="text-2xl cursor-pointer hover:bg-gray-200 p-1 rounded"
                  onClick={() => setEditedContent((prev) => prev + "🙏")}
                  title="Mãos em oração"
                >
                  🙏
                </span>
              </div>
              <div className="col-span-4 text-xs text-gray-500 text-center mt-1">
                Clique em um emoji para adicioná-lo à sua mensagem
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMessage} className="bg-green-500 hover:bg-green-600">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
