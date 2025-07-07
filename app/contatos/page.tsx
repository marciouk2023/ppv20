"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar, Search, Filter, Upload, Plus, Trash2, Camera, Phone, Mail, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
// Replace the incorrect import
// Change this line:
// To import addDoc directly from Firebase:
import { addDoc, collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
// Primeiro, vamos atualizar as importações para incluir as funções do Firestore necessárias para edição e exclusão
import { db } from "@/lib/firebase-config"
import { getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"

export default function ContatosPage() {
  // Estado para contatos do Firebase
  const [contatos, setContatos] = useState<any[]>([])
  const [filtro, setFiltro] = useState("todos")
  const [busca, setBusca] = useState("")
  const [novoContato, setNovoContato] = useState({
    nome: "",
    telefone: "",
    grupo: "",
    avatar: "",
    dataNascimento: "",
    email: "",
  })
  const [modalAberto, setModalAberto] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [contatoSelecionado, setContatoSelecionado] = useState<any>(null)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [contatoEditado, setContatoEditado] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuth()
  const { toast } = useToast()

  // Load contacts when component mounts
  useEffect(() => {
    const loadContacts = async () => {
      if (user?.uid && user?.email) {
        try {
          setIsLoading(true)

          // Buscar contatos do Firebase
          const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
          const q = query(contactsRef, orderBy("nome"))
          const snapshot = await getDocs(q)

          // Mapear documentos para o formato esperado pela interface
          const loadedContacts = snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              nome: data.nome || "",
              telefone: data.telefone || "",
              celular: data.telefone || "", // Usar o mesmo campo para celular
              grupo: data.grupo || "Geral",
              dataNascimento: data.data_de_nascimento || "",
              email: data.email || "",
              avatar: data.nome ? data.nome.charAt(0).toUpperCase() : "?",
              idade: calcularIdade(data.data_de_nascimento || ""),
            }
          })

          setContatos(loadedContacts)

          toast({
            title: "Contatos carregados",
            description: `${loadedContacts.length} contatos encontrados.`,
          })
        } catch (error) {
          console.error("Error loading contacts:", error)
          toast({
            title: "Erro",
            description: "Não foi possível carregar os contatos do Firebase.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadContacts()
  }, [user, toast])

  // Function to calculate days until birthday
  const calcularDiasParaAniversario = (dataNascimento: string): number => {
    if (!dataNascimento) return 365 // Default to end of list if no date

    // Use current date for calculations
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)

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

  // Calculate days until birthday for each contact and sort
  const contatosComDias = contatos.map((contato) => ({
    ...contato,
    diasParaAniversario: calcularDiasParaAniversario(contato.dataNascimento),
  }))

  // Sort contacts by days until birthday
  const contatosOrdenados = [...contatosComDias].sort((a, b) => a.diasParaAniversario - b.diasParaAniversario)

  // Filter contacts
  const contatosFiltrados = contatosOrdenados.filter((contato) => {
    // Search filter
    if (busca && !contato.nome.toLowerCase().includes(busca.toLowerCase())) {
      return false
    }

    // Upcoming birthdays filter
    if (filtro === "proximos" && calcularDiasParaAniversario(contato.dataNascimento) > 7) {
      return false
    }

    return true
  })

  // Agora, vamos modificar a função excluirContato para realmente excluir do Firebase
  // Substitua a função excluirContato atual por esta:

  // Function to delete contact
  const excluirContato = async (id: string) => {
    try {
      if (!user?.email) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        })
        return
      }

      // Referência ao documento no Firestore
      const contactRef = doc(db, `parabenspravoce/${user.email}/users`, id)

      // Excluir o documento do Firestore
      await deleteDoc(contactRef)

      // Atualizar o estado local removendo o contato
      setContatos(contatos.filter((contato) => contato.id !== id))

      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso do Firebase.",
      })
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o contato do Firebase.",
        variant: "destructive",
      })
    }
  }

  // Function to handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNovoContato({
      ...novoContato,
      [name]: value,
    })
  }

  // Function to handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Agora, vamos modificar a função adicionarContato para usar o formato correto do Firebase
  // Substitua a função adicionarContato atual por esta:

  // Function to add new contact
  const adicionarContato = async () => {
    if (novoContato.nome.trim() === "") return

    try {
      if (!user?.uid || !user?.email) {
        throw new Error("Usuário não autenticado")
      }

      // Preparar os dados no formato esperado pelo Firebase
      const contatoParaAdicionar = {
        nome: novoContato.nome,
        telefone: novoContato.telefone,
        data_de_nascimento: novoContato.dataNascimento,
        grupo: novoContato.grupo || "Geral",
        email: novoContato.email || "",
        createdAt: new Date(),
        userId: user.uid, // Adicionar ID do usuário para regras de segurança
      }

      // Referência à coleção no Firestore
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)

      // Adicionar o documento ao Firestore
      const docRef = await addDoc(contactsRef, contatoParaAdicionar)

      // Atualizar o estado local
      const novoContatoFormatado = {
        id: docRef.id,
        nome: novoContato.nome,
        telefone: novoContato.telefone,
        celular: novoContato.telefone,
        grupo: novoContato.grupo || "Geral",
        dataNascimento: novoContato.dataNascimento,
        email: novoContato.email || "",
        avatar: novoContato.nome.charAt(0).toUpperCase(),
        diasParaAniversario: calcularDiasParaAniversario(novoContato.dataNascimento),
        idade: calcularIdade(novoContato.dataNascimento),
      }

      setContatos([...contatos, novoContatoFormatado])

      // Reset form
      setNovoContato({
        nome: "",
        telefone: "",
        grupo: "",
        avatar: "",
        dataNascimento: "",
        email: "",
      })
      setPreviewImage(null)
      setModalAberto(false)

      toast({
        title: "Contato adicionado",
        description: "O contato foi adicionado com sucesso ao Firebase.",
      })
    } catch (error) {
      console.error("Error adding contact:", error)
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o contato ao Firebase.",
        variant: "destructive",
      })
    }
  }

  // Function to view contact details
  const verDetalhesContato = (contato: any) => {
    setContatoSelecionado(contato)
    setModalDetalhesAberto(true)
  }

  // Função para formatar a data
  const formatarData = (dataString: string) => {
    if (!dataString) return "Data não informada"

    // Verificar se a data está no formato DD/MM/AAAA
    if (dataString.includes("/")) {
      return dataString
    }

    try {
      const data = new Date(dataString)
      return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      return dataString
    }
  }

  // Função para calcular a idade com base na data de nascimento
  const calcularIdade = (dataNascimento: string) => {
    if (!dataNascimento) return ""

    // Verificar se a data está no formato DD/MM/AAAA
    let nascimento
    if (dataNascimento.includes("/")) {
      const [dia, mes, ano] = dataNascimento.split("/")
      nascimento = new Date(`${ano}-${mes}-${dia}`)
    } else {
      nascimento = new Date(dataNascimento)
    }

    if (isNaN(nascimento.getTime())) return ""

    const hoje = new Date()
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()

    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }

    return idade === 1 ? "1 Ano" : `${idade} Anos`
  }

  // Function to start editing contact
  const iniciarEdicaoContato = () => {
    setContatoEditado({ ...contatoSelecionado })
    setModoEdicao(true)
  }

  // Agora, vamos modificar a função salvarContatoEditado para atualizar no Firebase
  // Substitua a função salvarContatoEditado atual por esta:

  // Function to save edited contact
  const salvarContatoEditado = async () => {
    if (!contatoEditado || !user?.email) return

    try {
      // Preparar os dados para atualização no formato esperado pelo Firebase
      const dadosAtualizados = {
        nome: contatoEditado.nome,
        telefone: contatoEditado.telefone || contatoEditado.celular,
        data_de_nascimento: contatoEditado.dataNascimento,
        grupo: contatoEditado.grupo || "Geral",
        email: contatoEditado.email || "",
        updatedAt: new Date(),
      }

      // Referência ao documento no Firestore
      const contactRef = doc(db, `parabenspravoce/${user.email}/users`, contatoEditado.id)

      // Atualizar o documento no Firestore
      await updateDoc(contactRef, dadosAtualizados)

      // Atualizar o estado local
      setContatos(
        contatos.map((c) =>
          c.id === contatoEditado.id
            ? {
                ...c,
                nome: contatoEditado.nome,
                telefone: contatoEditado.telefone || contatoEditado.celular,
                celular: contatoEditado.telefone || contatoEditado.celular,
                dataNascimento: contatoEditado.dataNascimento,
                grupo: contatoEditado.grupo || "Geral",
                email: contatoEditado.email || "",
                diasParaAniversario: calcularDiasParaAniversario(contatoEditado.dataNascimento),
              }
            : c,
        ),
      )

      setContatoSelecionado({
        ...contatoEditado,
        diasParaAniversario: calcularDiasParaAniversario(contatoEditado.dataNascimento),
      })
      setModoEdicao(false)

      toast({
        title: "Contato atualizado",
        description: "O contato foi atualizado com sucesso no Firebase.",
      })
    } catch (error) {
      console.error("Error updating contact:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o contato no Firebase.",
        variant: "destructive",
      })
    }
  }

  // Function to handle edit input changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setContatoEditado({
      ...contatoEditado,
      [name]: value,
    })
  }

  // Function to handle edit image upload
  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        // Update the avatar with the first letter of the name (in case the name changes)
        const avatarLetra = contatoEditado.nome.charAt(0).toUpperCase()
        setContatoEditado({
          ...contatoEditado,
          avatar: avatarLetra,
          // In a real system, you would store the image URL here
        })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="contatos" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29] mb-6">Contatos</h1>

          {/* Filters and actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button
                variant={filtro === "proximos" ? "default" : "outline"}
                className={filtro === "proximos" ? "bg-green-500 hover:bg-green-600" : ""}
                onClick={() => setFiltro(filtro === "proximos" ? "todos" : "proximos")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Próximos Aniversários
              </Button>
              <Button
                variant={filtro === "todos" ? "default" : "outline"}
                className={filtro === "todos" ? "bg-green-500 hover:bg-green-600" : ""}
                onClick={() => setFiltro("todos")}
              >
                Todos os Contatos
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>

              <Button className="bg-green-500 hover:bg-green-600" onClick={() => setModalAberto(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Contato
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar contatos..."
              className="pl-10"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {/* Contact counter */}
          <p className="text-sm text-gray-500 mb-4">
            {contatosFiltrados.length} contatos encontrados, ordenados por proximidade do aniversário
          </p>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            // Contact list
            <div className="space-y-2">
              {contatosFiltrados.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                  <p className="text-gray-500">Nenhum contato encontrado.</p>
                </div>
              ) : (
                contatosFiltrados.map((contato) => (
                  <div
                    key={contato.id}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      calcularDiasParaAniversario(contato.dataNascimento) === 0
                        ? "bg-green-200 border-l-4 border-green-500"
                        : calcularDiasParaAniversario(contato.dataNascimento) <= 3
                          ? "bg-green-100 border-l-4 border-green-300"
                          : calcularDiasParaAniversario(contato.dataNascimento) <= 7
                            ? "bg-green-50"
                            : "bg-white"
                    }`}
                    onClick={() => verDetalhesContato(contato)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-600">
                        <span className="text-sm font-medium">{contato.avatar}</span>
                      </div>
                      <div>
                        <div className="font-medium">{contato.nome}</div>
                        {contato.telefone && <div className="text-sm text-gray-500">{contato.telefone}</div>}
                        {!contato.telefone && contato.celular && (
                          <div className="text-sm text-gray-500">{contato.celular}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        {contato.grupo || "Geral"}
                      </span>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {calcularDiasParaAniversario(contato.dataNascimento) === 0 ? (
                          <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            HOJE!
                          </span>
                        ) : (
                          <span className="text-sm">
                            Em {calcularDiasParaAniversario(contato.dataNascimento)} dias
                            {contato.dataNascimento && ` (${formatarData(contato.dataNascimento).substring(0, 5)})`}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          excluirContato(contato.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add contact modal */}
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Contato</DialogTitle>
                <DialogDescription>Preencha os dados do novo contato abaixo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative mb-2">
                    {previewImage ? (
                      <div className="h-20 w-20 rounded-full overflow-hidden">
                        <img
                          src={previewImage || "/placeholder.svg"}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-orange-200 flex items-center justify-center text-orange-600">
                        <span className="text-xl font-medium">
                          {novoContato.nome ? novoContato.nome.charAt(0).toUpperCase() : "?"}
                        </span>
                      </div>
                    )}
                    <label
                      htmlFor="photo-upload"
                      className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-white" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <span className="text-sm text-gray-500">Clique para adicionar foto</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nome" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={novoContato.nome}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="telefone" className="text-right">
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={novoContato.telefone}
                    onChange={handleInputChange}
                    placeholder="+55 00 00000-0000"
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
                    type="email"
                    value={novoContato.email}
                    onChange={handleInputChange}
                    placeholder="email@exemplo.com"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grupo" className="text-right">
                    Tags/Grupo
                  </Label>
                  <Input
                    id="grupo"
                    name="grupo"
                    value={novoContato.grupo}
                    onChange={handleInputChange}
                    placeholder="Ex: Igreja, Família, Trabalho"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dataNascimento" className="text-right">
                    Data de Nascimento
                  </Label>
                  <Input
                    id="dataNascimento"
                    name="dataNascimento"
                    type="date"
                    value={novoContato.dataNascimento}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={adicionarContato}
                  disabled={!novoContato.nome}
                >
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Contact details modal */}
          <Dialog
            open={modalDetalhesAberto}
            onOpenChange={(open) => {
              setModalDetalhesAberto(open)
              if (!open) setModoEdicao(false)
            }}
          >
            <DialogContent className="sm:max-w-[500px]">
              {contatoSelecionado && (
                <>
                  <DialogHeader>
                    <DialogTitle>Detalhes do Contato</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative mb-2">
                        <div className="h-24 w-24 rounded-full bg-orange-200 flex items-center justify-center text-orange-600">
                          <span className="text-3xl font-medium">
                            {modoEdicao ? contatoEditado.avatar : contatoSelecionado.avatar}
                          </span>
                        </div>
                        {modoEdicao && (
                          <>
                            <label
                              htmlFor="edit-photo-upload"
                              className="absolute bottom-0 right-0 bg-green-500 rounded-full p-2 cursor-pointer"
                            >
                              <Camera className="h-4 w-4 text-white" />
                            </label>
                            <input
                              id="edit-photo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleEditImageUpload}
                            />
                          </>
                        )}
                      </div>

                      {modoEdicao ? (
                        <Input
                          name="nome"
                          value={contatoEditado.nome}
                          onChange={handleEditChange}
                          className="text-center font-bold text-lg mt-2 mb-1"
                        />
                      ) : (
                        <h2 className="text-xl font-bold">{contatoSelecionado.nome}</h2>
                      )}

                      {contatoSelecionado.diasParaAniversario === 0 && (
                        <div className="mt-2 bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium flex items-center">
                          <Gift className="h-4 w-4 mr-1" />
                          Faz aniversário hoje!
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {(contatoSelecionado.telefone || contatoSelecionado.celular) && (
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-full">
                            <Phone className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="w-full">
                            <p className="text-sm text-gray-500">Telefone/Celular</p>
                            {modoEdicao ? (
                              <Input
                                name="telefone"
                                value={contatoEditado.telefone || contatoEditado.celular || ""}
                                onChange={handleEditChange}
                                className="mt-1"
                              />
                            ) : (
                              <p className="font-medium">{contatoSelecionado.telefone || contatoSelecionado.celular}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {contatoSelecionado.email && (
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-full">
                            <Mail className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="w-full">
                            <p className="text-sm text-gray-500">Email</p>
                            {modoEdicao ? (
                              <Input
                                name="email"
                                value={contatoEditado.email || ""}
                                onChange={handleEditChange}
                                className="mt-1"
                              />
                            ) : (
                              <p className="font-medium">{contatoSelecionado.email}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-full">
                          <Calendar className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="w-full">
                          <p className="text-sm text-gray-500">Data de Nascimento</p>
                          {modoEdicao ? (
                            <Input
                              name="dataNascimento"
                              type="date"
                              value={contatoEditado.dataNascimento || ""}
                              onChange={handleEditChange}
                              className="mt-1"
                            />
                          ) : (
                            <p className="font-medium">
                              {formatarData(contatoSelecionado.dataNascimento)} (
                              {calcularIdade(contatoSelecionado.dataNascimento)})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-full">
                          <Filter className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="w-full">
                          <p className="text-sm text-gray-500">Grupo/Tags</p>
                          {modoEdicao ? (
                            <Input
                              name="grupo"
                              value={contatoEditado.grupo || ""}
                              onChange={handleEditChange}
                              className="mt-1"
                            />
                          ) : (
                            <div className="flex gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                {contatoSelecionado.grupo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModoEdicao(false)
                        setModalDetalhesAberto(false)
                      }}
                    >
                      Fechar
                    </Button>
                    {modoEdicao && (
                      <Button variant="outline" onClick={() => setModoEdicao(false)} className="mr-2">
                        Cancelar Edição
                      </Button>
                    )}
                    <Button
                      className="bg-green-500 hover:bg-green-600"
                      onClick={modoEdicao ? salvarContatoEditado : iniciarEdicaoContato}
                    >
                      {modoEdicao ? "Salvar Alterações" : "Editar Contato"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
