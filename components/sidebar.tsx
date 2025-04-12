"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Menu, X, Camera, Settings, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-config"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { getUserSession } from "@/lib/session-manager"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  href: string
  active: boolean
  onClick?: () => void
}

export function NavItem({ icon, label, href, active, onClick }: NavItemProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    }

    if (href && href !== "#") {
      router.push(href)
    }
  }

  return (
    <div
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm cursor-pointer ${
        active ? "text-green-600 font-medium" : "text-gray-600 hover:bg-gray-50"
      }`}
      aria-current={active ? "page" : undefined}
      onClick={handleClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

type ConnectionStatus = "connected" | "disconnected" | "connecting" | "unknown"

// Connection Status Badge Component
function ConnectionStatusBadge() {
  const [status, setStatus] = useState<ConnectionStatus>("unknown")
  const { user } = useAuth()

  // Effect to check the user's session status
  useEffect(() => {
    const checkSessionStatus = async () => {
      if (!user?.email) return

      try {
        const sessionData = await getUserSession(user.email)

        if (sessionData) {
          // If session exists, check its status
          if (
            sessionData.status === "CONNECTED" ||
            sessionData.status === "WORKING" ||
            sessionData.status === "AUTHENTICATED"
          ) {
            setStatus("connected")
          } else if (sessionData.status === "STARTING" || sessionData.status === "SCAN_QR_CODE") {
            setStatus("connecting")
          } else {
            setStatus("disconnected")
          }
        } else {
          setStatus("disconnected")
        }
      } catch (error) {
        console.error("[StatusBadge] Error checking session status:", error)
        setStatus("unknown")
      }
    }

    // Check immediately and then every 30 seconds
    checkSessionStatus()
    const interval = setInterval(checkSessionStatus, 30000)

    return () => clearInterval(interval)
  }, [user])

  // Add a listener for the WhatsApp connection event
  useEffect(() => {
    const handleWhatsAppConnected = () => {
      console.log("[StatusBadge] WhatsApp connected event received")
      setStatus("connected")
    }

    window.addEventListener("whatsapp-connected", handleWhatsAppConnected)

    return () => {
      window.removeEventListener("whatsapp-connected", handleWhatsAppConnected)
    }
  }, [])

  // Render the appropriate badge based on status
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <Check className="h-3.5 w-3.5 mr-1" />
          Conectado
        </Badge>
      )
    case "connecting":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          Conectando
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          <Info className="h-3.5 w-3.5 mr-1" />
          Desconectado
        </Badge>
      )
    default: // unknown
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          <Info className="h-3.5 w-3.5 mr-1" />
          Status Desconhecido
        </Badge>
      )
  }
}

export function Sidebar({ activePage }: { activePage: string }) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const { user, logOut } = useAuth()
  const router = useRouter()

  // User data states
  const [userName, setUserName] = useState("Usuário")
  const [userWhatsapp, setUserWhatsapp] = useState("")
  const [churchName, setChurchName] = useState("Nome de sua igreja")
  const [isEditingChurch, setIsEditingChurch] = useState(false)
  const [profileImage, setProfileImage] = useState(
    "https://firebasestorage.googleapis.com/v0/b/mmlj---new-day-church.appspot.com/o/Screenshot%202025-04-03%20at%2016.56.49.png?alt=media&token=845fe6ce-eb9d-4bd8-be60-8b8a5b373c7b",
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for user session info
  const [userSessionInfo, setUserSessionInfo] = useState<{
    hasSession: boolean
    sessionName: string | null
    status: string | null
  }>({
    hasSession: false,
    sessionName: null,
    status: null,
  })

  // Editing states
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")

  // Profile modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [institutionName, setInstitutionName] = useState("New Day Church")
  const [profileName, setProfileName] = useState("Marcio Albuquerque")
  const [profilePhone, setProfilePhone] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Check user session when component mounts
  useEffect(() => {
    const checkUserSession = async () => {
      if (user?.email) {
        try {
          const sessionData = await getUserSession(user.email)

          if (sessionData) {
            setUserSessionInfo({
              hasSession: true,
              sessionName: sessionData.sessionName,
              status: sessionData.status,
            })
          }
        } catch (error) {
          console.error("Error checking user session:", error)
        }
      }
    }

    checkUserSession()
  }, [user])

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))

          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserName(userData.name || user.displayName || "Usuário")

            // Format WhatsApp number as 00 0000-0000
            if (userData.whatsapp) {
              // Remove country code (assuming format is +[country code][number])
              const numberOnly = userData.whatsapp.replace(/^\+\d{1,3}/, "")
              // Format as 00 0000-0000
              const formatted = numberOnly.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "$1 $2-$3")
              setUserWhatsapp(formatted)
            }

            // Get church name if saved
            if (userData.churchName) {
              setChurchName(userData.churchName)
            }

            // Get profile image if saved
            if (userData.profileImage) {
              setProfileImage(userData.profileImage)
            }

            setProfileName(userData.name || user.displayName || "Marcio Albuquerque")
            setProfilePhone(userData.whatsapp || "")
            setInstitutionName(userData.churchName || "New Day Church")
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    }

    fetchUserData()
  }, [user])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logOut()
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  // Save church name to Firestore
  const saveChurchName = async () => {
    if (user?.uid) {
      try {
        // Use setDoc with merge option
        await setDoc(
          doc(db, "users", user.uid),
          {
            churchName: churchName,
            // Include other essential fields if this is a new document
            name: userName || user.displayName || "Usuário",
            email: user.email || "",
            updatedAt: new Date(),
          },
          { merge: true },
        )

        setIsEditingChurch(false)
      } catch (error) {
        console.error("Error saving church name:", error)
      }
    }
  }

  // Handle profile image click
  const handleProfileImageClick = () => {
    fileInputRef.current?.click()
  }

  // Handle profile image change
  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return

    // Check file size (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024 // 2MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Upload error",
        description: "Image must be at most 2MB",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      toast({
        title: "Uploading...",
        description: "Uploading image to server",
      })

      const storage = getStorage()
      const storageRef = ref(storage, `users/${user.uid}/profile`)

      // Upload image to Firebase Storage
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      // Update image URL in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        profileImage: downloadURL,
        updatedAt: new Date(),
      })

      // Update local state with new image URL
      setProfileImage(downloadURL)

      // Show success message
      toast({
        title: "Success!",
        description: "Profile picture updated successfully",
      })
    } catch (error) {
      console.error("Error uploading profile image:", error)
      toast({
        title: "Error",
        description: "Could not update profile picture",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Start editing name
  const startEditingName = () => {
    setEditedName(userName)
    setIsEditingName(true)
  }

  // Save edited name
  const saveEditedName = async () => {
    if (user?.uid && editedName.trim()) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          name: editedName.trim(),
        })

        setUserName(editedName.trim())
        setIsEditingName(false)
        toast({
          title: "Success!",
          description: "Name updated successfully",
        })
      } catch (error) {
        console.error("Error updating user name:", error)
        toast({
          title: "Error",
          description: "Could not update name",
          variant: "destructive",
        })
      }
    }
  }

  // Save profile data
  const saveProfileData = async () => {
    if (!user?.uid) return

    setIsSaving(true)
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: profileName,
          whatsapp: profilePhone,
          churchName: institutionName,
          updatedAt: new Date(),
        },
        { merge: true },
      )

      // Update local states immediately to reflect in UI
      setUserName(profileName)
      setChurchName(institutionName)

      // Format phone number for display
      if (profilePhone) {
        // Remove country code (assuming format is +[country code][number])
        const numberOnly = profilePhone.replace(/^\+\d{1,3}/, "")
        // Format as 00 0000-0000
        const formatted = numberOnly.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "$1 $2-$3")
        setUserWhatsapp(formatted)
      }

      toast({
        title: "Profile updated",
        description: "Your information has been updated successfully!",
      })

      // Close modal after saving
      setIsProfileModalOpen(false)

      // Add a small visual highlight to the profile area to indicate the update
      const profileArea = document.querySelector(".sidebar-profile-area")
      if (profileArea) {
        profileArea.classList.add("bg-green-50")
        setTimeout(() => {
          profileArea.classList.remove("bg-green-50")
        }, 2000)
      }
    } catch (error) {
      console.error("Error saving profile data:", error)
      toast({
        title: "Error",
        description: "Could not update profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Render mobile menu button
  const renderMobileMenuButton = () => {
    if (!isMobile) return null

    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>
    )
  }

  // Sidebar classes
  const sidebarClasses = `
    ${isMobile ? "fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out" : "w-[196px] fixed h-full"}
    ${isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"}
    bg-white border-r border-gray-200 flex flex-col
  `

  // Render overlay for mobile
  const renderOverlay = () => {
    if (!isMobile || !isOpen) return null

    return <div className="fixed inset-0 bg-black/50 z-30" onClick={closeSidebar} aria-hidden="true" />
  }

  return (
    <>
      {renderMobileMenuButton()}
      {renderOverlay()}

      <div className={sidebarClasses}>
        <div className="p-5 pt-7 border-b border-gray-200 flex flex-col items-center">
          {/* Clickable area to open modal */}
          <div
            className="w-full flex flex-col items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors sidebar-profile-area"
            onClick={() => router.push("/perfil")}
          >
            {/* Institution/Church name */}

            {/* Profile picture */}
            <div
              className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500 mb-3 relative cursor-pointer group"
              onClick={() => router.push("/perfil")}
            >
              <img
                src={profileImage || "/placeholder.svg"}
                alt="Profile picture"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
                <span className="text-white text-xs ml-1">Edit</span>
              </div>
            </div>

            {/* User name */}
            <div className="mb-1">
              <span className="text-sm font-medium">{userName}</span>
            </div>

            {/* WhatsApp */}
            <span className="text-xs text-gray-500">{userWhatsapp}</span>

            {/* WhatsApp connection status */}
            <div className="mt-2">
              <ConnectionStatusBadge />
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <NavItem
            icon={
              <div className="w-5 h-5 flex items-center justify-center">
                <HomeIcon />
              </div>
            }
            label="Dashboard"
            href="/dashboard"
            active={activePage === "dashboard"}
            onClick={closeSidebar}
          />
          <NavItem
            icon={
              <div className="w-5 h-5 flex items-center justify-center">
                <ScheduleIcon />
              </div>
            }
            label="Agendamento"
            href="/agendamento"
            active={activePage === "agendamento"}
            onClick={closeSidebar}
          />
          <NavItem
            icon={
              <div className="w-5 h-5 flex items-center justify-center">
                <ContactsIcon />
              </div>
            }
            label="Contatos"
            href="/contatos-gerenciamento"
            active={activePage === "contatos-gerenciamento"}
            onClick={closeSidebar}
          />
          <NavItem
            icon={
              <div className="w-5 h-5 flex items-center justify-center">
                <MessagesIcon />
              </div>
            }
            label="Mensagens"
            href="/mensagens"
            active={activePage === "mensagens"}
            onClick={closeSidebar}
          />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <NavItem
            icon={
              <div className="w-5 h-5 flex items-center justify-center">
                <Settings className="h-4 w-4" />
              </div>
            }
            label="Configurações"
            href="/configuracoes"
            active={activePage === "configuracoes"}
            onClick={closeSidebar}
          />
          <NavItem
            icon={
              <div className="w-5 h-5 flex items-center justify-center">
                <LogOut className="h-4 w-4" />
              </div>
            }
            label="Sair"
            href="#"
            active={false}
            onClick={() => {
              closeSidebar()
              handleLogout()
            }}
          />
        </div>

        {/* Profile edit modal */}
        <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>Atualize suas informações de perfil</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="institution" className="text-right">
                  Instituição/Empresa
                </Label>
                <Input
                  id="institution"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Foto</Label>
                <div className="col-span-3 flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500 relative cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <img
                      src={profileImage || "/placeholder.svg"}
                      alt="Profile picture"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-5 w-5 text-white" />
                      <span className="text-white text-xs ml-1">Change</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Change Photo
                    </Button>
                    <p className="text-xs text-gray-500">Click on the image or button to change your photo</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+5511987654321"
                  className="col-span-3"
                />
              </div>

              {/* WhatsApp session info */}
              {userSessionInfo.hasSession && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Sessão WhatsApp</Label>
                  <div className="col-span-3">
                    <div className="text-xs bg-blue-50 p-2 rounded border border-blue-100 font-mono">
                      {userSessionInfo.sessionName || "Não disponível"}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Esta sessão está associada exclusivamente à sua conta.</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={saveProfileData}
                disabled={isSaving}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

// Icon components
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.5 15V10H12.5V15H16.25V8.75L10 3.75L3.75 8.75V15H7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ContactsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.75 4.375C13.75 6.17 12.295 7.625 10.5 7.625C8.705 7.625 7.25 6.17 7.25 4.375C7.25 2.58 8.705 1.125 10.5 1.125C12.295 1.125 13.75 2.58 13.75 4.375Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 10.125C6.77 10.125 3.75 13.145 3.75 16.875H17.25C17.25 13.145 14.23 10.125 10.5 10.125Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MessagesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.5 9.58333C17.5029 10.6832 17.2459 11.7682 16.75 12.75C16.162 13.9265 15.2581 14.916 14.1395 15.6078C13.021 16.2995 11.7319 16.6662 10.4167 16.6667C9.31678 16.6695 8.23176 16.4126 7.25 15.9167L2.5 17.5L4.08333 12.75C3.58744 11.7682 3.33047 10.6832 3.33333 9.58333C3.33384 8.26813 3.70051 6.97904 4.39227 5.86045C5.08402 4.74187 6.07355 3.83797 7.25 3.25C8.23176 2.75411 9.31678 2.49713 10.4167 2.5H10.8333C12.5703 2.59583 14.2109 3.32899 15.4409 4.55905C16.671 5.78912 17.4042 7.42971 17.5 9.16667V9.58333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ScheduleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.8333 3.33333H4.16667C3.24619 3.33333 2.5 4.07952 2.5 4.99999V16.6667C2.5 17.5871 3.24619 18.3333 4.16667 18.3333H15.8333C16.7538 18.3333 17.5 17.5871 17.5 16.6667V4.99999C17.5 4.07952 16.7538 3.33333 15.8333 3.33333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.3333 1.66667V5.00001"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66669 1.66667V5.00001"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 8.33333H17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Check(props: React.SVGProps<SVGSVGElement>) {
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

function Info(props: React.SVGProps<SVGSVGElement>) {
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
