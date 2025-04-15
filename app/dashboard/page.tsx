"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ContactBirthdayCard } from "@/components/contact-birthday-card"
import { Users, MessageSquare, Calendar, ChevronRight, BarChart3, Activity } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase-config"
import { collection, getDocs } from "firebase/firestore"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({
    totalContacts: 0,
    birthdaysThisMonth: 0,
    messagesSent: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.email) return

      try {
        setIsLoading(true)

        // Carregar contatos
        const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
        const contactsSnapshot = await getDocs(contactsRef)
        const contacts = contactsSnapshot.docs.map((doc) => doc.data())

        // Calcular aniversariantes do mês atual
        const currentMonth = new Date().getMonth() + 1
        const birthdaysThisMonth = contacts.filter((contact) => {
          if (!contact.data_de_nascimento) return false

          let birthMonth
          if (contact.data_de_nascimento.includes("/")) {
            birthMonth = Number.parseInt(contact.data_de_nascimento.split("/")[1])
          } else {
            birthMonth = new Date(contact.data_de_nascimento).getMonth() + 1
          }

          return birthMonth === currentMonth
        }).length

        // Atualizar estatísticas
        setStats({
          totalContacts: contactsSnapshot.size,
          birthdaysThisMonth,
          messagesSent: 0, // Implementar contagem real de mensagens enviadas
        })
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadStats()
    }
  }, [user])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="dashboard" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-2">Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Bem-vindo(a) de volta, {user.displayName || user.email?.split("@")[0] || "usuário"}! Aqui está um resumo da
            sua conta.
          </p>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Users className="h-5 w-5 mr-2 text-blue-500" />
                      Contatos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{isLoading ? "-" : stats.totalContacts}</div>
                    <p className="text-sm text-gray-500 mt-1">Contatos cadastrados</p>
                    <Link href="/contatos" passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0"
                      >
                        Gerenciar contatos
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-purple-500" />
                      Mensagens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{isLoading ? "-" : stats.messagesSent}</div>
                    <p className="text-sm text-gray-500 mt-1">Mensagens enviadas</p>
                    <Link href="/mensagens" passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50 p-0"
                      >
                        Ver mensagens
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-green-500" />
                      Aniversários
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{isLoading ? "-" : stats.birthdaysThisMonth}</div>
                    <p className="text-sm text-gray-500 mt-1">Aniversários neste mês</p>
                    <Link href="/agendamento" passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4 text-green-600 hover:text-green-700 hover:bg-green-50 p-0"
                      >
                        Agendar mensagens
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Activity and Birthdays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-blue-500" />
                      Atividade Recente
                    </CardTitle>
                    <CardDescription>Suas últimas ações no sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6 text-gray-500">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <p>Nenhuma atividade recente</p>
                    </div>
                  </CardContent>
                </Card>

                <ContactBirthdayCard />
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mensagens Recentes</CardTitle>
                  <CardDescription>Histórico das suas últimas mensagens enviadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-2">Nenhuma mensagem enviada recentemente</p>
                    <Link href="/mensagens" passHref>
                      <Button className="mt-2 bg-green-500 hover:bg-green-600">Enviar Mensagem</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas Agendadas</CardTitle>
                  <CardDescription>Suas campanhas de mensagens programadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-2">Nenhuma campanha agendada</p>
                    <Link href="/agendamento" passHref>
                      <Button className="mt-2 bg-green-500 hover:bg-green-600">Criar Campanha</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
