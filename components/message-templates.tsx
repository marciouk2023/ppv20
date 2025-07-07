"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { Pencil, Trash2, Plus, Loader2, MessageSquare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MessageTemplate {
  id: string
  title: string
  content: string
  type: string
  createdAt: Timestamp
}

export function MessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "birthday",
  })
  const { toast } = useToast()
  const { user } = useAuth()

  // Carregar templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!user?.email) return

      try {
        setIsLoading(true)
        const templatesRef = collection(db, `parabenspravoce/${user.email}/templates`)
        const snapshot = await getDocs(templatesRef)

        const loadedTemplates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MessageTemplate[]

        setTemplates(loadedTemplates)
      } catch (error) {
        console.error("Erro ao carregar templates:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os templates de mensagem.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [user, toast])

  // Abrir diálogo para adicionar template
  const openAddDialog = () => {
    setFormData({
      title: "",
      content: "",
      type: "birthday",
    })
    setEditingTemplate(null)
    setIsDialogOpen(true)
  }

  // Abrir diálogo para editar template
  const openEditDialog = (template: MessageTemplate) => {
    setFormData({
      title: template.title,
      content: template.content,
      type: template.type,
    })
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  // Abrir diálogo para confirmar exclusão
  const openDeleteDialog = (template: MessageTemplate) => {
    setTemplateToDelete(template)
    setIsDeleteDialogOpen(true)
  }

  // Manipular alterações nos campos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Manipular alteração no tipo
  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }))
  }

  // Salvar template
  const handleSaveTemplate = async () => {
    if (!user?.email) return
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo da mensagem.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      if (editingTemplate) {
        // Atualizar template existente
        const templateRef = doc(db, `parabenspravoce/${user.email}/templates`, editingTemplate.id)
        await updateDoc(templateRef, {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          updatedAt: Timestamp.now(),
        })

        // Atualizar estado local
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? {
                  ...t,
                  title: formData.title,
                  content: formData.content,
                  type: formData.type,
                }
              : t,
          ),
        )

        toast({
          title: "Template atualizado",
          description: "O template de mensagem foi atualizado com sucesso.",
        })
      } else {
        // Adicionar novo template
        const templatesRef = collection(db, `parabenspravoce/${user.email}/templates`)
        const docRef = await addDoc(templatesRef, {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          createdAt: Timestamp.now(),
        })

        // Atualizar estado local
        const newTemplate = {
          id: docRef.id,
          title: formData.title,
          content: formData.content,
          type: formData.type,
          createdAt: Timestamp.now(),
        }
        setTemplates((prev) => [...prev, newTemplate])

        toast({
          title: "Template adicionado",
          description: "O template de mensagem foi adicionado com sucesso.",
        })
      }

      // Fechar diálogo
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao salvar template:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template de mensagem.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Excluir template
  const handleDeleteTemplate = async () => {
    if (!user?.email || !templateToDelete) return

    try {
      setIsSubmitting(true)

      // Excluir do Firestore
      const templateRef = doc(db, `parabenspravoce/${user.email}/templates`, templateToDelete.id)
      await deleteDoc(templateRef)

      // Atualizar estado local
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))

      toast({
        title: "Template excluído",
        description: "O template de mensagem foi excluído com sucesso.",
      })

      // Fechar diálogo
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Erro ao excluir template:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o template de mensagem.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obter rótulo do tipo de mensagem
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "birthday":
        return "Aniversário"
      case "welcome":
        return "Boas-vindas"
      case "event":
        return "Evento"
      case "general":
        return "Geral"
      default:
        return type
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Templates de Mensagem</CardTitle>
            <CardDescription>Gerencie seus modelos de mensagem para diferentes ocasiões</CardDescription>
          </div>
          <Button className="bg-green-500 hover:bg-green-600" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="mb-2">Nenhum template de mensagem encontrado</p>
              <Button className="mt-2 bg-green-500 hover:bg-green-600" onClick={openAddDialog}>
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{template.title}</h3>
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {getTypeLabel(template.type)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openEditDialog(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => openDeleteDialog(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{template.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para adicionar/editar template */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Edite os detalhes do template de mensagem."
                : "Crie um novo template de mensagem para usar em suas comunicações."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Título
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Aniversário</SelectItem>
                  <SelectItem value="welcome">Boas-vindas</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">
                Conteúdo
              </Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                className="col-span-3 min-h-[150px]"
              />
            </div>
            <div className="col-span-4 text-xs text-gray-500">
              <p>
                Dica: Use {"{nome}"} para incluir o nome do contato na mensagem. Exemplo: "Olá {"{nome}"}, tudo bem?"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button className="bg-green-500 hover:bg-green-600" onClick={handleSaveTemplate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este template de mensagem? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {templateToDelete && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <h4 className="font-medium">{templateToDelete.title}</h4>
                <p className="text-sm text-gray-700 mt-1 line-clamp-3">{templateToDelete.content}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
