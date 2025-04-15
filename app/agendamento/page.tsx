"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, Calendar, Clock, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface Contact {
  id: string
  nome: string
  dataNascimento: string
  diasParaAniversario?: number
  telefone?: string
  hasScheduledMessage?: boolean
}

export default function AgendamentoPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageType, setMessageType] = useState<"text" | "audio">("text")
  const [messageOption, setMessageOption] = useState<"random" | "custom">("random")
  const [customMessage, setCustomMessage] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()

  // Load contacts from Firebase
  useEffect(() => {
    const loadContacts = async () => {
      if (!user?.email) return

      try {
        setIsLoading(true)
        const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
        const q = query(contactsRef, orderBy("nome"))
        const snapshot = await getDocs(q)

        // Map documents to Contact interface
        const loadedContacts = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            nome: data.nome || "",
            dataNascimento: data.data_de_nascimento || "",
            telefone: data.telefone || "",
            hasScheduledMessage: !!data.scheduledMessage, // Verificar se tem mensagem agendada
          }
        }) as Contact[]

        // Log para depuração - verificar datas dos contatos mencionados
        console.log("Data atual:", new Date().toLocaleDateString())
        loadedContacts.forEach((contact) => {
          if (
            contact.nome.includes("Mas") ||
            contact.nome.includes("MSA") ||
            contact.nome.includes("MMM") ||
            contact.nome.includes("Marcinho")
          ) {
            console.log(`Contato: ${contact.nome}, Data: ${contact.dataNascimento}`)
          }
        })

        // Calculate days until birthday for each contact
        const contactsWithDays = loadedContacts.map((contact) => {
          // Calculate days until birthday correctly
          const days = calculateDaysUntilBirthday(contact.dataNascimento)

          // Log para depuração
          if (
            contact.nome.includes("Mas") ||
            contact.nome.includes("MSA") ||
            contact.nome.includes("MMM") ||
            contact.nome.includes("Marcinho")
          ) {
            console.log(`Contato: ${contact.nome}, Dias até aniversário: ${days}`)
          }

          return {
            ...contact,
            diasParaAniversario: days,
          }
        })

        // Sort by days until birthday
        const sortedContacts = contactsWithDays.sort(
          (a, b) => (a.diasParaAniversario || 365) - (b.diasParaAniversario || 365),
        )

        setContacts(sortedContacts)
      } catch (error) {
        console.error("Error loading contacts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadContacts()
  }, [user])

  // Verificar aniversariantes do dia e enviar mensagens automaticamente
  useEffect(() => {
    const checkTodaysBirthdays = async () => {
      if (!user?.email || !contacts.length) return

      try {
        // Verificar se há aniversariantes hoje
        const todaysBirthdays = contacts.filter((contact) => contact.diasParaAniversario === 0)

        if (todaysBirthdays.length > 0) {
          console.log(`[AutoCheck] Encontrados ${todaysBirthdays.length} aniversariantes hoje!`)

          // Verificar se já enviou mensagens hoje (opcional - implementar lógica para não enviar duplicado)
          // Aqui você pode adicionar uma verificação no Firestore para ver se já enviou hoje

          // Mensagens de aniversário pré-definidas
          const birthdayMessages = [
            "Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida.",
            "Parabéns pelo seu dia! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco!",
            "Felicitações pelo seu aniversário! Que este novo ciclo seja marcado por bênçãos e realizações. Estamos orando por você!",
          ]

          // Notificar o usuário sobre os aniversariantes
          toast({
            title: `${todaysBirthdays.length} aniversariantes hoje!`,
            description: "Clique em um contato para enviar uma mensagem personalizada.",
          })

          // Opcional: enviar automaticamente se configurado
          // Descomente o código abaixo para ativar o envio automático ao carregar a página
          /*
          for (const contact of todaysBirthdays) {
            if (!contact.telefone) continue;

            // Selecionar mensagem aleatória
            const randomIndex = Math.floor(Math.random() * birthdayMessages.length);
            let message = birthdayMessages[randomIndex];

            // Personalizar mensagem com o nome
            const firstName = contact.nome.split(" ")[0];
            message = message.replace(/{nome}/g, firstName);

            try {
              // Enviar mensagem via API
              await fetch("/api/whatsapp/send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phoneNumber: contact.telefone,
                  message: message,
                  userEmail: user.email
                })
              });

              console.log(`[AutoCheck] ✅ Mensagem enviada automaticamente para ${contact.nome}`);
            } catch (error) {
              console.error(`[AutoCheck] ❌ Erro ao enviar mensagem para ${contact.nome}:`, error);
            }
          }
          */
        }
      } catch (error) {
        console.error("[AutoCheck] Erro ao verificar aniversariantes:", error)
      }
    }

    checkTodaysBirthdays()
  }, [contacts, user, toast])

  // Add this function to correctly calculate days until birthday
  const calculateDaysUntilBirthday = (birthDateStr: string): number => {
    if (!birthDateStr) return 365

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Normalizar para início do dia

      // Extrair dia e mês da data de nascimento
      let day, month

      if (birthDateStr.includes("-")) {
        // Formato YYYY-MM-DD
        const parts = birthDateStr.split("-")
        month = Number.parseInt(parts[1], 10) - 1 // Mês em JavaScript é 0-indexed
        day = Number.parseInt(parts[2], 10)
      } else if (birthDateStr.includes("/")) {
        // Formato DD/MM/YYYY
        const parts = birthDateStr.split("/")
        day = Number.parseInt(parts[0], 10)
        month = Number.parseInt(parts[1], 10) - 1 // Mês em JavaScript é 0-indexed
      } else {
        return 365 // Formato inválido
      }

      // Verificar se é hoje
      const todayDay = today.getDate()
      const todayMonth = today.getMonth()

      if (day === todayDay && month === todayMonth) {
        return 0 // É aniversário hoje!
      }

      // Calcular para este ano
      const currentYear = today.getFullYear()
      const birthdayThisYear = new Date(currentYear, month, day)
      birthdayThisYear.setHours(0, 0, 0, 0)

      // Se já passou, calcular para o próximo ano
      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(currentYear + 1)
      }

      // Calcular diferença em dias
      const diffTime = birthdayThisYear.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return diffDays
    } catch (error) {
      console.error("Error calculating days until birthday:", error)
      return 365
    }
  }

  // Format date display
  const formatDateDisplay = (date: string, days: number | undefined) => {
    if (!date || days === undefined) return ""

    // Extract month and day from date string
    let day, month
    try {
      if (date.includes("-")) {
        const parts = date.split("-")
        month = parts[1]
        day = parts[2]
      } else if (date.includes("/")) {
        const parts = date.split("/")
        day = parts[0]
        month = parts[1]
      } else {
        return ""
      }

      // Ensure day and month are padded with leading zeros if needed
      day = day.padStart(2, "0")
      month = month.padStart(2, "0")

      // Verificar se hoje é 10/04 (ou qualquer data de aniversário)
      const today = new Date()
      const todayDay = today.getDate().toString().padStart(2, "0")
      const todayMonth = (today.getMonth() + 1).toString().padStart(2, "0")

      // Se o dia e mês corresponderem à data atual, mostrar "HOJE"
      if (day === todayDay && month === todayMonth) {
        return `${day}/${month} (HOJE)`
      } else if (days === 0) {
        // Caso o cálculo de dias indique que é hoje
        return `${day}/${month} (HOJE)`
      } else if (days === 1) {
        return `${day}/${month} (amanhã)`
      } else {
        return `${day}/${month} (em ${days} dias)`
      }
    } catch (error) {
      console.error("Error formatting date:", error)
      return ""
    }
  }

  // Get contact initial for avatar
  const getContactInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  // Handle scheduling message
  const handleScheduleMessage = async () => {
    if (!selectedContact || !user?.email) return

    try {
      setIsLoading(true)

      // Preparar a mensagem personalizada
      if (!customMessage.trim()) {
        throw new Error("Por favor, escreva uma mensagem personalizada.")
      }

      // Substituir {nome} pelo nome do contato
      const messageToSend = customMessage.replace(/{nome}/g, selectedContact.nome.split(" ")[0])

      console.log(
        `Agendando mensagem para ${selectedContact.nome} (${selectedContact.telefone || "sem telefone"}):`,
        messageToSend,
      )

      // Verificar se tem telefone
      if (!selectedContact.telefone) {
        throw new Error("Este contato não possui número de telefone cadastrado.")
      }

      // Armazenar a mensagem personalizada no Firebase para envio futuro
      const contactRef = doc(db, `parabenspravoce/${user.email}/users`, selectedContact.id)

      await updateDoc(contactRef, {
        scheduledMessage: messageToSend,
        scheduledAt: new Date(),
        messageStatus: "scheduled",
      })

      // Sucesso
      console.log(`Mensagem agendada com sucesso para ${selectedContact.nome}`)

      toast({
        title: "Mensagem agendada",
        description: `Mensagem personalizada agendada para o aniversário de ${selectedContact.nome}.`,
      })

      // Após o sucesso do agendamento, atualizar o contato na lista
      setContacts((prevContacts) =>
        prevContacts.map((c) => (c.id === selectedContact.id ? { ...c, hasScheduledMessage: true } : c)),
      )

      // Reset form
      setSelectedContact(null)
      setCustomMessage("")
    } catch (error) {
      console.error("Erro ao agendar mensagem:", error)
      toast({
        title: "Erro ao agendar mensagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="agendamento" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Agendamento de Mensagens</h1>
          <p className="text-gray-600 mb-6">Agende mensagens personalizadas para enviar em datas especiais</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Contacts list */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contatos por Data de Aniversário</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Nenhum contato encontrado</div>
                  ) : (
                    <>
                      {/* Aniversariantes de hoje */}
                      {contacts.filter((contact) => contact.diasParaAniversario === 0).length > 0 && (
                        <div className="bg-green-50 p-2">
                          <h3 className="text-sm font-medium text-green-800 px-2 py-1">
                            Hoje ({new Date().toLocaleDateString("pt-BR")})
                          </h3>
                          {contacts
                            .filter((contact) => contact.diasParaAniversario === 0)
                            .map((contact) => (
                              <div
                                key={contact.id}
                                className={`relative flex items-center gap-3 p-4 cursor-pointer hover:bg-green-100 border-l-4 
                                  ${
                                    contact.hasScheduledMessage
                                      ? "border-[#4ade80] bg-[#0f3024]/10"
                                      : "border-green-500"
                                  }`}
                                onClick={() => setSelectedContact(contact)}
                              >
                                <div className="absolute right-3 top-3">
                                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    HOJE
                                  </span>
                                  {contact.hasScheduledMessage && (
                                    <span className="ml-1 text-[#4ade80]">
                                      <CheckCircle2 className="h-5 w-5 inline-block" />
                                    </span>
                                  )}
                                </div>
                                <div className="h-10 w-10 rounded-full flex items-center justify-center text-center bg-green-100 text-green-600">
                                  {getContactInitial(contact.nome)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{contact.nome}</div>
                                  <div className="text-sm text-green-600 font-medium flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDateDisplay(contact.dataNascimento, contact.diasParaAniversario)}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Próximos 7 dias */}
                      {contacts.filter(
                        (contact) =>
                          contact.diasParaAniversario !== undefined &&
                          contact.diasParaAniversario > 0 &&
                          contact.diasParaAniversario <= 7,
                      ).length > 0 && (
                        <div className="bg-blue-50 p-2">
                          <h3 className="text-sm font-medium text-blue-800 px-2 py-1">Próximos 7 dias</h3>
                          {contacts
                            .filter(
                              (contact) =>
                                contact.diasParaAniversario !== undefined &&
                                contact.diasParaAniversario > 0 &&
                                contact.diasParaAniversario <= 7,
                            )
                            .sort((a, b) => (a.diasParaAniversario || 365) - (b.diasParaAniversario || 365))
                            .map((contact) => (
                              <div
                                key={contact.id}
                                className={`relative flex items-center gap-3 p-4 cursor-pointer 
                                  ${
                                    contact.hasScheduledMessage
                                      ? "hover:bg-[#0f3024]/10 bg-[#0f3024]/5"
                                      : "hover:bg-blue-100"
                                  }`}
                                onClick={() => setSelectedContact(contact)}
                              >
                                {contact.hasScheduledMessage && (
                                  <div className="absolute right-3 top-3">
                                    <span className="text-[#4ade80]">
                                      <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                  </div>
                                )}
                                <div
                                  className={`h-10 w-10 rounded-full flex items-center justify-center text-center 
                      ${contact.diasParaAniversario === 1 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                                >
                                  {getContactInitial(contact.nome)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{contact.nome}</div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDateDisplay(contact.dataNascimento, contact.diasParaAniversario)}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Próximo mês */}
                      {contacts.filter(
                        (contact) =>
                          contact.diasParaAniversario !== undefined &&
                          contact.diasParaAniversario > 7 &&
                          contact.diasParaAniversario <= 30,
                      ).length > 0 && (
                        <div className="p-2">
                          <h3 className="text-sm font-medium text-gray-800 px-2 py-1">Próximo mês</h3>
                          {contacts
                            .filter(
                              (contact) =>
                                contact.diasParaAniversario !== undefined &&
                                contact.diasParaAniversario > 7 &&
                                contact.diasParaAniversario <= 30,
                            )
                            .sort((a, b) => (a.diasParaAniversario || 365) - (b.diasParaAniversario || 365))
                            .map((contact) => (
                              <div
                                key={contact.id}
                                className={`relative flex items-center gap-3 p-4 cursor-pointer 
                                  ${
                                    contact.hasScheduledMessage
                                      ? "hover:bg-[#0f3024]/10 bg-[#0f3024]/5"
                                      : "hover:bg-gray-50"
                                  }`}
                                onClick={() => setSelectedContact(contact)}
                              >
                                {contact.hasScheduledMessage && (
                                  <div className="absolute right-3 top-3">
                                    <span className="text-[#4ade80]">
                                      <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                  </div>
                                )}
                                <div className="h-10 w-10 rounded-full flex items-center justify-center text-center bg-gray-100 text-gray-600">
                                  {getContactInitial(contact.nome)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{contact.nome}</div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDateDisplay(contact.dataNascimento, contact.diasParaAniversario)}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Demais contatos */}
                      {contacts.filter(
                        (contact) => contact.diasParaAniversario === undefined || contact.diasParaAniversario > 30,
                      ).length > 0 && (
                        <div className="p-2">
                          <h3 className="text-sm font-medium text-gray-800 px-2 py-1">Mais tarde</h3>
                          {contacts
                            .filter(
                              (contact) =>
                                contact.diasParaAniversario === undefined || contact.diasParaAniversario > 30,
                            )
                            .sort((a, b) => (a.diasParaAniversario || 365) - (b.diasParaAniversario || 365))
                            .slice(0, 5) // Limitar para não ficar muito grande
                            .map((contact) => (
                              <div
                                key={contact.id}
                                className={`relative flex items-center gap-3 p-4 cursor-pointer 
                                  ${
                                    contact.hasScheduledMessage
                                      ? "hover:bg-[#0f3024]/10 bg-[#0f3024]/5"
                                      : "hover:bg-gray-50"
                                  }`}
                                onClick={() => setSelectedContact(contact)}
                              >
                                {contact.hasScheduledMessage && (
                                  <div className="absolute right-3 top-3">
                                    <span className="text-[#4ade80]">
                                      <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                  </div>
                                )}
                                <div className="h-10 w-10 rounded-full flex items-center justify-center text-center bg-gray-100 text-gray-600">
                                  {getContactInitial(contact.nome)}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{contact.nome}</div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDateDisplay(contact.dataNascimento, contact.diasParaAniversario)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          {contacts.filter(
                            (contact) => contact.diasParaAniversario === undefined || contact.diasParaAniversario > 30,
                          ).length > 5 && (
                            <div className="text-center text-sm text-gray-500 p-2">
                              +{" "}
                              {contacts.filter(
                                (contact) =>
                                  contact.diasParaAniversario === undefined || contact.diasParaAniversario > 30,
                              ).length - 5}{" "}
                              mais contatos
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message scheduling form */}
            <Card className={`md:col-span-2 ${!selectedContact ? "hidden md:block" : ""}`}>
              {selectedContact ? (
                <>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">
                        Agendar Mensagem para {selectedContact.nome}
                        {selectedContact.diasParaAniversario === 0 && (
                          <span className="ml-2 text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            Aniversário HOJE!
                          </span>
                        )}
                        {selectedContact.hasScheduledMessage && (
                          <span className="ml-2 text-sm text-[#4ade80] bg-[#0f3024]/10 px-2 py-0.5 rounded-full flex items-center inline-flex">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mensagem agendada
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedContact(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Message type selection */}
                      <div>
                        <Label>Tipo de Mensagem</Label>
                        <Tabs
                          defaultValue="text"
                          value={messageType}
                          onValueChange={(value) => setMessageType(value as "text" | "audio")}
                          className="mt-2"
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="text">Mensagem de Texto</TabsTrigger>
                            <TabsTrigger value="audio">Mensagem de Áudio</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Message content selection */}
                      <RadioGroup
                        value={messageOption}
                        onValueChange={(value) => setMessageOption(value as "random" | "custom")}
                        className="mt-4"
                      >
                        <div className="flex items-start space-x-2 mb-4">
                          <RadioGroupItem value="random" id="random" className="mt-1" />
                          <div className="grid gap-1.5">
                            <Label htmlFor="random" className="font-medium">
                              Mensagem Aleatória
                            </Label>
                            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                              Feliz aniversário! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano
                              de vida.
                              <p className="mt-2 text-xs text-green-600 font-medium">
                                Esta mensagem será enviada automaticamente quando for o dia do aniversário do contato.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="custom" id="custom" className="mt-1" />
                          <div className="grid gap-1.5 w-full">
                            <Label htmlFor="custom" className="font-medium">
                              Mensagem Personalizada
                            </Label>
                            <Textarea
                              placeholder="Digite sua mensagem personalizada aqui..."
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              className="min-h-[100px]"
                              disabled={messageOption !== "custom"}
                            />
                          </div>
                        </div>
                      </RadioGroup>

                      {/* Action buttons */}
                      <div className="mt-4 p-3 bg-[#0f3024]/10 border border-[#0f3024]/20 rounded-md">
                        <p className="text-sm text-[#0f3024]">
                          <strong>Nota:</strong> A mensagem personalizada será armazenada e enviada automaticamente no
                          dia do aniversário do contato. Não é necessário estar online no dia para que a mensagem seja
                          enviada.
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setSelectedContact(null)}>
                          Cancelar
                        </Button>
                        <Button
                          className="bg-[#0f3024] hover:bg-[#0f3024]/90 text-[#4ade80]"
                          onClick={handleScheduleMessage}
                          disabled={
                            isLoading ||
                            messageOption !== "custom" || // Só habilita quando "custom" estiver selecionado
                            !customMessage.trim() ||
                            !selectedContact?.telefone
                          }
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Agendando...
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 mr-2" />
                              Agendar Mensagem
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
                  <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um contato</h3>
                  <p className="text-gray-500 max-w-md">
                    Escolha um contato da lista para agendar uma mensagem de aniversário personalizada.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
