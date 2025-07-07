"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Calendar, Send, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SendBirthdayMessage } from "@/components/send-birthday-message"

interface Contact {
  id: string
  nome: string
  telefone: string
  data_de_nascimento: string
  diasParaAniversario?: number
}

// Adicionar interface para agendamentos
interface ScheduledMessage {
  id: string
  contactName: string
  scheduledDate: Date
  message: string
}

// Modificar o componente para buscar e exibir agendamentos
export function ContactBirthdayCard() {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  // Adicionar estado para agendamentos
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([])
  const { user } = useAuth()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])

  const loadContacts = async () => {
    if (!user?.email) return

    try {
      setLoading(true)
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
      const q = query(contactsRef, orderBy("nome"))
      const snapshot = await getDocs(q)

      const contacts = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "",
        telefone: doc.data().telefone || "",
        data_de_nascimento: doc.data().data_de_nascimento || "",
      })) as Contact[]

      // Calcular dias até o aniversário para cada contato
      const contactsWithDays = contacts.map((contact) => ({
        ...contact,
        diasParaAniversario: calcularDiasParaAniversario(contact.data_de_nascimento),
      }))

      // Armazenar todos os contatos com dias calculados
      setContacts(contactsWithDays)

      // Filtrar apenas contatos com aniversário hoje ou nos próximos 7 dias
      const upcoming = contactsWithDays
        .filter((contact) => contact.diasParaAniversario !== undefined && contact.diasParaAniversario <= 7)
        .sort((a, b) => (a.diasParaAniversario || 0) - (b.diasParaAniversario || 0))

      setUpcomingBirthdays(upcoming)

      // Carregar agendamentos
      await loadScheduledMessages()
    } catch (error) {
      console.error("Error loading contacts for birthdays:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os aniversariantes.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Adicionar função para carregar agendamentos
  const loadScheduledMessages = async () => {
    if (!user?.email) return

    try {
      // Buscar agendamentos da coleção (ajuste o caminho conforme sua estrutura)
      const scheduledRef = collection(db, `parabenspravoce/${user.email}/scheduled_messages`)
      const today = new Date()

      // Buscar apenas agendamentos futuros, ordenados por data
      const q = query(scheduledRef, where("scheduledDate", ">=", today), orderBy("scheduledDate"), limit(5))

      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const messages = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            contactName: data.contactName || "Contato",
            scheduledDate: data.scheduledDate?.toDate() || new Date(),
            message: data.message || "Mensagem agendada",
          }
        })

        setScheduledMessages(messages)
      }
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [user, toast])

  // Função para calcular dias até o aniversário
  const calcularDiasParaAniversario = (dataNascimento: string): number => {
    if (!dataNascimento) return 365 // Default to end of list if no date

    // Verificar se a data está no formato DD/MM/AAAA
    let nascimento
    if (dataNascimento.includes("/")) {
      const [dia, mes, ano] = dataNascimento.split("/")
      nascimento = new Date(`${ano}-${mes}-${dia}`)
    } else {
      nascimento = new Date(dataNascimento)
    }

    if (isNaN(nascimento.getTime())) return 365

    // Use current date for calculations
    const hoje = new Date()

    // Set year to current year
    const proximoAniversario = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())

    // If birthday has passed this year, set to next year
    if (hoje > proximoAniversario) {
      proximoAniversario.setFullYear(hoje.getFullYear() + 1)
    }

    // Calculate difference in days
    const diffTempo = proximoAniversario.getTime() - hoje.getTime()
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24))

    return diffDias
  }

  // Função para formatar a data
  const formatarData = (dataString: string): string => {
    if (!dataString) return ""

    // Verificar se a data está no formato DD/MM/AAAA
    if (dataString.includes("/")) {
      return dataString.substring(0, 5) // Retorna apenas DD/MM
    }

    try {
      const data = new Date(dataString)
      return `${data.getDate().toString().padStart(2, "0")}/${(data.getMonth() + 1).toString().padStart(2, "0")}`
    } catch (error) {
      return ""
    }
  }

  // Formatar data de agendamento
  const formatScheduledDate = (date: Date): string => {
    try {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Data inválida"
    }
  }

  // Abrir diálogo para enviar mensagem
  const openSendMessage = (contact: Contact) => {
    setSelectedContact(contact)
    setIsMessageDialogOpen(true)
  }

  // Fechar diálogo e recarregar contatos
  const handleMessageSent = () => {
    setIsMessageDialogOpen(false)
    setSelectedContact(null)
    loadContacts() // Recarregar para atualizar status

    // Mostrar toast de sucesso
    toast({
      title: "Mensagem enviada",
      description: "A mensagem de aniversário foi enviada com sucesso!",
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center">
            <Gift className="h-5 w-5 mr-2 text-green-500" />
            Próximos Aniversários
          </CardTitle>
          <CardDescription>Contatos que fazem aniversário nos próximos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : upcomingBirthdays.length === 0 ? (
            <div className="py-4 text-gray-500">
              <div className="text-center mb-4">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">Aniversariantes dos Próximos 30 Dias</p>
              </div>

              {contacts
                .filter(
                  (c) =>
                    c.diasParaAniversario !== undefined &&
                    ((c.diasParaAniversario <= 30 && c.diasParaAniversario > 7) || c.diasParaAniversario === 0),
                )
                .sort((a, b) => (a.diasParaAniversario || 0) - (b.diasParaAniversario || 0))
                .slice(0, 5)
                .map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-gray-50 rounded-md ${
                      contact.diasParaAniversario === 0 ? "bg-green-50 border border-green-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full ${
                          contact.diasParaAniversario === 0
                            ? "bg-green-100 text-green-600"
                            : "bg-blue-100 text-blue-600"
                        } flex items-center justify-center flex-shrink-0`}
                      >
                        {contact.diasParaAniversario === 0 ? (
                          <Gift className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-medium">{contact.nome.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{contact.nome}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {contact.diasParaAniversario === 0 ? (
                              <span className="text-green-600 font-medium">Aniversário hoje!</span>
                            ) : (
                              `${formatarData(contact.data_de_nascimento)} (em ${contact.diasParaAniversario} dias)`
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-8 ${
                        contact.diasParaAniversario === 0
                          ? "text-green-600 hover:bg-green-50 hover:text-green-700"
                          : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      onClick={() => openSendMessage(contact)}
                      disabled={!contact.telefone}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Enviar
                    </Button>
                  </div>
                ))}

              {contacts.filter(
                (c) =>
                  c.diasParaAniversario !== undefined &&
                  ((c.diasParaAniversario <= 30 && c.diasParaAniversario > 7) || c.diasParaAniversario === 0),
              ).length === 0 && (
                <div className="text-center py-2 text-sm">
                  <p>Nenhum aniversário hoje ou nos próximos 30 dias</p>
                </div>
              )}

              {contacts.filter(
                (c) =>
                  c.diasParaAniversario !== undefined &&
                  ((c.diasParaAniversario <= 30 && c.diasParaAniversario > 7) || c.diasParaAniversario === 0),
              ).length > 5 && (
                <div className="mt-3 text-center">
                  <Link href="/agendamento" passHref>
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      Ver mais aniversariantes
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Destacar aniversariantes de hoje */}
              {upcomingBirthdays
                .filter((contact) => contact.diasParaAniversario === 0)
                .map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between border-b pb-3 bg-green-50 p-2 rounded-md border border-green-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{contact.nome}</div>
                        <div className="text-sm text-green-600 font-medium flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Aniversário hoje!</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 bg-green-100 border-green-300 hover:bg-green-200"
                      onClick={() => openSendMessage(contact)}
                      disabled={!contact.telefone}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Enviar
                    </Button>
                  </div>
                ))}

              {/* Mostrar próximos aniversários */}
              {upcomingBirthdays
                .filter((contact) => contact.diasParaAniversario !== 0)
                .map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <span className="text-sm font-medium">{contact.nome.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{contact.nome}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {contact.diasParaAniversario === 1 ? (
                            <span>Amanhã</span>
                          ) : (
                            <span>
                              Em {contact.diasParaAniversario} dias ({formatarData(contact.data_de_nascimento)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => openSendMessage(contact)}
                      disabled={!contact.telefone}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Enviar
                    </Button>
                  </div>
                ))}

              <div className="pt-2">
                <Link href="/contatos" passHref>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    Ver todos os contatos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para enviar mensagem */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem de Aniversário</DialogTitle>
            <DialogDescription>
              Envie uma mensagem personalizada de aniversário para {selectedContact?.nome}
            </DialogDescription>
          </DialogHeader>

          {selectedContact && (
            <SendBirthdayMessage
              contactId={selectedContact.id}
              contactName={selectedContact.nome}
              contactPhone={selectedContact.telefone}
              onSuccess={handleMessageSent}
              onCancel={() => setIsMessageDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
