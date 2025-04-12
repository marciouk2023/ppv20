"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore"
import { CalendarIcon, Clock, Send, Users, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Contact {
  id: string
  nome: string
  telefone: string
  grupo?: string
}

export function CampaignScheduler() {
  const [campaignName, setCampaignName] = useState("")
  const [message, setMessage] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Carregar contatos e grupos disponíveis
  useEffect(() => {
    const loadContactsAndGroups = async () => {
      if (!user?.email) return

      try {
        setIsLoading(true)
        const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
        const snapshot = await getDocs(contactsRef)

        const loadedContacts = snapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome || "",
          telefone: doc.data().telefone || "",
          grupo: doc.data().grupo || "Geral",
        }))

        setContacts(loadedContacts)

        // Extrair grupos únicos
        const groups = Array.from(new Set(loadedContacts.map((contact) => contact.grupo || "Geral")))
        setAvailableGroups(groups)
      } catch (error) {
        console.error("Erro ao carregar contatos:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os contatos.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadContactsAndGroups()
  }, [user, toast])

  // Filtrar contatos com base nos grupos selecionados
  const filteredContacts =
    selectedGroups.length > 0
      ? contacts.filter((contact) => selectedGroups.includes(contact.grupo || "Geral"))
      : contacts

  // Verificar se todos os contatos estão selecionados
  const allContactsSelected =
    filteredContacts.length > 0 && filteredContacts.every((contact) => selectedContacts.includes(contact.id))

  // Alternar seleção de todos os contatos
  const toggleSelectAllContacts = () => {
    if (allContactsSelected) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map((contact) => contact.id))
    }
  }

  // Alternar seleção de um contato
  const toggleContactSelection = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter((id) => id !== contactId))
    } else {
      setSelectedContacts([...selectedContacts, contactId])
    }
  }

  // Alternar seleção de um grupo
  const toggleGroupSelection = (group: string) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== group))
    } else {
      setSelectedGroups([...selectedGroups, group])
    }
  }

  // Agendar campanha
  const scheduleCampaign = async () => {
    if (!campaignName || !message || !selectedDate || !selectedTime || selectedContacts.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione pelo menos um contato.",
        variant: "destructive",
      })
      return
    }

    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para agendar campanhas.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Criar data e hora de agendamento
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const scheduledDateTime = new Date(selectedDate)
      scheduledDateTime.setHours(hours, minutes, 0, 0)

      // Verificar se a data é futura
      if (scheduledDateTime <= new Date()) {
        toast({
          title: "Data inválida",
          description: "A data e hora de agendamento devem ser futuras.",
          variant: "destructive",
        })
        return
      }

      // Obter contatos selecionados
      const selectedContactsData = contacts.filter((contact) => selectedContacts.includes(contact.id))

      // Criar campanha no Firebase
      const campaignsRef = collection(db, `parabenspravoce/${user.email}/campaigns`)
      await addDoc(campaignsRef, {
        name: campaignName,
        message,
        scheduledAt: Timestamp.fromDate(scheduledDateTime),
        createdAt: Timestamp.now(),
        status: "scheduled",
        contacts: selectedContactsData.map((contact) => ({
          id: contact.id,
          nome: contact.nome,
          telefone: contact.telefone,
          status: "pending",
        })),
        createdBy: user.email,
      })

      toast({
        title: "Campanha agendada",
        description: `A campanha "${campaignName}" foi agendada com sucesso para ${format(scheduledDateTime, "PPpp", { locale: ptBR })}.`,
      })

      // Limpar formulário
      setCampaignName("")
      setMessage("")
      setSelectedDate(new Date())
      setSelectedTime("09:00")
      setSelectedContacts([])
      setSelectedGroups([])
    } catch (error) {
      console.error("Erro ao agendar campanha:", error)
      toast({
        title: "Erro",
        description: "Não foi possível agendar a campanha. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendar Nova Campanha</CardTitle>
        <CardDescription>Crie e agende uma campanha de mensagens para seus contatos</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="message" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="message">Mensagem</TabsTrigger>
            <TabsTrigger value="schedule">Agendamento</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
          </TabsList>

          <TabsContent value="message" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nome da Campanha</Label>
              <Input
                id="campaign-name"
                placeholder="Ex: Campanha de Aniversários - Abril"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite a mensagem que será enviada para os contatos..."
                className="min-h-[150px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-gray-500">Dica: Use {"{nome}"} para incluir o nome do contato na mensagem.</p>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Data de Envio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Horário de Envio</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-gray-500" />
                  <Input id="time" type="time" />
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4 pt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Filtrar por Grupos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Selecionar Contatos</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={allContactsSelected}
                        onCheckedChange={toggleSelectAllContacts}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Selecionar todos
                      </label>
                    </div>
                  </div>

                  <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Nenhum contato encontrado para os filtros selecionados.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredContacts.map((contact) => (
                          <div key={contact.id} className="flex items-center p-3">
                            <Checkbox
                              id={`contact-${contact.id}`}
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => toggleContactSelection(contact.id)}
                              disabled={!contact.telefone}
                            />
                            <label htmlFor={`contact-${contact.id}`} className="ml-2 flex-1 cursor-pointer">
                              <div className="font-medium">{contact.nome}</div>
                              {contact.telefone ? (
                                <div className="text-sm text-gray-500">{contact.telefone}</div>
                              ) : (
                                <div className="text-sm text-red-500">Sem telefone</div>
                              )}
                            </label>
                            <div className="text-xs px-2 py-1 rounded-full bg-gray-100">{contact.grupo || "Geral"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{selectedContacts.length} contatos selecionados</div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {selectedContacts.length > 0 && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {selectedContacts.length} contatos selecionados
            </div>
          )}
        </div>
        <Button
          className="bg-green-500 hover:bg-green-600"
          onClick={scheduleCampaign}
          disabled={
            isSubmitting || !campaignName || !message || !selectedDate || !selectedTime || selectedContacts.length === 0
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Agendando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Agendar Campanha
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
