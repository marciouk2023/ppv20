"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase-config"
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore"
import { getAuth, signInAnonymously } from "firebase/auth"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Check, AlertTriangle, Database, UserPlus, Trash2 } from "lucide-react"

// Dados de exemplo para os contatos (usaremos estes para popular a coleção de usuários)
const contatosData = [
  {
    id: 1,
    nome: "Davi da penha saldanha",
    telefone: "",
    celular: "+55 85 99100-9016",
    grupo: "Igreja",
    dataNascimento: "2014-04-01",
    email: "ivanicedapenha@gmail.com",
  },
  {
    id: 2,
    nome: "Maria Esther Freitas Almeida",
    telefone: "",
    celular: "+55 85 99210-1915",
    grupo: "Igreja",
    dataNascimento: "2019-04-01",
    email: "beatriz-09@hotmail.com",
  },
  {
    id: 3,
    nome: "Carlos Daniel Aprígio de Freitas",
    telefone: "",
    celular: "+55 85 99118-2649",
    grupo: "Igreja",
    dataNascimento: "2012-04-02",
    email: "",
  },
  {
    id: 4,
    nome: "Francisco de Paulo dos Santos Pereira",
    telefone: "",
    celular: "+55 85 99226-1864",
    grupo: "Igreja",
    dataNascimento: "1976-04-02",
    email: "",
  },
  {
    id: 5,
    nome: "ANTONIA RODRIGUES SOUSA",
    telefone: "+55+55 88 9294-3064",
    celular: "",
    grupo: "Igreja",
    dataNascimento: "1976-04-04",
    email: "vitoriarodriguessss001@gmail.com",
  },
  {
    id: 6,
    nome: "Lucas Eduardo De Souza Ramphal",
    telefone: "",
    celular: "",
    grupo: "Igreja",
    dataNascimento: "2008-04-05",
    email: "",
  },
  {
    id: 7,
    nome: "Thamyres Costa de Almeida Barros",
    telefone: "",
    celular: "+55 85 99250-8663",
    grupo: "Igreja",
    dataNascimento: "1995-04-07",
    email: "",
  },
  {
    id: 8,
    nome: "Aline Kelli Rocha nascimento",
    telefone: "",
    celular: "+55 85 99200-1360",
    grupo: "Igreja",
    dataNascimento: "1983-04-09",
    email: "alinekelliirocha@gmail.com",
  },
  {
    id: 9,
    nome: "Mizael Carneiro Melo",
    telefone: "",
    celular: "+55 85 98129-0167",
    grupo: "Igreja",
    dataNascimento: "2003-04-09",
    email: "",
  },
  {
    id: 10,
    nome: "Renê Oliveira Lima",
    telefone: "",
    celular: "",
    grupo: "Igreja",
    dataNascimento: "1993-04-09",
    email: "",
  },
]

// Adicionar a função para autenticação anônima
const autenticarAnonimamente = async () => {
  const auth = getAuth()
  try {
    const userCredential = await signInAnonymously(auth)
    console.log("Autenticado anonimamente:", userCredential.user.uid)
    return userCredential.user
  } catch (error) {
    console.error("Erro na autenticação anônima:", error)
    throw error
  }
}

