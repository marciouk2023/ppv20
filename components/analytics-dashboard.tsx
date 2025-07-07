"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Users, MessageSquare, Calendar, BarChart3, Loader2 } from "lucide-react"

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    birthdaysThisMonth: 0,
    messagesSent: 0,
    scheduledCampaigns: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

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

        // Carregar campanhas agendadas
        const campaignsRef = collection(db, `parabenspravoce/${user.email}/campaigns`)
        const campaignsQuery = query(campaignsRef, where("status", "==", "scheduled"))
        const campaignsSnapshot = await getDocs(campaignsQuery)

        // Atualizar estatísticas
        setStats({
          totalContacts: contactsSnapshot.size,
          birthdaysThisMonth,
          messagesSent: 0, // Implementar contagem real de mensagens enviadas
          scheduledCampaigns: campaignsSnapshot.size,
        })
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [user])

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total de Contatos"
              value={stats.totalContacts}
              icon={<Users className="h-5 w-5 text-blue-500" />}
              description="Contatos cadastrados"
            />
            <StatCard
              title="Aniversariantes do Mês"
              value={stats.birthdaysThisMonth}
              icon={<Calendar className="h-5 w-5 text-green-500" />}
              description="Aniversários neste mês"
            />
            <StatCard
              title="Mensagens Enviadas"
              value={stats.messagesSent}
              icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
              description="Total de mensagens"
            />
            <StatCard
              title="Campanhas Agendadas"
              value={stats.scheduledCampaigns}
              icon={<Calendar className="h-5 w-5 text-orange-500" />}
              description="Campanhas futuras"
            />
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="contacts">Contatos</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Recente</CardTitle>
                  <CardDescription>Resumo das suas atividades recentes no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Dados de atividade serão exibidos aqui conforme você utiliza o sistema</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="messages" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Mensagens</CardTitle>
                  <CardDescription>Estatísticas sobre suas mensagens enviadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Nenhuma mensagem enviada ainda</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="contacts" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Contatos</CardTitle>
                  <CardDescription>Estatísticas sobre seus contatos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Dados de contatos serão exibidos aqui conforme você adiciona contatos</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  description,
}: { title: string; value: number; icon: React.ReactNode; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
