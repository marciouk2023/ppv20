"use client"

import { useState, useEffect } from "react"
import { Edit, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
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
import { collection, doc, getDocs, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"

export default function MensagensPage() {
  const [mensagens, setMensagens] = useState([])
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const [editingMessage, setEditingMessage] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [isSavingMessage, setIsSavingMessage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Função para carregar mensagens do Firebase
  const loadMessages = async () => {
    if (!user?.email) return

    try {
      setIsLoading(true)

      // Referência para a coleção de mensagens do usuário
      const messagesRef = collection(db, `parabenspravoce/${user?.email}/messages`)
      const snapshot = await getDocs(messagesRef)

      if (snapshot.empty) {
        // Se não houver mensagens, criar mensagens padrão
        await createDefaultMessages()
        return
      }

      // Mapear documentos para o formato esperado pelo componente
      const loadedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().title || `Mensagem ${doc.id}`,
        conteudo: doc.data().content || "",
        type: doc.data().type || "birthday",
      }))

      setMensagens(loadedMessages)
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens do Firebase.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para criar mensagens padrão no Firebase
  const createDefaultMessages = async () => {
    if (!user?.email) return

    try {
      const messagesRef = collection(db, `parabenspravoce/${user?.email}/messages`)

      const defaultMessages = [
        {
          title: "Mensagem 1",
          content:
            "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
          type: "birthday",
        },
        {
          title: "Mensagem 2",
          content:
            "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
          type: "birthday",
        },
        {
          title: "Mensagem 3",
          content:
            "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
          type: "birthday",
        },
      ]

      // Adicionar cada mensagem padrão ao Firebase
      const addedMessages = []
      for (const message of defaultMessages) {
        const docRef = await addDoc(messagesRef, {
          title: message.title,
          content: message.content,
          type: message.type,
          createdAt: new Date(),
        })

        addedMessages.push({
          id: docRef.id,
          titulo: message.title,
          conteudo: message.content,
          type: message.type,
        })
      }

      setMensagens(addedMessages)

      toast({
        title: "Mensagens criadas",
        description: "Mensagens padrão foram criadas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao criar mensagens padrão:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar as mensagens padrão.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para editar mensagem
  const handleEditMessage = (mensagem: any) => {
    setEditingMessage(mensagem)
    setEditedContent(mensagem.conteudo)
    setIsEditModalOpen(true)
  }

  // Função para salvar mensagem editada no Firebase
  const handleSaveMessage = async () => {
    if (!editingMessage || !user?.email) return

    try {
      setIsSavingMessage(true)

      // Referência para o documento da mensagem
      const messageRef = doc(db, `parabenspravoce/${user?.email}/messages`, editingMessage.id)

      // Atualizar documento no Firebase
      await updateDoc(messageRef, {
        content: editedContent,
        updatedAt: new Date(),
      })

      // Atualizar estado local
      setMensagens(mensagens.map((msg) => (msg.id === editingMessage.id ? { ...msg, conteudo: editedContent } : msg)))

      toast({
        title: "Mensagem atualizada",
        description: "A mensagem foi atualizada com sucesso.",
      })

      setIsEditModalOpen(false)
    } catch (error) {
      console.error("Erro ao salvar mensagem:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações na mensagem.",
        variant: "destructive",
      })
    } finally {
      setIsSavingMessage(false)
    }
  }

  // Função para adicionar nova mensagem
  const addNewMessage = async (title: string, content: string, type = "birthday") => {
    if (!user?.email) return

    try {
      const messagesRef = collection(db, `parabenspravoce/${user?.email}/messages`)

      const docRef = await addDoc(messagesRef, {
        title,
        content,
        type,
        createdAt: new Date(),
      })

      const newMessage = {
        id: docRef.id,
        titulo: title,
        conteudo: content,
        type,
      }

      setMensagens([...mensagens, newMessage])

      return newMessage
    } catch (error) {
      console.error("Erro ao adicionar nova mensagem:", error)
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a nova mensagem.",
        variant: "destructive",
      })
      return null
    }
  }

  // Função para excluir mensagem
  const deleteMessage = async (messageId: string) => {
    if (!user?.email) return

    try {
      const messageRef = doc(db, `parabenspravoce/${user?.email}/messages`, messageId)
      await deleteDoc(messageRef)

      setMensagens(mensagens.filter((msg) => msg.id !== messageId))

      toast({
        title: "Mensagem excluída",
        description: "A mensagem foi excluída com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a mensagem.",
        variant: "destructive",
      })
    }
  }

  // Carregar mensagens ao montar o componente
  useEffect(() => {
    if (user?.email) {
      loadMessages()
    }
  }, [user])

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="mensagens" />

      {/* Main content */}
      <div className="flex-1 p-6 bg-[#faf7f0] ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Mensagens de Felicitações</h1>
          <p className="text-gray-600 mb-6">Crie, edite e envie mensagens personalizadas para datas especiais</p>

          {/* Message grid */}
          <h2 className="text-xl font-semibold text-[#1e3a29] mb-4">Modelos de Mensagens</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              <span className="ml-2">Carregando mensagens...</span>
            </div>
          ) : (
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
          )}
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
            <Button onClick={handleSaveMessage} className="bg-green-500 hover:bg-green-600" disabled={isSavingMessage}>
              {isSavingMessage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
