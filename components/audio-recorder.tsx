"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Send, Loader2 } from "lucide-react"

interface AudioRecorderProps {
  // Callback chamado com a URL do áudio JÁ CONVERTIDO E NO FIREBASE
  onAudioReady: (convertedAudioUrl: string) => void
  // Estado de processamento geral (pode vir do componente pai)
  isProcessing: boolean
}

export function AudioRecorder({ onAudioReady, isProcessing: isParentProcessing }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  // Estado para indicar processamento no servidor VPS
  const [isProcessingOnServer, setIsProcessingOnServer] = useState(false)
  const [audioUrlForPlayback, setAudioUrlForPlayback] = useState<string | null>(null) // URL local para playback
  const [processError, setProcessError] = useState<string | null>(null) // Erro do processo

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Limpar temporizador e URL de objeto quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioUrlForPlayback) {
        URL.revokeObjectURL(audioUrlForPlayback)
      }
    }
  }, [audioUrlForPlayback])

  // Iniciar gravação
  const startRecording = async () => {
    try {
      // Limpar estado anterior
      setAudioBlob(null)
      if (audioUrlForPlayback) {
        URL.revokeObjectURL(audioUrlForPlayback)
        setAudioUrlForPlayback(null)
      }
      setProcessError(null)
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const options = { mimeType: "audio/ogg; codecs=opus" }
      let recorder
      try {
        recorder = new MediaRecorder(stream, options)
      } catch (e) {
        console.warn("Formato OGG/Opus não suportado diretamente, tentando padrão (provavelmente webm/opus):", e)
        recorder = new MediaRecorder(stream) // Fallback para o padrão do navegador
      }
      mediaRecorderRef.current = recorder

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const actualMimeType = mediaRecorderRef.current?.mimeType || "audio/webm" // Mimetype real ou fallback
        console.log("MimeType da gravação:", actualMimeType)
        const blob = new Blob(audioChunksRef.current, { type: actualMimeType })
        setAudioBlob(blob)

        const url = URL.createObjectURL(blob)
        setAudioUrlForPlayback(url) // Salva URL local para playback

        stream.getTracks().forEach((track) => track.stop()) // Para o stream do microfone
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error)
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.")
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
    if (audioUrlForPlayback && audioRef.current) {
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

  // Enviar áudio para a API de CONVERSÃO na VPS
  const processAndSendAudio = async () => {
    if (!audioBlob) return

    setIsProcessingOnServer(true)
    setProcessError(null)

    try {
      const formData = new FormData()
      const fileExtension = audioBlob.type.includes("ogg") ? "ogg" : "webm"
      formData.append("audio", audioBlob, `recording-${Date.now()}.${fileExtension}`)

      console.log("Enviando áudio para conversão na VPS...")
      // *** IP DA VPS INSERIDO AQUI ***
      const VPS_CONVERSION_URL = "http://173.212.249.202:3001/convert"
      const convertResponse = await fetch(VPS_CONVERSION_URL, {
        method: "POST",
        // headers: { 'X-API-Key': 'SUA_CHAVE_SECRETA' }, // Se tiver chave de API
        body: formData,
      })

      if (!convertResponse.ok) {
        let errorData = { error: `Erro HTTP ${convertResponse.status}`, details: await convertResponse.text() }
        try {
          errorData = await convertResponse.json()
        } catch (e) {
          /* Ignora */
        }
        console.error("Falha na conversão:", convertResponse.status, errorData)
        throw new Error(`Falha ao converter áudio (${convertResponse.status}): ${errorData.details || errorData.error}`)
      }

      const convertResult = await convertResponse.json()
      const convertedAudioUrl = convertResult.url

      if (!convertedAudioUrl) {
        throw new Error("URL do áudio convertido não recebida da API de conversão.")
      }
      console.log("URL do áudio convertido recebida:", convertedAudioUrl)

      // Chama o callback do componente pai com a URL CONVERTIDA
      onAudioReady(convertedAudioUrl)
    } catch (error) {
      console.error("Erro ao processar/enviar áudio:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setProcessError(errorMessage)
    } finally {
      setIsProcessingOnServer(false)
    }
  }

  // Formatar tempo de gravação
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-gray-50 w-full max-w-md mx-auto">
      <div className={`text-2xl font-mono mb-4 ${isRecording ? "text-red-600 animate-pulse" : "text-gray-700"}`}>
        {formatTime(recordingTime)}
      </div>

      <div className="flex items-center gap-4 mb-4">
        {!audioBlob ? (
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
            size="lg"
            disabled={isProcessingOnServer || isParentProcessing}
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
          <>
            <Button
              type="button"
              onClick={playRecording}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full flex-shrink-0"
              disabled={isProcessingOnServer || isParentProcessing}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Square className="h-5 w-5 text-orange-500" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button
              type="button"
              onClick={processAndSendAudio}
              className="bg-blue-500 hover:bg-blue-600"
              disabled={isProcessingOnServer || isParentProcessing}
              style={{ minWidth: "150px" }}
            >
              {isProcessingOnServer ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Processar e Enviar
                </>
              )}
            </Button>
          </>
        )}
      </div>

      <audio
        ref={audioRef}
        src={audioUrlForPlayback || undefined}
        onEnded={handleAudioEnded}
        controls={false}
        className="hidden"
      />

      {audioBlob && !processError && !isProcessingOnServer && (
        <p className="text-sm text-gray-500 text-center">
          Áudio gravado! Clique em ▶ para ouvir ou 'Processar e Enviar'.
        </p>
      )}
      {isProcessingOnServer && (
        <p className="text-sm text-blue-500 text-center">Enviando para conversão no servidor...</p>
      )}
      {processError && (
        <p className="text-sm text-red-500 mt-2 p-2 bg-red-100 border border-red-300 rounded text-center w-full">
          Erro: {processError}
        </p>
      )}
    </div>
  )
}