export default function FirebaseSetupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usuariosExistentes, setUsuariosExistentes] = useState<any[]>([])
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(true)
  const [isDeletingUsers, setIsDeletingUsers] = useState(false)

  // Carregar usuários existentes ao montar o componente
  useEffect(() => {
    carregarUsuariosExistentes()
  }, [])

  // Modificar a função carregarUsuariosExistentes para incluir autenticação
  const carregarUsuariosExistentes = async () => {
    setIsLoadingUsuarios(true)
    try {
      // Primeiro, autenticar anonimamente
      await autenticarAnonimamente()

      const usuariosRef = collection(db, "batista-agape-ronaldo", "dados", "usuarios")
      const snapshot = await getDocs(usuariosRef)

      const usuarios = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setUsuariosExistentes(usuarios)
    } catch (err) {
      console.error("Erro ao carregar usuários:", err)
      setUsuariosExistentes([])
    } finally {
      setIsLoadingUsuarios(false)
    }
  }

  // Modificar a função criarColecaoEInserirUsuarios para incluir autenticação
  const criarColecaoEInserirUsuarios = async () => {
    setIsLoading(true)
    setSuccess(false)
    setError(null)

    try {
      // Primeiro, autenticar anonimamente
      await autenticarAnonimamente()
      console.log("Autenticação anônima bem-sucedida, prosseguindo com a criação da coleção")

      // Referência para a coleção principal
      const batistaAgapeRef = doc(db, "batista-agape-ronaldo", "dados")

      // Criar documento principal (se não existir)
      await setDoc(
        batistaAgapeRef,
        {
          nome: "Igreja Batista Ágape",
          criadoEm: new Date(),
          descricao: "Dados da Igreja Batista Ágape gerenciados por Ronaldo",
        },
        { merge: true },
      )

      // Referência para a subcoleção de usuários
      const usuariosRef = collection(batistaAgapeRef, "usuarios")

      // Inserir cada usuário
      for (const contato of contatosData) {
        const usuarioDoc = doc(usuariosRef)
        await setDoc(usuarioDoc, {
          nome: contato.nome,
          email: contato.email || null,
          telefone: contato.telefone || contato.celular || null,
          grupo: contato.grupo || "Geral",
          dataNascimento: contato.dataNascimento || null,
          criadoEm: new Date(),
        })
      }

      setSuccess(true)

      // Recarregar a lista de usuários
      await carregarUsuariosExistentes()
    } catch (err) {
      console.error("Erro ao criar coleção:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido ao criar coleção")
    } finally {
      setIsLoading(false)
    }
  }

  // Modificar a função limparUsuarios para incluir autenticação
  const limparUsuarios = async () => {
    if (!confirm("Tem certeza que deseja excluir todos os usuários? Esta ação não pode ser desfeita.")) {
      return
    }

    setIsDeletingUsers(true)
    try {
      // Primeiro, autenticar anonimamente
      await autenticarAnonimamente()

      const usuariosRef = collection(db, "batista-agape-ronaldo", "dados", "usuarios")
      const snapshot = await getDocs(usuariosRef)

      // Excluir cada documento
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))

      await Promise.all(deletePromises)

      // Recarregar a lista vazia
      await carregarUsuariosExistentes()
    } catch (err) {
      console.error("Erro ao excluir usuários:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido ao excluir usuários")
    } finally {
      setIsDeletingUsers(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8f7f2]">
      {/* Sidebar */}
      <Sidebar activePage="configuracoes" />

      {/* Main content */}
      <div className="flex-1 p-6 ml-[196px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[#1e3a29]">Configuração do Firebase</h1>
          <p className="text-gray-600 mb-6">Configure a coleção de usuários no Firebase Firestore</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Criar Coleção de Usuários
                </CardTitle>
                <CardDescription>
                  Crie a coleção "batista-agape-ronaldo" e insira os usuários no Firestore
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Esta ação irá criar uma coleção chamada "batista-agape-ronaldo" no Firebase Firestore, com um
                  documento "dados" e uma subcoleção "usuarios" contendo os dados dos contatos existentes.
                </p>

                {success && (
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Sucesso!</AlertTitle>
                    <AlertDescription className="text-green-700">
                      A coleção foi criada e os usuários foram inseridos com sucesso.
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert className="mb-4 bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle className="text-red-800">Erro</AlertTitle>
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={limparUsuarios}
                  disabled={isLoading || isDeletingUsers || usuariosExistentes.length === 0}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  {isDeletingUsers ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Limpar Usuários
                </Button>

                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={criarColecaoEInserirUsuarios}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar e Inserir Usuários
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Usuários no Firebase</CardTitle>
                <CardDescription>Lista de usuários armazenados na coleção</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsuarios ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                  </div>
                ) : usuariosExistentes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Nenhum usuário encontrado na coleção</div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <ul className="divide-y divide-gray-100">
                      {usuariosExistentes.map((usuario) => (
                        <li key={usuario.id} className="py-3">
                          <div className="font-medium">{usuario.nome}</div>
                          <div className="text-sm text-gray-500">
                            {usuario.email && <div>Email: {usuario.email}</div>}
                            {usuario.telefone && <div>Telefone: {usuario.telefone}</div>}
                            {usuario.dataNascimento && <div>Nascimento: {usuario.dataNascimento}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="text-sm text-gray-500">Total: {usuariosExistentes.length} usuários</div>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Estrutura do Firestore</h3>
            <pre className="bg-white p-3 rounded border border-blue-100 text-sm overflow-x-auto">
              {`
batista-agape-ronaldo/
  └── dados/
      ├── nome: "Igreja Batista Ágape"
      ├── criadoEm: timestamp
      ├── descricao: "Dados da Igreja Batista Ágape gerenciados por Ronaldo"
      └── usuarios/
          ├── [id-usuario-1]/
          │   ├── nome: "Nome do Usuário"
          │   ├── email: "email@exemplo.com"
          │   ├── telefone: "+5500000000000"
          │   ├── grupo: "Igreja"
          │   ├── dataNascimento: "YYYY-MM-DD"
          │   └── criadoEm: timestamp
          ├── [id-usuario-2]/
          │   └── ...
          └── ...
              `}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
