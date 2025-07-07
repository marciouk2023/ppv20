"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-config"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { Upload, Download, FileText, AlertCircle, Loader2, CheckCircle, X } from "lucide-react"

export function ContactImportExport() {
  const [activeTab, setActiveTab] = useState("import")
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: boolean
    message: string
    imported: number
    errors: number
  } | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Manipular seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Verificar se é um arquivo CSV
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
      setImportResults(null)
    }
  }

  // Importar contatos do CSV
  const importContacts = async () => {
    if (!file || !user?.email) return

    try {
      setIsProcessing(true)
      setImportResults(null)

      // Ler o arquivo CSV
      const text = await file.text()
      const rows = text.split("\n")

      // Verificar se há cabeçalho
      if (rows.length < 2) {
        throw new Error("O arquivo CSV está vazio ou não contém dados suficientes.")
      }

      // Obter cabeçalho
      const header = rows[0].split(",").map((col) => col.trim().toLowerCase())

      // Verificar colunas obrigatórias
      const requiredColumns = ["nome", "telefone", "data_de_nascimento"]
      const missingColumns = requiredColumns.filter((col) => !header.includes(col))

      if (missingColumns.length > 0) {
        throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(", ")}`)
      }

      // Processar linhas
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
      let imported = 0
      let errors = 0

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim()
        if (!row) continue

        try {
          const values = row.split(",").map((val) => val.trim())

          // Criar objeto de contato
          const contact: Record<string, any> = {}
          header.forEach((col, index) => {
            if (index < values.length) {
              contact[col] = values[index]
            }
          })

          // Validar dados obrigatórios
          if (!contact.nome || !contact.telefone || !contact.data_de_nascimento) {
            errors++
            continue
          }

          // Adicionar ao Firestore
          await addDoc(contactsRef, {
            ...contact,
            createdAt: new Date(),
            importedAt: new Date(),
          })

          imported++
        } catch (error) {
          console.error(`Erro ao importar linha ${i}:`, error)
          errors++
        }
      }

      // Atualizar resultados
      setImportResults({
        success: true,
        message: `Importação concluída com ${imported} contatos importados e ${errors} erros.`,
        imported,
        errors,
      })

      toast({
        title: "Importação concluída",
        description: `${imported} contatos importados com sucesso.`,
      })
    } catch (error) {
      console.error("Erro ao importar contatos:", error)
      setImportResults({
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido ao importar contatos.",
        imported: 0,
        errors: 0,
      })

      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido ao importar contatos.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Exportar contatos para CSV
  const exportContacts = async () => {
    if (!user?.email) return

    try {
      setExportLoading(true)

      // Buscar contatos do Firestore
      const contactsRef = collection(db, `parabenspravoce/${user.email}/users`)
      const snapshot = await getDocs(contactsRef)

      if (snapshot.empty) {
        toast({
          title: "Nenhum contato",
          description: "Não há contatos para exportar.",
          variant: "destructive",
        })
        return
      }

      // Definir cabeçalho do CSV
      const header = ["nome", "telefone", "email", "data_de_nascimento", "grupo"]

      // Converter contatos para linhas CSV
      const rows = [header.join(",")]

      snapshot.forEach((doc) => {
        const data = doc.data()
        const row = header.map((col) => {
          const value = data[col] || ""
          // Escapar aspas e adicionar aspas se necessário
          return value.toString().includes(",") ? `"${value.replace(/"/g, '""')}"` : value
        })
        rows.push(row.join(","))
      })

      // Criar blob e link para download
      const csvContent = rows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `contatos_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Exportação concluída",
        description: `${snapshot.size} contatos exportados com sucesso.`,
      })
    } catch (error) {
      console.error("Erro ao exportar contatos:", error)
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os contatos.",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar e Exportar Contatos</CardTitle>
        <CardDescription>Importe contatos de um arquivo CSV ou exporte seus contatos</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="import">Importar</TabsTrigger>
            <TabsTrigger value="export">Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isProcessing} />
              <p className="text-xs text-gray-500">
                O arquivo CSV deve conter as colunas: nome, telefone, data_de_nascimento (obrigatórias), email e grupo
                (opcionais).
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                <FileText className="h-5 w-5 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setFile(null)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {importResults && (
              <Alert className={importResults.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                {importResults.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertTitle className={importResults.success ? "text-green-800" : "text-red-800"}>
                  {importResults.success ? "Importação concluída" : "Erro na importação"}
                </AlertTitle>
                <AlertDescription className={importResults.success ? "text-green-700" : "text-red-700"}>
                  {importResults.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Formato do CSV</h3>
              <p className="text-xs text-blue-700 mb-2">O arquivo CSV deve seguir o seguinte formato:</p>
              <pre className="text-xs bg-white p-2 rounded border border-blue-100 overflow-x-auto">
                nome,telefone,email,data_de_nascimento,grupo João
                Silva,+5511987654321,joao@exemplo.com,1980-01-15,Amigos Maria
                Souza,+5511912345678,maria@exemplo.com,1992-05-20,Família
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg border text-center">
              <Download className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Exportar Contatos</h3>
              <p className="text-gray-600 mb-4">
                Exporte todos os seus contatos para um arquivo CSV que pode ser aberto no Excel ou Google Sheets.
              </p>
              <Button className="bg-green-500 hover:bg-green-600" onClick={exportContacts} disabled={exportLoading}>
                {exportLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Contatos
                  </>
                )}
              </Button>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Importante</AlertTitle>
              <AlertDescription className="text-amber-700">
                O arquivo exportado conterá todos os seus contatos. Tenha cuidado ao compartilhar este arquivo, pois ele
                contém informações pessoais.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {activeTab === "import" && (
          <Button className="bg-green-500 hover:bg-green-600" onClick={importContacts} disabled={!file || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar Contatos
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
