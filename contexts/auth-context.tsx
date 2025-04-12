"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth"
import { auth } from "@/lib/firebase-config"
import { doc, setDoc, getDoc, collection } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { migrateExistingDataToAdmin } from "@/utils/data-access"

// Admin user constants
const ADMIN_EMAIL = "ronaldo@graficaeleal.com.br"
const ADMIN_USER_ID = "ronaldo-leal-admin" // We'll use this as a fixed ID for Ronaldo

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string, name: string, whatsapp?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      // Check if the current user is the admin (Ronaldo)
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true)

        // Ensure admin user has the correct data in Firestore
        await ensureAdminData(user)
      } else {
        setIsAdmin(false)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Function to ensure admin user has the correct data
  const ensureAdminData = async (user: User) => {
    try {
      const adminDocRef = doc(db, "users", ADMIN_USER_ID)
      const adminDoc = await getDoc(adminDocRef)

      if (!adminDoc.exists()) {
        // Create admin user data if it doesn't exist
        await setDoc(adminDocRef, {
          name: "Ronaldo Leal",
          email: ADMIN_EMAIL,
          whatsapp: "+5511987654321", // Example WhatsApp
          isAdmin: true,
          churchName: "Igreja Batista Ágape",
          createdAt: new Date(),
        })

        console.log("Admin user data created")

        // Migrate existing data to admin account
        await migrateExistingDataToAdmin()
      }
    } catch (error) {
      console.error("Error ensuring admin data:", error)
    }
  }

  const signUp = async (email: string, password: string, name: string, whatsapp?: string) => {
    try {
      // Don't allow registration with admin email
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        throw new Error("Este email não pode ser utilizado para registro.")
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        })

        // Store user data in Firestore with their UID
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name,
          email,
          whatsapp: whatsapp || "",
          isAdmin: false,
          churchName: `Igreja de ${name.split(" ")[0]}`, // Default church name based on first name
          createdAt: new Date(),
        })

        // Create sample data for new users
        await createSampleDataForNewUser(userCredential.user.uid, name)
      }
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  // Function to create sample data for new users
  const createSampleDataForNewUser = async (userId: string, userName: string) => {
    try {
      const firstName = userName.split(" ")[0]

      // Create sample contacts for the new user
      const contactsCollection = collection(db, "users", userId, "contacts")

      // Generate random dates for birthdays
      const generateRandomBirthday = () => {
        const today = new Date()
        const randomDaysOffset = Math.floor(Math.random() * 365) - 180 // -180 to +184 days from today
        const birthday = new Date(today)
        birthday.setDate(today.getDate() + randomDaysOffset)
        return birthday.toISOString().split("T")[0]
      }

      // Sample contacts with different names than Ronaldo's contacts
      const sampleContacts = [
        // Family members
        {
          nome: `Pai de ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Família",
          dataNascimento: generateRandomBirthday(),
          email: `pai.${firstName.toLowerCase()}@example.com`,
          avatar: "P",
        },
        {
          nome: `Mãe de ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Família",
          dataNascimento: generateRandomBirthday(),
          email: `mae.${firstName.toLowerCase()}@example.com`,
          avatar: "M",
        },
        {
          nome: `Irmão de ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Família",
          dataNascimento: generateRandomBirthday(),
          email: `irmao.${firstName.toLowerCase()}@example.com`,
          avatar: "I",
        },

        // Friends
        {
          nome: `Amigo de ${firstName} - Carlos`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Amigos",
          dataNascimento: generateRandomBirthday(),
          email: `carlos.amigo@example.com`,
          avatar: "C",
        },
        {
          nome: `Amiga de ${firstName} - Ana`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Amigos",
          dataNascimento: generateRandomBirthday(),
          email: `ana.amiga@example.com`,
          avatar: "A",
        },
        {
          nome: `Amigo de ${firstName} - Pedro`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Amigos",
          dataNascimento: generateRandomBirthday(),
          email: `pedro.amigo@example.com`,
          avatar: "P",
        },

        // Church
        {
          nome: `Pastor da Igreja de ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Igreja",
          dataNascimento: generateRandomBirthday(),
          email: `pastor@igreja${firstName.toLowerCase()}.org`,
          avatar: "P",
        },
        {
          nome: `Diácono da Igreja de ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Igreja",
          dataNascimento: generateRandomBirthday(),
          email: `diacono@igreja${firstName.toLowerCase()}.org`,
          avatar: "D",
        },
        {
          nome: `Membro da Igreja de ${firstName} - Maria`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Igreja",
          dataNascimento: generateRandomBirthday(),
          email: `maria@igreja${firstName.toLowerCase()}.org`,
          avatar: "M",
        },

        // Work
        {
          nome: `Colega de ${firstName} - Roberto`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Trabalho",
          dataNascimento: generateRandomBirthday(),
          email: `roberto.trabalho@example.com`,
          avatar: "R",
        },
        {
          nome: `Chefe de ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Trabalho",
          dataNascimento: generateRandomBirthday(),
          email: `chefe.empresa@example.com`,
          avatar: "C",
        },

        // Upcoming birthdays (within next 7 days)
        {
          nome: `Aniversariante Próximo 1 - ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Amigos",
          dataNascimento: (() => {
            const today = new Date()
            const nearBirthday = new Date(today)
            nearBirthday.setDate(today.getDate() + Math.floor(Math.random() * 7) + 1) // 1-7 days from now
            return nearBirthday.toISOString().split("T")[0]
          })(),
          email: `aniversariante1@example.com`,
          avatar: "A",
        },
        {
          nome: `Aniversariante Próximo 2 - ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Família",
          dataNascimento: (() => {
            const today = new Date()
            const nearBirthday = new Date(today)
            nearBirthday.setDate(today.getDate() + Math.floor(Math.random() * 7) + 1) // 1-7 days from now
            return nearBirthday.toISOString().split("T")[0]
          })(),
          email: `aniversariante2@example.com`,
          avatar: "A",
        },

        // Today's birthday
        {
          nome: `Aniversariante de Hoje - ${firstName}`,
          telefone: `+55119${Math.floor(10000000 + Math.random() * 90000000)}`,
          grupo: "Amigos",
          dataNascimento: (() => {
            const today = new Date()
            return today.toISOString().split("T")[0]
          })(),
          email: `aniversariante.hoje@example.com`,
          avatar: "A",
        },
      ]

      // Add each sample contact
      for (const contact of sampleContacts) {
        await setDoc(doc(contactsCollection), {
          ...contact,
          createdAt: new Date(),
        })
      }

      // Create sample messages
      const messagesCollection = collection(db, "users", userId, "messages")

      const sampleMessages = [
        {
          title: "Mensagem de Aniversário Personalizada",
          content: `Feliz aniversário, {nome}! Que Deus abençoe sua vida com muita saúde, paz e alegria neste novo ano de vida. Tenha um dia maravilhoso! Abraços, ${firstName}.`,
          type: "birthday",
        },
        {
          title: "Mensagem de Aniversário Formal",
          content: `Parabéns pelo seu dia, {nome}! Desejamos a você um ano repleto de conquistas e momentos felizes. Conte sempre conosco! Atenciosamente, ${firstName} e família.`,
          type: "birthday",
        },
        {
          title: "Mensagem de Aniversário Religiosa",
          content: `Felicitações pelo seu aniversário, {nome}! Que este novo ciclo seja marcado por bênçãos e realizações. "O Senhor te abençoe e te guarde" (Números 6:24). Estamos orando por você!`,
          type: "birthday",
        },
        {
          title: "Mensagem de Aniversário Divertida",
          content: `PARABÉNS, {nome}!!! 🎉🎂🎈 Mais um ano de vida, mais um ano de sabedoria (ou pelo menos é o que esperamos, né? 😜). Que seu dia seja tão especial quanto você! Grande abraço!`,
          type: "birthday",
        },
        {
          title: "Mensagem de Aniversário Simples",
          content: `Feliz aniversário, {nome}! Muitas felicidades, saúde e paz. Abraços!`,
          type: "birthday",
        },
      ]

      // Add each sample message
      for (const message of sampleMessages) {
        await setDoc(doc(messagesCollection), {
          ...message,
          createdAt: new Date(),
        })
      }

      console.log(`Sample data created for new user: ${userName}`)
    } catch (error) {
      console.error("Error creating sample data for new user:", error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    }
  }

  const logOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Error resetting password:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    isAdmin,
    signUp,
    signIn,
    logOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
