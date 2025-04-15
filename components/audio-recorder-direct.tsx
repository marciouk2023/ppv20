"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Send, Loader2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { initializeApp } from "firebase/app"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhVRy9BU62M6kpB_y9NoQqaU_y-AePG3A",
  authDomain: "mmlj---new-day-church.firebaseapp.com",
  projectId: "mmlj---new-day-church",
  storageBucket: "mmlj---new-day-church.firebasestorage.app",
  messagingSenderId: "1018979121797",
  appId: "1:1018979121797:web:ef5de75f9a6d46cfda07ec",
  measurementId: "G-5DK2QQ0RMH",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const storage = getStorage(app)

interface AudioRecorderDirectProps {
  phoneNumber: string
  onSuccess: () => void
  onError: (error: string) => void
}

export function AudioRecorderDirect({ phoneNumber, onSuccess, onError }: AudioRecorderDirectProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [firebaseUrl, setFirebaseUrl] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Limpar temporizador quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  // Iniciar gravação
  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Configurar o MediaRecorder para usar explicitamente o codec opus
      let mediaRecorder: MediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus", // Usar codecs=opus é importante
        })
      } catch (e) {
        console.warn("Codec opus não suportado, usando padrão")
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Manter o formato original da gravação
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm;codecs=opus",
        })
        setAudioBlob(audioBlob)

        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        // Parar todas as faixas do stream
        stream.getTracks().forEach((track) => track.stop())
      }

      // Iniciar gravação
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Iniciar temporizador
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error)
      onError("Não foi possível acessar o microfone. Verifique as permissões do navegador.")
    }
  }

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Reproduzir áudio gravado
  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  // Evento quando o áudio termina de tocar
  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  // Função para salvar o áudio no Firebase Storage
  const saveToFirebase = async () => {
    if (!audioBlob) return null

    try {
      setIsSaving(true)
      setSaveSuccess(false)
      setFirebaseUrl(null)

      // Gerar um nome único para o arquivo
      const fileName = `${uuidv4()}.opus`
      const storageRef = ref(storage, `zapaudio/${fileName}`)

      console.log(`Iniciando upload para Firebase Storage: zapaudio/${fileName}`)

      // Definir o contentType correto nos metadados
      const metadata = {
        contentType: "audio/ogg; codecs=opus",
      }

      // Fazer upload do blob com metadados
      const snapshot = await uploadBytes(storageRef, audioBlob, metadata)
      console.log("Upload concluído:", snapshot)

      // Obter URL de download
      const downloadUrl = await getDownloadURL(storageRef)
      console.log("URL de download obtida:", downloadUrl)

      // Atualizar estado
      setFirebaseUrl(downloadUrl)
      setSaveSuccess(true)
      return downloadUrl
    } catch (error) {
      console.error("Erro ao salvar áudio no Firebase:", error)
      onError(error instanceof Error ? error.message : "Erro ao salvar áudio")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  // Formatar tempo de gravação
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Função para enviar áudio convertido para o WhatsApp
  const sendConvertedAudio = async (audioUrl: string): Promise<void> => {
    try {
      console.log("Enviando áudio para o WhatsApp...")
      const response = await fetch("https://api.parabenspravoce.com/api/sendVoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          audioUrl,
          sessionName: "default",
          mimeType: "audio/ogg; codecs=opus", // Importante!
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Erro ao enviar áudio")
      }

      console.log("Áudio enviado com sucesso!")
    } catch (error) {
      console.error("Erro ao enviar áudio para o WhatsApp:", error)
      throw error
    }
  }

  // Enviar áudio usando o método direto (sem conversão)
  const sendAudio = async () => {
    if (!audioBlob) {
      onError("Nenhum áudio gravado para enviar")
      return
    }

    try {
      setIsSending(true)

      // Fazer upload para o Firebase e obter URL
      const url = await saveToFirebase()

      if (!url) {
        throw new Error("Falha ao obter URL do Firebase")
      }

      // Enviar para o WhatsApp
      await sendConvertedAudio(url)

      console.log(`[AudioRecorderDirect] Áudio enviado com sucesso`)
      onSuccess()

      // Limpar o estado
      setAudioBlob(null)
      setAudioUrl(null)
      setFirebaseUrl(null)
      setSaveSuccess(false)
      setRecordingTime(0)
    } catch (error) {
      console.error("[AudioRecorderDirect] Erro ao enviar áudio:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      onError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-gray-50">
      {/* Tempo de gravação */}
      <div className="text-2xl font-mono mb-4">{formatTime(recordingTime)}</div>

      {/* Controles de gravação */}
      <div className="flex items-center gap-4 mb-4">
        {!audioBlob ? (
          // Botão de gravação
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            size="lg"
            disabled={isSending || isSaving}
          >
            {isRecording ? (
              <>
                <Square className="h-5 w-5 mr-2" />
                Parar
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Gravar
              </>
            )}
          </Button>
        ) : (
          // Botões de reprodução e envio
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={playRecording}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              disabled={isSending || isSaving}
            >
              <Play className={`h-5 w-5 ${isPlaying ? "text-green-500" : ""}`} />
            </Button>

            <Button
              type="button"
              onClick={sendAudio}
              className="bg-green-500 hover:bg-green-600"
              disabled={isSending || isSaving}
            >
              {isSending || isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isSaving ? "Salvando..." : "Enviando..."}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Enviar Áudio
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Elemento de áudio (oculto) */}
      <audio ref={audioRef} src={audioUrl || undefined} onEnded={handleAudioEnded} className="hidden" />

      {/* Mensagem de status simplificada */}
      {audioBlob && <p className="text-sm text-gray-500">Clique em "Enviar Áudio" para enviar a mensagem de voz.</p>}

      {/* Mensagem de sucesso */}
      {saveSuccess && firebaseUrl && (
        <p className="text-sm text-green-600 mt-2">Áudio salvo com sucesso! Enviando para o WhatsApp...</p>
      )}
    </div>
  )
}
