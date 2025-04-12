"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Mic, Send, Save, PlayCircle, StopCircle, Loader2 } from "lucide-react"
import { initializeApp } from "firebase/app"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

// Configuração do Firebase - substitua com suas próprias credenciais
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const storage = getStorage(app)

export function AudioRecorderFirebase() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<{ success?: boolean; message: string } | null>(null)
  const [storedAudios, setStoredAudios] = useState<{ name: string; url: string }[]>([])
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  // Carregar áudios salvos ao iniciar
  useEffect(() => {
    // Aqui você pode carregar áudios salvos do usuário
    // Exemplo simples - na implementação real, busque do Firebase
    const loadSavedAudios = async () => {
      try {
        // Implementação de exemplo - substitua por chamada ao Firebase
        // Em uma implementação real, você listaria os itens da pasta do usuário
        setStoredAudios([])
      } catch (error) {
        console.error("Erro ao carregar áudios salvos:", error)
      }
    }

    loadSavedAudios()
  }, [])

  // Função para iniciar a gravação
  const startRecording = async () => {
    try {
      // Limpar estados anteriores
      setStatus(null)
      setAudioBlob(null)
      setAudioUrl(null)
      setSelectedAudio(null)

      // Solicitar permissão para acessar o microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Criar o MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Configurar evento para coletar dados de áudio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Configurar evento para quando a gravação for finalizada
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))

        // Parar todas as faixas da stream
        stream.getTracks().forEach((track) => track.stop())
      }

      // Iniciar a gravação
      mediaRecorder.start()
      setRecording(true)
      console.log("[AudioRecorder] Gravação iniciada")
    } catch (error) {
      console.error("[AudioRecorder] Erro ao iniciar gravação:", error)
      setStatus({
        success: false,
        message: `Erro ao iniciar gravação: ${error instanceof Error ? error.message : "Acesso ao microfone negado"}`,
      })
    }
  }

  // Função para parar a gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      console.log("[AudioRecorder] Gravação finalizada")
    }
  }

  // Função para reproduzir/pausar o áudio
  const togglePlayback = () => {
    if (!audioPlayerRef.current) return

    if (isPlaying) {
      audioPlayerRef.current.pause()
    } else {
      audioPlayerRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  // Função para salvar o áudio no Firebase
  const saveAudioToFirebase = async () => {
    if (!audioBlob) {
      setStatus({ success: false, message: "Nenhum áudio gravado para salvar" })
      return
    }

    try {
      setUploading(true)
      setStatus(null)

      // Gerar nome único para o arquivo
      const timestamp = new Date().getTime()
      const filename = `audio_${timestamp}.ogg`
      const storageRef = ref(storage, `zapaudio/${filename}`)

      console.log("[AudioRecorder] Enviando áudio para Firebase Storage...")

      // Fazer upload do blob
      const snapshot = await uploadBytes(storageRef, audioBlob)

      // Obter URL de download
      const downloadURL = await getDownloadURL(snapshot.ref)

      console.log("[AudioRecorder] Áudio salvo com sucesso:", downloadURL)

      // Adicionar à lista de áudios salvos
      const newAudio = { name: filename, url: downloadURL }
      setStoredAudios((prev) => [...prev, newAudio])
      setSelectedAudio(downloadURL)

      setStatus({
        success: true,
        message: "Áudio salvo com sucesso! Agora você pode enviá-lo ou salvá-lo para uso posterior.",
      })
    } catch (error) {
      console.error("[AudioRecorder] Erro ao salvar áudio:", error)
      setStatus({
        success: false,
        message: `Erro ao salvar áudio: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      })
    } finally {
      setUploading(false)
    }
  }

  // Função para enviar o áudio via WhatsApp
  const sendAudio = async () => {
    const audioToSend = selectedAudio || (audioUrl ? "gravado" : null)

    if (!audioToSend) {
      setStatus({ success: false, message: "Selecione ou grave um áudio para enviar" })
      return
    }

    if (!phone) {
      setStatus({ success: false, message: "Digite o número de telefone do destinatário" })
      return
    }

    try {
      setSending(true)
      setStatus(null)

      console.log(`[AudioRecorder] Preparando envio de áudio para ${phone}`)

      const payload = {
        phone: phone,
        audioUrl: selectedAudio, // URL do Firebase
        sessionName: "default", // Você pode permitir que o usuário selecione
      }

      console.log("[AudioRecorder] Enviando áudio...", payload)

      // Enviar para o endpoint
      const response = await fetch("/api/whatsapp/send-audio-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || `Erro ${response.status}`)
      }

      console.log("[AudioRecorder] Áudio enviado com sucesso:", data)
      setStatus({ success: true, message: "Áudio enviado com sucesso!" })
    } catch (error) {
      console.error("[AudioRecorder] Erro ao enviar áudio:", error)
      setStatus({
        success: false,
        message: `Erro ao enviar áudio: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      })
    } finally {
      setSending(false)
    }
  }

  // Gerenciar eventos de reprodução do áudio
  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  // Selecionar um áudio salvo
  const selectAudio = (url: string) => {
    setSelectedAudio(url)
    setAudioUrl(null) // Limpar áudio gravado
    setAudioBlob(null)
    setStatus(null)
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Enviar Áudio pelo WhatsApp
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Número de telefone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Número de Telefone</Label>
          <Input
            id="phone"
            type="text"
            placeholder="Ex: 447897274321"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={recording || sending}
          />
          <p className="text-xs text-gray-500">
            Digite o número com código do país, sem espaços ou caracteres especiais
          </p>
        </div>

        {/* Controles de gravação */}
        <div className="space-y-3">
          <Label>Gravação de Áudio</Label>

          <div className="flex gap-2">
            {!recording ? (
              <Button variant="outline" onClick={startRecording} disabled={sending || uploading} className="gap-1.5">
                <Mic className="h-4 w-4" />
                Iniciar Gravação
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopRecording} className="gap-1.5">
                <StopCircle className="h-4 w-4" />
                Parar Gravação
              </Button>
            )}

            {audioUrl && (
              <Button variant="outline" onClick={togglePlayback} disabled={recording} className="gap-1.5">
                {isPlaying ? (
                  <>
                    <StopCircle className="h-4 w-4" /> Pausar
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" /> Reproduzir
                  </>
                )}
              </Button>
            )}

            {audioBlob && !uploading && (
              <Button
                variant="outline"
                onClick={saveAudioToFirebase}
                disabled={recording || !audioBlob}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                Salvar Áudio
              </Button>
            )}

            {uploading && (
              <Button variant="outline" disabled className="gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </Button>
            )}
          </div>

          {/* Player de áudio oculto */}
          {audioUrl && <audio ref={audioPlayerRef} src={audioUrl} onEnded={handleAudioEnded} className="hidden" />}
        </div>

        {/* Áudios salvos */}
        {storedAudios.length > 0 && (
          <div className="space-y-3">
            <Label>Áudios Salvos</Label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
              {storedAudios.map((audio, index) => (
                <div
                  key={index}
                  className={`p-2 rounded flex justify-between items-center cursor-pointer
                            ${selectedAudio === audio.url ? "bg-blue-100 border border-blue-300" : "bg-gray-50 hover:bg-gray-100"}`}
                  onClick={() => selectAudio(audio.url)}
                >
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm truncate max-w-[180px]">{audio.name}</span>
                  </div>
                  {selectedAudio === audio.url && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status e mensagens */}
        {status && (
          <div
            className={`p-3 border rounded flex items-start gap-2 
                      ${status.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
          >
            {status.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t pt-4">
        <span className="text-xs text-gray-500">
          {selectedAudio
            ? "Áudio selecionado do Firebase"
            : audioBlob
              ? "Áudio gravado localmente"
              : "Nenhum áudio selecionado"}
        </span>

        <Button
          onClick={sendAudio}
          disabled={(!selectedAudio && !audioBlob) || !phone || sending || recording}
          className="gap-1.5"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar Áudio
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
