"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, orderBy, addDoc, Timestamp, doc, where, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Send, Users, Loader2, Search } from "lucide-react"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { personalizeMessage, generateMessageExample } from "@/utils/message-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { checkUserSession } from "@/lib/session-manager"
import { MessageTemplates } from "@/components/message-templates"

interface Contact {
  id: string
  nome: string
  telefone: string
  data_de_nascimento: string
  diasParaAniversario?: number
  imagem?: string
  grupo?: string
}

interface ScheduledCampaign {
  id: string
  message: string
  contactId: string
  contactName: string
  contactPhone: string
  isSpecificMessage: boolean
  status: string
  createdAt: Date
}

export default function AgendamentoPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [message, setMessage] = useState("")
  const [usePersonalization, setUsePersonalization] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [todaysBirthdays, setTodaysBirthdays] = useState<Contact[]>([])
  const [isSendingToday, setIsSendingToday] = useState(false)
  const [scheduledCampaigns, setScheduledCampaigns] = useState<ScheduledCampaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [activeTab, setActiveTab] = useState("contacts")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [showTodayDialog, setShowTodayDialog] = useState(false)
  const [sendingTodayMessages, setSendingTodayMessages] = useState(false)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  // Load contacts when component mounts
  useEffect(() => {
    if (user?.email) {
      console.log("Iniciando carregamento de dados do Firebase")
      loadContacts()
      loadScheduledCampaigns()
    } else {
      console.log("Usuário não autenticado, não é possível carregar contatos")
    }
  }, [user])

  // Filter contacts when search term or selected groups change
  useEffect(() => {
    filterContacts()
  }, [searchTerm, selectedGroups, contacts])

  // Function to load scheduled campaigns from Firebase
  const loadScheduledCampaigns = async () => {
    if (!user?.email) return

    try {
      setLoadingCampaigns(true)
      const campaignsRef = collection(db, `parabenspravoce/${user.email}/campaigns`)

      try {
        // Try to execute the query that requires an index
        const q = query(campaignsRef, where("status", "==", "scheduled"), orderBy("createdAt", "desc"))
        const snapshot = await getDocs(q)

        const campaigns = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            message: data.message || "",
            contactId: data.contactId || "",
            contactName: data.contactName || "Contato não especificado",
            contactPhone: data.contactPhone || "",
            isSpecificMessage: data.isSpecificMessage || false,
            status: data.status || "scheduled",
            createdAt: data.createdAt?.toDate() || new Date(),
          }
        })

        setScheduledCampaigns(campaigns)
      } catch (indexError) {
        // If the error is about missing index, provide a helpful message
        console.error("Erro de índice no Firestore:", indexError)

        // Fallback to a simpler query that doesn't require an index
        // Just get all campaigns and filter in memory
        const simpleQuery = query(campaignsRef)
        const snapshot = await getDocs(simpleQuery)

        const campaigns = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              message: data.message || "",
              contactId: data.contactId || "",
              contactName: data.contactName || "Contato não especificado",
              contactPhone: data.contactPhone || "",
              isSpecificMessage: data.isSpecificMessage || false,
              status: data.status || "scheduled",
              createdAt: data.createdAt?.toDate() || new Date(),
            }
          })
          .filter((campaign) => campaign.status === "scheduled")
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        setScheduledCampaigns(campaigns)

        // Show toast with error message and link
        toast({
          title: "Erro de índice no Firestore",
          description: "É necessário criar um índice para esta consulta. Clique no link no console para criar.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading scheduled campaigns:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens agendadas.",
        variant: "destructive",
      })
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // Function to cancel a scheduled message
  const cancelScheduledMessage = async (campaignId: string) => {
    if (!user?.email) return

    try {
      // Delete the campaign from Firebase
      const campaignDocRef = doc(db, `parabenspravoce/${user.email}/campaigns`, campaignId)
      await deleteDoc(campaignDocRef)

      // Update the local state
      setScheduledCampaigns((prevCampaigns) => prevCampaigns.filter((campaign) => campaign.id !== campaignId))

      toast({
        title: "Mensagem cancelada",
        description: "A mensagem agendada foi cancelada com sucesso.",
      })
    } catch (error) {
      console.error("Error cancelling scheduled message:", error)
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a mensagem agendada. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  // Function to load contacts from Firestore
  const loadContacts = async () => {
    if (!user?.email) return

    try {
      setLoading(true)
      console.log(`Carregando contatos do Firebase para o usuário: ${user.email}`)

      // Referência específica para a coleção de usuários do usuário atual
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
      const q = query(contactsRef, orderBy("nome"))
      const snapshot = await getDocs(q)

      console.log(`Encontrados ${snapshot.docs.length} contatos no Firebase`)

      const loadedContacts = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          nome: data.nome || "",
          telefone: data.telefone || "",
          data_de_nascimento: data.data_de_nascimento || "",
          imagem: data.imagem || "",
          grupo: data.grupo || "Geral",
        }
      }) as Contact[]

      // Calculate days until birthday for each contact
      const contactsWithDays = loadedContacts.map((contact) => ({
        ...contact,
        diasParaAniversario: calcularDiasParaAniversario(contact.data_de_nascimento),
      }))

      setContacts(contactsWithDays)

      // Extract unique groups
      const groups = Array.from(new Set(loadedContacts.map((contact) => contact.grupo || "Geral")))
      setAvailableGroups(groups)

      // Find today's birthdays
      const today = new Date()
      const todayDay = today.getDate()
      const todayMonth = today.getMonth() + 1
      const currentMonth = today.getMonth() + 1

      const birthdays = contactsWithDays.filter((contact) => {
        if (!contact.data_de_nascimento) return false

        let birthDay, birthMonth
        if (contact.data_de_nascimento.includes("/")) {
          ;[birthDay, birthMonth] = contact.data_de_nascimento.split("/").map(Number)
        } else {
          const date = new Date(contact.data_de_nascimento)
          birthDay = date.getDate()
          birthMonth = date.getMonth() + 1
        }

        return birthDay === todayDay && birthMonth === currentMonth
      })

      setTodaysBirthdays(birthdays)

      // Aplicar filtros iniciais
      filterContacts()

      console.log("Contatos carregados com sucesso do Firebase")
    } catch (error) {
      console.error("Erro ao carregar contatos do Firebase:", error)
      toast({
        title: "Erro ao carregar contatos",
        description: "Não foi possível carregar os contatos do Firebase. Verifique sua conexão.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to filter contacts based on search term and selected groups
  const filterContacts = () => {
    let filtered = contacts

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((contact) => contact.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Filter by selected groups
    if (selectedGroups.length > 0) {
      filtered = filtered.filter((contact) => selectedGroups.includes(contact.grupo || "Geral"))
    }

    // Sort by birthday priority: today, tomorrow, then days until birthday
    filtered = [...filtered].sort((a, b) => {
      const daysA = a.diasParaAniversario !== undefined ? a.diasParaAniversario : 365
      const daysB = b.diasParaAniversario !== undefined ? b.diasParaAniversario : 365

      // Today's birthdays have highest priority
      if (daysA === 0 && daysB !== 0) return -1
      if (daysA !== 0 && daysB === 0) return 1

      // Tomorrow's birthdays have second priority
      if (daysA === 1 && daysB !== 1) return -1
      if (daysA !== 1 && daysB === 1) return 1

      // Otherwise sort by days until birthday
      return daysA - daysB
    })

    setFilteredContacts(filtered)
  }

  // Function to calculate days until birthday
  const calcularDiasParaAniversario = (dataNascimento: string): number => {
    if (!dataNascimento) return 365 // Default to end of list if no date

    // Get today's date
    const hoje = new Date()
    const todayDay = hoje.getDate()
    const todayMonth = hoje.getMonth() + 1

    // Check if date is in DD/MM/YYYY format
    let birthDay, birthMonth
    if (dataNascimento.includes("/")) {
      ;[birthDay, birthMonth] = dataNascimento.split("/").map(Number)
    } else {
      const nascimento = new Date(dataNascimento)
      birthDay = nascimento.getDate()
      birthMonth = nascimento.getMonth() + 1
    }

    // If invalid date, return default
    if (isNaN(birthDay) || isNaN(birthMonth)) return 365

    // Check if today is the birthday (same day and month)
    if (birthDay === todayDay && birthMonth === todayMonth) {
      return 0 // It's today!
    }

    // Set year to current year
    const proximoAniversario = new Date(hoje.getFullYear(), birthMonth - 1, birthDay)

    // If birthday has passed this year, set the year to next year
    if (hoje > proximoAniversario) {
      proximoAniversario.setFullYear(hoje.getFullYear() + 1)
    }

    // Calculate difference in days
    const diffTempo = proximoAniversario.getTime() - hoje.getTime()
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24))

    return diffDias
  }

  // Function to format date
  const formatarData = (dataString: string): string => {
    if (!dataString) return ""

    // Check if date is in DD/MM/YYYY format
    if (dataString.includes("/")) {
      return dataString.substring(0, 5) // Return only DD/MM
    }

    try {
      const data = new Date(dataString)
      return `${data.getDate().toString().padStart(2, "0")}/${(data.getMonth() + 1).toString().padStart(2, "0")}`
    } catch (error) {
      return ""
    }
  }

  // Toggle contact selection
  const toggleContactSelection = (contactId: string) => {
    setSelectedContact(selectedContact === contactId ? null : contactId)
  }

  // Toggle group selection
  const toggleGroupSelection = (group: string) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== group))
    } else {
      setSelectedGroups([...selectedGroups, group])
    }
  }

  // Schedule messages
  const handleScheduleMessage = async () => {
    if (!user?.email || !message || !selectedContact) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione um contato.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Get selected contact data
      const selectedContactData = contacts.find((contact) => contact.id === selectedContact)

      if (!selectedContactData) {
        toast({
          title: "Contato inválido",
          description: "O contato selecionado não foi encontrado.",
          variant: "destructive",
        })
        return
      }

      // Create campaign in Firebase with the new structure
      const campaignsRef = collection(db, `parabenspravoce/${user.email}/campaigns`)
      await addDoc(campaignsRef, {
        createdAt: Timestamp.now(),
        status: "scheduled",
        message,
        usePersonalization,
        contactId: selectedContactData.id, // Store the contact ID for future reference
        contactName: selectedContactData.nome,
        contactPhone: selectedContactData.telefone,
        isSpecificMessage: true, // Flag to indicate this is a specific message for this contact
        createdBy: user.email,
        // We don't set a specific time here as we'll use the global time from settings
      })

      toast({
        title: "Mensagem agendada",
        description: `A mensagem foi agendada com sucesso para ${selectedContactData.nome} e será enviada no horário configurado.`,
      })

      // Reset form
      setSelectedContact(null)
      setSelectedGroups([])
      setMessage("") // Clear the message input

      // Reload scheduled campaigns
      loadScheduledCampaigns()

      // Switch to the scheduled tab to show the user their scheduled message
      setActiveTab("scheduled")
    } catch (error) {
      console.error("Error scheduling messages:", error)
      toast({
        title: "Erro",
        description: "Não foi possível agendar a mensagem. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open dialog to send messages to today's birthdays
  const openSendTodayDialog = () => {
    if (todaysBirthdays.length === 0) {
      toast({
        title: "Sem aniversariantes hoje",
        description: "Não há contatos fazendo aniversário hoje.",
      })
      return
    }

    setShowTodayDialog(true)
  }

  // Send messages to today's birthdays
  const sendTodaysBirthdayMessages = async () => {
    if (!user?.email || todaysBirthdays.length === 0) {
      toast({
        title: "Sem aniversariantes",
        description: "Não há contatos fazendo aniversário hoje.",
      })
      return
    }

    setSendingTodayMessages(true)
    setWhatsappError(null)

    try {
      // Check if user has an active WhatsApp session
      const sessionInfo = await checkUserSession(user.email)

      if (!sessionInfo.hasSession || !sessionInfo.sessionName) {
        setWhatsappError("Você precisa conectar seu WhatsApp na página de configurações antes de enviar mensagens.")
        setSendingTodayMessages(false)
        return
      }

      let successCount = 0
      let errorCount = 0

      // Send messages to each birthday contact
      for (const contact of todaysBirthdays) {
        if (!contact.telefone) {
          errorCount++
          continue
        }

        try {
          // Get a random message from the list
          // Personalize message if enabled
          const finalMessage = usePersonalization
            ? personalizeMessage("Feliz Aniversário {nome}!", contact.nome, true)
            : "Feliz Aniversário!"

          // Send message using WhatsApp API
          const response = await fetch("/api/whatsapp/send-message", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phoneNumber: contact.telefone,
              message: finalMessage,
              sessionName: sessionInfo.sessionName,
            }),
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          console.error(`Error sending message to ${contact.nome}:`, error)
          errorCount++
        }
      }

      // Show success message
      if (successCount > 0) {
        toast({
          title: "Mensagens enviadas",
          description: `${successCount} mensagens foram enviadas com sucesso.${errorCount > 0 ? ` ${errorCount} mensagens falharam.` : ""}`,
        })
      } else {
        toast({
          title: "Falha no envio",
          description: "Não foi possível enviar as mensagens. Verifique a conexão do WhatsApp.",
          variant: "destructive",
        })
      }

      // Close dialog
      setShowTodayDialog(false)
    } catch (error) {
      console.error("Error sending birthday messages:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar as mensagens. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSendingTodayMessages(false)
    }
  }

  interface SVGSVGProps extends React.SVGProps<SVGSVGElement> {}

  function Check(props: SVGSVGProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }

  function Info(props: SVGSVGProps) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="agendamento" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-2">Agendamento de Mensagens</h1>
          <p className="text-gray-600 mb-6">
            Agende mensagens para serem enviadas automaticamente em datas específicas.
          </p>

          {/* Main tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Agendar Mensagens
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Mensagens Agendadas
              </TabsTrigger>
            </TabsList>

            {/* Contacts tab content */}

            <TabsContent value="contacts" className="space-y-6">
              <div className="grid grid-cols-10 gap-4">
                {/* Contact selection card - 40% de largura */}
                <div className="col-span-10 lg:col-span-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-500" />
                        Selecionar Contato
                      </CardTitle>
                      <CardDescription>Escolha o contato para enviar a mensagem de aniversário</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Search and filters */}
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar contatos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableGroups.map((group) => (
                            <Button
                              key={group}
                              variant={selectedGroups.includes(group) ? "default" : "outline"}
                              size="sm"
                              className={selectedGroups.includes(group) ? "bg-green-500 hover:bg-green-600" : ""}
                              onClick={() => toggleGroupSelection(group)}
                            >
                              {group}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Contacts list */}
                      <div className="border rounded-md">
                        <div className="p-3 border-b bg-gray-50 flex items-center">
                          <div className="flex items-center space-x-2">{/* REMOVING SELECT ALL CHECKBOX */}</div>
                          <div className="ml-auto text-sm text-gray-500">
                            {filteredContacts.length} contatos encontrados
                          </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                          {loading ? (
                            <div className="flex justify-center items-center py-8">
                              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                            </div>
                          ) : filteredContacts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              Nenhum contato encontrado para os filtros selecionados.
                            </div>
                          ) : (
                            <div className="divide-y">
                              {filteredContacts.map((contact) => (
                                <div
                                  key={contact.id}
                                  className={`flex items-center p-3 hover:bg-gray-50 ${
                                    contact.diasParaAniversario === 0
                                      ? "bg-green-100 border-l-4 border-green-500"
                                      : contact.diasParaAniversario === 1
                                        ? "bg-blue-100 border-l-4 border-blue-400"
                                        : contact.diasParaAniversario !== undefined && contact.diasParaAniversario <= 7
                                          ? "bg-blue-50 border-l-2 border-blue-300"
                                          : ""
                                  }`}
                                >
                                  <Checkbox
                                    id={`contact-${contact.id}`}
                                    checked={selectedContact === contact.id}
                                    onCheckedChange={() => toggleContactSelection(contact.id)}
                                    disabled={!contact.telefone}
                                  />
                                  <label
                                    htmlFor={`contact-${contact.id}`}
                                    className="ml-2 flex-1 cursor-pointer flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Contact image or initial */}
                                      <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                                        {contact.imagem ? (
                                          <img
                                            src={contact.imagem || "/placeholder.svg"}
                                            alt={contact.nome}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div
                                            className={`h-full w-full flex items-center justify-center bg-orange-200 text-orange-600`}
                                          >
                                            <span className="text-sm font-medium">
                                              {contact.nome ? contact.nome.charAt(0).toUpperCase() : "?"}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-medium">{contact.nome}</div>
                                        {contact.telefone ? (
                                          <div className="text-sm text-gray-500">{contact.telefone}</div>
                                        ) : (
                                          <div className="text-sm text-red-500">Sem telefone</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="text-xs px-2 py-1 rounded-full bg-gray-100 mr-2">
                                        {contact.grupo || "Geral"}
                                      </div>
                                      <div className="flex items-center text-xs">
                                        <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                        {contact.diasParaAniversario === 0 ? (
                                          <span className="text-green-600 font-bold text-sm">HOJE!</span>
                                        ) : contact.diasParaAniversario === 1 ? (
                                          <span className="text-blue-600 font-bold text-sm">AMANHÃ!</span>
                                        ) : contact.diasParaAniversario !== undefined ? (
                                          <span>
                                            {formatarData(contact.data_de_nascimento)}{" "}
                                            <span className="font-bold">(em {contact.diasParaAniversario} dias)</span>
                                          </span>
                                        ) : (
                                          <span>Sem data</span>
                                        )}
                                      </div>
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Message and scheduling card - 60% de largura */}
                <div className="col-span-10 lg:col-span-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium flex items-center">
                        <Send className="h-5 w-5 mr-2 text-purple-500" />
                        Mensagem e Agendamento
                      </CardTitle>
                      <CardDescription>Personalize a mensagem e defina a data de envio</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Message input */}
                      <div className="space-y-2">
                        <Label htmlFor="message">Texto da Mensagem</Label>
                        <Textarea
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="mt-1 min-h-[120px]"
                          placeholder="Digite sua mensagem de aniversário aqui... Use {nome} para personalizar com o nome do contato."
                        />
                        <p className="text-xs text-gray-500">
                          Use {"{nome}"} para incluir o nome do contato na mensagem.
                        </p>
                      </div>

                      {/* Personalization toggle */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="personalization"
                          checked={usePersonalization}
                          onCheckedChange={setUsePersonalization}
                        />
                        <Label htmlFor="personalization">Personalizar com nome do contato</Label>
                      </div>

                      {/* Message preview */}
                      {usePersonalization && (
                        <div className="bg-gray-50 p-3 rounded-md border text-sm">
                          <p className="font-medium mb-1">Exemplo de personalização:</p>
                          <p className="text-gray-600">{generateMessageExample(message).personalized}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full bg-green-500 hover:bg-green-600"
                        onClick={handleScheduleMessage}
                        disabled={isSubmitting || !message || !selectedContact}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Agendando...
                          </>
                        ) : (
                          <>
                            <Calendar className="mr-2 h-4 w-4" />
                            Agendar Mensagem Personalizada
                          </>
                        )}
                      </Button>
                      <p className="w-full text-xs text-gray-500 mt-2 text-center">
                        A mensagem será enviada no horário configurado em Configurações
                      </p>
                    </CardFooter>
                  </Card>
                </div>

                {/* Random Messages Card - 100% de largura */}
                <div className="col-span-10 mt-4">
                  <MessageTemplates />
                </div>
              </div>
            </TabsContent>

            {/* Scheduled messages tab content */}
            <TabsContent value="scheduled" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    Mensagens Agendadas
                  </CardTitle>
                  <CardDescription>Visualize e gerencie suas mensagens personalizadas agendadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCampaigns ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                    </div>
                  ) : scheduledCampaigns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Nenhuma mensagem agendada</p>
                      <p className="text-sm mt-1">Agende mensagens na aba "Agendar Mensagens"</p>
                      <Button className="mt-4 bg-green-500 hover:bg-green-600" onClick={() => setActiveTab("contacts")}>
                        Agendar Mensagens
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduledCampaigns.map((campaign) => (
                        <div key={campaign.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">Mensagem para: {campaign.contactName}</span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Será enviada no horário configurado em Configurações
                              </div>
                            </div>
                            <div className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              Agendada
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md border mb-3">
                            <p className="text-sm">{campaign.message}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              Criada em: {format(campaign.createdAt, "dd/MM/yyyy HH:mm")}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => cancelScheduledMessage(campaign.id)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Message Dialog */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Mensagem</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={""}
              onChange={() => {}}
              className="min-h-[150px]"
              placeholder="Digite a mensagem aqui..."
            />
            <p className="text-xs text-gray-500 mt-2">Use {"{nome}"} para incluir o nome do contato na mensagem.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {}} disabled={false}>
              Cancelar
            </Button>
            <Button onClick={() => {}} disabled={false} className="bg-green-500 hover:bg-green-600">
              {false ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
