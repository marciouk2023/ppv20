"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ContactBirthdayCard } from "@/components/contact-birthday-card"
import { Users, Calendar, ChevronRight, BarChart3, Activity } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase-config"
import { collection, getDocs, getDoc, doc } from "firebase/firestore"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalContacts: 0,
    birthdaysThisMonth: 0,
    birthdaysNextMonth: 0,
    messagesSent: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("usuário")

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserName(userData.name || user.displayName || user.email?.split("@")[0] || "usuário")
          }
        } catch (error) {
          console.error("Error fetching user name:", error)
        }
      }
    }

    if (user) {
      fetchUserName()
    }
  }, [user])

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.email) return

      try {
        setIsLoading(true)

        // Carregar contatos
        const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
        const contactsSnapshot = await getDocs(contactsRef)
        const contacts = contactsSnapshot.docs.map((doc) => doc.data())

        // Calcular aniversariantes do mês atual e próximo mês
        const currentMonth = new Date().getMonth() + 1
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

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

        const birthdaysNextMonth = contacts.filter((contact) => {
          if (!contact.data_de_nascimento) return false

          let birthMonth
          if (contact.data_de_nascimento.includes("/")) {
            birthMonth = Number.parseInt(contact.data_de_nascimento.split("/")[1])
          } else {
            birthMonth = new Date(contact.data_de_nascimento).getMonth() + 1
          }

          return birthMonth === nextMonth
        }).length

        // Atualizar estatísticas
        setStats({
          totalContacts: contactsSnapshot.size,
          birthdaysThisMonth,
          birthdaysNextMonth,
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
          <p className="text-gray-600 mb-6">Olá {userName}, Aqui está um resumo da sua conta</p>

          <div className="space-y-6">
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
                    <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                    Aniversariantes no mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{isLoading ? "-" : stats.birthdaysThisMonth}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Aniversários em {new Date().toLocaleString("pt-BR", { month: "long" })}
                  </p>
                  <Link href="/agendamento" passHref>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50 p-0"
                    >
                      Ver aniversariantes
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-green-500" />
                    Aniversariantes próximo mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{isLoading ? "-" : stats.birthdaysNextMonth}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Aniversários em{" "}
                    {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleString("pt-BR", {
                      month: "long",
                    })}
                  </p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
