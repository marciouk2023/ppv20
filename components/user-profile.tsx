"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db, storage } from "@/lib/firebase-config"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Camera, Loader2, User, Check, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function UserProfile() {
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    churchName: "",
    profileImage: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  // Carregar dados do perfil
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setProfileData({
            name: userData.name || user.displayName || "",
            email: userData.email || user.email || "",
            whatsapp: userData.whatsapp || "",
            churchName: userData.churchName || "",
            profileImage: userData.profileImage || "",
          })
        } else {
          // Se o documento não existir, usar dados do auth
          setProfileData({
            name: user.displayName || "",
            email: user.email || "",
            whatsapp: "",
            churchName: "",
            profileImage: "",
          })
        }
      } catch (error) {
        console.error("Erro ao carregar dados do perfil:", error)
        setError("Não foi possível carregar os dados do perfil. Tente novamente mais tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [user])

  // Atualizar dados do perfil
  const handleSaveProfile = async () => {
    if (!user?.uid) return

    try {
      setIsSaving(true)
      setSuccess(false)
      setError(null)

      // Validar dados
      if (!profileData.name.trim()) {
        setError("O nome é obrigatório.")
        return
      }

      // Atualizar documento no Firestore
      await updateDoc(doc(db, "users", user.uid), {
        name: profileData.name,
        whatsapp: profileData.whatsapp,
        churchName: profileData.churchName,
        updatedAt: new Date(),
      })

      setSuccess(true)
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram atualizados com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      setError("Ocorreu um erro ao atualizar o perfil. Tente novamente.")
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Manipular alterações nos campos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  // Manipular upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return

    try {
      setIsSaving(true)
      setError(null)

      // Verificar tamanho do arquivo (máximo 2MB)
      const maxSize = 2 * 1024 * 1024
      if (file.size > maxSize) {
        setError("A imagem deve ter no máximo 2MB.")
        return
      }

      // Fazer upload para o Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/profile`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      // Atualizar URL no Firestore
      await updateDoc(doc(db, "users", user.uid), {
        profileImage: downloadURL,
        updatedAt: new Date(),
      })

      // Atualizar estado local
      setProfileData((prev) => ({ ...prev, profileImage: downloadURL }))

      toast({
        title: "Imagem atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error)
      setError("Não foi possível atualizar a imagem. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  // Abrir seletor de arquivo
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Usuário</CardTitle>
        <CardDescription>Gerencie suas informações pessoais e configurações</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="account">Conta</TabsTrigger>
              <TabsTrigger value="preferences">Preferências</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              {success && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Sucesso!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Suas informações foram atualizadas com sucesso.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="mb-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col items-center mb-6">
                <div
                  className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-green-500 mb-3 cursor-pointer"
                  onClick={handleImageClick}
                >
                  {profileData.profileImage ? (
                    <img
                      src={profileData.profileImage || "/placeholder.svg"}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-200">
                      <User className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <span className="text-sm text-gray-500">Clique para alterar a foto</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    value={profileData.email}
                    disabled
                    className="col-span-3 bg-gray-100"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="whatsapp" className="text-right">
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    value={profileData.whatsapp}
                    onChange={handleInputChange}
                    placeholder="+5511987654321"
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="churchName" className="text-right">
                    Nome da Igreja
                  </Label>
                  <Input
                    id="churchName"
                    name="churchName"
                    value={profileData.churchName}
                    onChange={handleInputChange}
                    placeholder="Ex: Igreja Batista Ágape"
                    className="col-span-3"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h3 className="text-lg font-medium text-amber-800 mb-2">Configurações da Conta</h3>
                  <p className="text-amber-700 mb-2">
                    Aqui você poderá alterar sua senha e gerenciar configurações de segurança.
                  </p>
                  <p className="text-amber-600 text-sm">
                    Esta funcionalidade estará disponível em breve. Por enquanto, você pode usar a opção "Esqueci minha
                    senha" na tela de login para redefinir sua senha.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-medium text-blue-800 mb-2">Preferências do Sistema</h3>
                  <p className="text-blue-700 mb-2">
                    Aqui você poderá personalizar suas preferências de notificações e aparência.
                  </p>
                  <p className="text-blue-600 text-sm">
                    Esta funcionalidade estará disponível em breve. Fique atento às próximas atualizações.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {activeTab === "profile" && (
          <Button
            className="bg-green-500 hover:bg-green-600"
            onClick={handleSaveProfile}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
