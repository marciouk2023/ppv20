"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db, storage } from "@/lib/firebase-config"
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useForm, Controller } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UserPlus, Pencil, Trash2, Loader2, Search, Upload, AlertCircle, User } from "lucide-react"

// Add this import at the top of the file
import { isBirthdayThisMonth, daysUntilBirthday } from "@/utils/date-utils"

// Define the Contact interface
interface Contact {
  id: string
  imagem: string
  nome: string
  telefone: string
  data_de_nascimento: string
}

// Form data interface
interface ContactFormData {
  imagem: string
  nome: string
  telefone: string
  data_de_nascimento: string
}

// Função para converter data do formato DD/MM/AAAA para YYYY-MM-DD (formato ISO)
const convertToISODate = (europeanDate: string): string => {
  if (!europeanDate) return ""

  // Verifica se já está no formato ISO
  if (europeanDate.includes("-")) return europeanDate

  const parts = europeanDate.split("/")
  if (parts.length !== 3) return europeanDate

  // Converte de DD/MM/AAAA para YYYY-MM-DD
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

export default function ContactManagementPage() {
  // State variables
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentContact, setCurrentContact] = useState<Contact | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState("todos")

  // Hooks
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // React Hook Form setup for add/edit form
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    defaultValues: {
      imagem: "",
      nome: "",
      telefone: "",
      data_de_nascimento: "",
    },
  })

  // Effect to redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  // Effect to load contacts when component mounts
  useEffect(() => {
    if (user?.email) {
      loadContacts()
    }
  }, [user])

  // Function to load contacts from Firestore
  const loadContacts = async () => {
    if (!user?.email) return

    setLoading(true)
    try {
      // Create the collection reference with the correct path
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)

      // Query the collection, ordered by name
      const q = query(contactsRef, orderBy("nome"))
      const snapshot = await getDocs(q)

      // Map the documents to our Contact interface
      const loadedContacts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Contact[]

      setContacts(loadedContacts)

      toast({
        title: "Contatos carregados",
        description: `${loadedContacts.length} contatos encontrados.`,
      })
    } catch (error) {
      console.error("Error loading contacts:", error)
      toast({
        title: "Erro ao carregar contatos",
        description: "Ocorreu um erro ao carregar seus contatos. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Vamos modificar a função handleImageUpload para corrigir o problema de upload

  // Substitua a função handleImageUpload atual por esta versão atualizada:
  const handleImageUpload = async (file: File): Promise<string> => {
    if (!user?.email) throw new Error("User not authenticated")

    setIsUploading(true)
    try {
      // Verificar se o usuário está autenticado e tem email
      if (!user.email) {
        throw new Error("Email do usuário não disponível para upload")
      }

      console.log("Iniciando upload para usuário:", user.email)

      // Create a reference to the file in Firebase Storage
      // Importante: o caminho deve corresponder exatamente ao que está nas regras
      const storageRef = ref(storage, `parabenspravoce/${user.email}/contact-images/${Date.now()}_${file.name}`)

      console.log("Referência de storage criada:", `parabenspravoce/${user.email}/contact-images/`)

      // Upload the file with metadata to ajudar com CORS e tipo de conteúdo
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user.email,
        },
      }

      // Upload the file with metadata
      const snapshot = await uploadBytes(storageRef, file, metadata)
      console.log("Upload realizado com sucesso:", snapshot.ref.fullPath)

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      console.log("URL de download obtida:", downloadURL)

      return downloadURL
    } catch (error) {
      console.error("Error uploading image:", error)
      // Mostrar mensagem de erro mais detalhada
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Log detalhado para depuração
      console.error("Detalhes do erro:", {
        errorCode: error instanceof Error && "code" in error ? (error as any).code : "unknown",
        errorMessage,
        userEmail: user?.email,
        authStatus: !!user,
      })

      toast({
        title: "Erro ao fazer upload da imagem",
        description: `Falha no upload: ${errorMessage}. Verifique as regras do Firebase Storage.`,
        variant: "destructive",
      })
      throw new Error(`Failed to upload image: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Function to handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageUrl = await handleImageUpload(file)
      setValue("imagem", imageUrl)

      toast({
        title: "Imagem carregada",
        description: "A imagem foi carregada com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro ao carregar imagem",
        description: "Ocorreu um erro ao carregar a imagem. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Function to add a new contact
  const addContact = async (data: ContactFormData) => {
    if (!user?.email) return

    try {
      // Create the collection reference - ensure we're using Firebase and not localStorage
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)

      // Validate data before sending to Firebase
      if (!data.nome || !data.telefone || !data.data_de_nascimento) {
        throw new Error("Dados incompletos. Preencha todos os campos obrigatórios.")
      }

      // Add the document to Firebase (respecting security rules)
      const docRef = await addDoc(contactsRef, {
        ...data,
        createdAt: new Date(),
        userId: user.uid, // Add user ID for security rules validation
      })

      console.log("Contato adicionado ao Firebase com ID:", docRef.id)

      // Add the new contact to the state (local UI update only)
      setContacts((prev) => [...prev, { id: docRef.id, ...data }])

      // Close the dialog and reset the form
      setIsAddDialogOpen(false)
      reset()

      toast({
        title: "Contato adicionado ao Firebase",
        description: "O contato foi adicionado com sucesso ao banco de dados.",
      })
    } catch (error) {
      console.error("Error adding contact to Firebase:", error)
      toast({
        title: "Erro ao adicionar contato",
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao adicionar o contato ao Firebase. Verifique as regras de segurança.",
        variant: "destructive",
      })
    }
  }

  // Function to update an existing contact
  const updateContact = async (data: ContactFormData) => {
    if (!user?.email || !currentContact) return

    try {
      // Get the document reference
      const contactRef = doc(db, `parabenspravoce/${user.email}/users`, currentContact.id)

      // Update the document
      await updateDoc(contactRef, {
        ...data,
        updatedAt: new Date(),
      })

      // Update the contact in the state
      setContacts((prev) =>
        prev.map((contact) => (contact.id === currentContact.id ? { ...contact, ...data } : contact)),
      )

      // Close the dialog and reset the form
      setIsEditDialogOpen(false)
      setCurrentContact(null)
      reset()

      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso.",
      })
    } catch (error) {
      console.error("Error updating contact:", error)
      toast({
        title: "Erro ao atualizar contato",
        description: "Ocorreu um erro ao atualizar o contato. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Function to delete a contact
  const deleteContact = async () => {
    if (!user?.email || !currentContact) return

    try {
      // Get the document reference
      const contactRef = doc(db, `parabenspravoce/${user.email}/users`, currentContact.id)

      // Delete the document
      await deleteDoc(contactRef)

      // Remove the contact from the state
      setContacts((prev) => prev.filter((contact) => contact.id !== currentContact.id))

      // Close the dialog and reset the current contact
      setIsDeleteDialogOpen(false)
      setCurrentContact(null)

      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso.",
      })
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast({
        title: "Erro ao excluir contato",
        description: "Ocorreu um erro ao excluir o contato. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Function to open the edit dialog
  const openEditDialog = (contact: Contact) => {
    setCurrentContact(contact)

    // Set the form values
    setValue("imagem", contact.imagem)
    setValue("nome", contact.nome)
    setValue("telefone", contact.telefone)
    setValue("data_de_nascimento", contact.data_de_nascimento)

    setIsEditDialogOpen(true)
  }

  // Function to open the delete dialog
  const openDeleteDialog = (contact: Contact) => {
    setCurrentContact(contact)
    setIsDeleteDialogOpen(true)
  }

  // Function to format the date of birth
  const formatDateOfBirth = (dateString: string) => {
    // Check if the date is already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString
    }

    // Try to parse the date
    try {
      const date = new Date(dateString)
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
    } catch (error) {
      return dateString // Return the original string if parsing fails
    }
  }

  // Filter contacts based on search term and active tab
  const filteredContacts = contacts
    .filter((contact) => {
      const matchesSearch =
        contact.nome.toLowerCase().includes(searchTerm.toLowerCase()) || contact.telefone.includes(searchTerm)

      if (activeTab === "todos") {
        return matchesSearch
      } else if (activeTab === "aniversariantes") {
        return matchesSearch && isBirthdayThisMonth(contact.data_de_nascimento)
      }

      return matchesSearch
    })
    .sort((a, b) => {
      // If on birthdays tab, sort by days until birthday
      if (activeTab === "aniversariantes") {
        return daysUntilBirthday(a.data_de_nascimento) - daysUntilBirthday(b.data_de_nascimento)
      }

      // Otherwise sort by name
      return a.nome.localeCompare(b.nome)
    })

  // If user is not authenticated, show loading state
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <span className="ml-2">Verificando autenticação...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="contatos" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-2">Gerenciamento de Contatos</h1>
          <p className="text-gray-600 mb-6">
            Adicione, edite e gerencie seus contatos para envio de mensagens personalizadas.
          </p>

          {/* Search and Add Contact */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="relative w-full md:w-auto md:flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar contatos..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="bg-green-500 hover:bg-green-600 w-full md:w-auto"
              onClick={() => {
                reset() // Reset the form
                setIsAddDialogOpen(true)
              }}
              title="Adicionar contato ao Firebase"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Contato
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="todos">Todos os Contatos</TabsTrigger>
              <TabsTrigger value="aniversariantes">Aniversariantes do Mês</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Contacts List */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Seus Contatos</CardTitle>
              <CardDescription>{filteredContacts.length} contatos encontrados</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                  <span className="ml-2">Carregando contatos...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum contato encontrado</h3>
                  <p className="text-gray-500">
                    {searchTerm
                      ? "Tente ajustar sua busca ou limpar os filtros."
                      : "Comece adicionando seu primeiro contato."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Foto</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Data de Nascimento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                              {contact.imagem ? (
                                <img
                                  src={contact.imagem || "/placeholder.svg"}
                                  alt={contact.nome}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gray-200">
                                  {isUploading ? (
                                    <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
                                  ) : (
                                    <User className="h-12 w-12 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{contact.nome}</TableCell>
                          <TableCell>{contact.telefone}</TableCell>
                          <TableCell>{formatDateOfBirth(contact.data_de_nascimento)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(contact)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:ml-2">Editar</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 border-red-200 hover:bg-red-50"
                                onClick={() => openDeleteDialog(contact)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:ml-2">Excluir</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Contato</DialogTitle>
            <DialogDescription>Preencha os dados do contato abaixo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(addContact)}>
            <div className="grid gap-4 py-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 relative">
                  <Controller
                    name="imagem"
                    control={control}
                    render={({ field }) => (
                      <>
                        {field.value ? (
                          <img
                            src={field.value || "/placeholder.svg"}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-200">
                            {isUploading ? (
                              <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
                            ) : (
                              <User className="h-12 w-12 text-gray-400" />
                            )}
                          </div>
                        )}
                        <input type="hidden" {...field} />
                      </>
                    )}
                  />
                  <label
                    htmlFor="image-upload"
                    className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {isUploading ? "Carregando..." : "Clique para adicionar uma foto"}
                </span>
              </div>

              {/* Name */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nome" className="text-right">
                  Nome
                </Label>
                <div className="col-span-3">
                  <Controller
                    name="nome"
                    control={control}
                    rules={{ required: "Nome é obrigatório" }}
                    render={({ field }) => <Input id="nome" {...field} />}
                  />
                  {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                </div>
              </div>

              {/* Phone */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telefone" className="text-right">
                  Telefone
                </Label>
                <div className="col-span-3">
                  <Controller
                    name="telefone"
                    control={control}
                    rules={{ required: "Telefone é obrigatório" }}
                    render={({ field }) => <Input id="telefone" {...field} placeholder="+55 00 00000-0000" />}
                  />
                  {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data_de_nascimento" className="text-right">
                  Data de Nascimento
                </Label>
                <div className="col-span-3">
                  <Controller
                    name="data_de_nascimento"
                    control={control}
                    rules={{ required: "Data de nascimento é obrigatória" }}
                    render={({ field: { onChange, value, ...fieldProps } }) => (
                      <Input
                        id="data_de_nascimento"
                        type="date"
                        {...fieldProps}
                        value={value ? (value.includes("/") ? convertToISODate(value) : value) : ""}
                        onChange={(e) => {
                          const isoDate = e.target.value
                          if (isoDate) {
                            const parts = isoDate.split("-")
                            if (parts.length === 3) {
                              const europeanDate = `${parts[2]}/${parts[1]}/${parts[0]}`
                              onChange(europeanDate)
                            } else {
                              onChange(isoDate)
                            }
                          } else {
                            onChange("")
                          }
                        }}
                      />
                    )}
                  />
                  {errors.data_de_nascimento && (
                    <p className="text-red-500 text-xs mt-1">{errors.data_de_nascimento.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Formato: DD/MM/AAAA (ex: 01/01/1990)</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Adicionar Contato"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>Atualize os dados do contato abaixo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(updateContact)}>
            <div className="grid gap-4 py-4">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 relative">
                  <Controller
                    name="imagem"
                    control={control}
                    render={({ field }) => (
                      <>
                        {field.value ? (
                          <img
                            src={field.value || "/placeholder.svg"}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-200">
                            {isUploading ? (
                              <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
                            ) : (
                              <User className="h-12 w-12 text-gray-400" />
                            )}
                          </div>
                        )}
                        <input type="hidden" {...field} />
                      </>
                    )}
                  />
                  <label
                    htmlFor="image-upload-edit"
                    className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                  </label>
                  <input
                    id="image-upload-edit"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {isUploading ? "Carregando..." : "Clique para alterar a foto"}
                </span>
              </div>

              {/* Name */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nome-edit" className="text-right">
                  Nome
                </Label>
                <div className="col-span-3">
                  <Controller
                    name="nome"
                    control={control}
                    rules={{ required: "Nome é obrigatório" }}
                    render={({ field }) => <Input id="nome-edit" {...field} />}
                  />
                  {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                </div>
              </div>

              {/* Phone */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telefone-edit" className="text-right">
                  Telefone
                </Label>
                <div className="col-span-3">
                  <Controller
                    name="telefone"
                    control={control}
                    rules={{ required: "Telefone é obrigatório" }}
                    render={({ field }) => <Input id="telefone-edit" {...field} placeholder="+55 00 00000-0000" />}
                  />
                  {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data_de_nascimento-edit" className="text-right">
                  Data de Nascimento
                </Label>
                <div className="col-span-3">
                  <Controller
                    name="data_de_nascimento"
                    control={control}
                    rules={{ required: "Data de nascimento é obrigatória" }}
                    render={({ field: { onChange, value, ...fieldProps } }) => (
                      <Input
                        id="data_de_nascimento-edit"
                        type="date"
                        {...fieldProps}
                        value={value ? (value.includes("/") ? convertToISODate(value) : value) : ""}
                        onChange={(e) => {
                          // Quando o usuário seleciona uma data no seletor, o valor vem no formato ISO (YYYY-MM-DD)
                          const isoDate = e.target.value
                          if (isoDate) {
                            // Convertemos para o formato europeu (DD/MM/AAAA) para armazenar
                            const parts = isoDate.split("-")
                            if (parts.length === 3) {
                              const europeanDate = `${parts[2]}/${parts[1]}/${parts[0]}`
                              onChange(europeanDate)
                            } else {
                              onChange(isoDate)
                            }
                          } else {
                            onChange("")
                          }
                        }}
                      />
                    )}
                  />
                  {errors.data_de_nascimento && (
                    <p className="text-red-500 text-xs mt-1">{errors.data_de_nascimento.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Formato: DD/MM/AAAA (ex: 01/01/1990)</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600" disabled={isSubmitting || isUploading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {currentContact && (
            <div className="py-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                  {currentContact.imagem ? (
                    <img
                      src={currentContact.imagem || "/placeholder.svg"}
                      alt={currentContact.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-green-100 text-green-600">
                      {currentContact.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{currentContact.nome}</h3>
                  <p className="text-sm text-gray-500">{currentContact.telefone}</p>
                </div>
              </div>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>Esta ação excluirá permanentemente o contato e todos os seus dados.</AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={deleteContact}>
              Excluir Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
