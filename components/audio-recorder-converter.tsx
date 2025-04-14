"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Send, Loader2 } from "lucide-react"

interface AudioRecorderConverterProps {
  phoneNumber: string
  userEmail: string
  onSuccess: () => void
  onError: (error: string) => void
}

export function AudioRecorderConverter({ phoneNumber, userEmail, onSuccess, onError }: AudioRecorderConverterProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("Inativo")

  // URL of the conversion server (ngrok)
  const CONVERSION_SERVER_URL = "https://00e8-173-212-249-202.ngrok-free.app/upload-audio"

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Clean up timer when component unmounts
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

  // Start recording
  const startRecording = async () => {
    try {
      setStatus("Requesting microphone permission...")
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Configure MediaRecorder to use webm
      let mediaRecorder: MediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        })
      } catch (e) {
        console.warn("audio/webm format not supported, using default")
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Create final blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        })
        setAudioBlob(audioBlob)

        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        // Stop all stream tracks
        stream.getTracks().forEach((track) => track.stop())

        setStatus("Recording completed")
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setStatus("Recording...")

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
      setStatus("Error: Could not access microphone")
      onError("Could not access microphone. Check browser permissions.")
    }
  }

  // Stop recording
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

  // Play recorded audio
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

  // Event when audio finishes playing
  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  // Send audio to conversion server
  const convertAudio = async () => {
    if (!audioBlob) {
      setStatus("Error: No audio recorded")
      return null
    }

    try {
      setStatus("Sending audio for conversion...")

      // Create FormData and attach blob
      const formData = new FormData()
      formData.append("audioFile", audioBlob, "recording.webm")

      // Send to conversion server (using ngrok URL)
      const response = await fetch(CONVERSION_SERVER_URL, {
        method: "POST",
        body: formData,
      })

      // Check if request was successful
      if (!response.ok) {
        throw new Error(`Request error: ${response.status} ${response.statusText}`)
      }

      // Convert response to JSON
      const data = await response.json()

      // Check if conversion was successful
      if (!data.success) {
        throw new Error(data.message || "Unknown error in conversion")
      }

      // Store converted file URL
      setConvertedUrl(data.fileUrl)
      setStatus("Audio converted successfully")

      return data.fileUrl
    } catch (error) {
      console.error("Error converting audio:", error)
      setStatus(`Conversion error: ${error instanceof Error ? error.message : "Unknown error"}`)
      return null
    }
  }

  // Send converted audio to WhatsApp
  const sendToWhatsApp = async (audioUrl: string) => {
    if (!userEmail) {
      setStatus("Error: User email not provided")
      onError("You must be logged in to send audio")
      return false
    }

    try {
      setStatus("Sending audio to WhatsApp...")

      const response = await fetch("https://api.parabenspravoce.com/api/sendVoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          audioUrl,
          userEmail,
          mimeType: "audio/ogg; codecs=opus",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Error sending audio")
      }

      setStatus("Audio sent successfully!")
      return true
    } catch (error) {
      console.error("Error sending audio to WhatsApp:", error)
      setStatus(`Error sending to WhatsApp: ${error instanceof Error ? error.message : "Unknown error"}`)
      throw error
    }
  }

  // Complete process: convert and send
  const sendAudio = async () => {
    if (!audioBlob) {
      onError("No audio recorded to send")
      return
    }

    if (!userEmail) {
      onError("You must be logged in to send audio")
      return
    }

    try {
      setIsSending(true)

      // Step 1: Convert the audio
      const convertedAudioUrl = await convertAudio()

      if (!convertedAudioUrl) {
        throw new Error("Failed to convert audio")
      }

      // Step 2: Send the converted audio to WhatsApp
      await sendToWhatsApp(convertedAudioUrl)

      // Success!
      onSuccess()

      // Clear state
      setAudioBlob(null)
      setAudioUrl(null)
      setConvertedUrl(null)
      setRecordingTime(0)
      setStatus("Inactive")
    } catch (error) {
      console.error("Error in sending process:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      onError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-gray-50">
      {/* Recording time */}
      <div className="text-2xl font-mono mb-4">{formatTime(recordingTime)}</div>

      {/* Status */}
      <div className="text-sm text-gray-600 mb-4">Status: {status}</div>

      {/* Recording controls */}
      <div className="flex items-center gap-4 mb-4">
        {!audioBlob ? (
          // Recording button
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            size="lg"
            disabled={isSending}
          >
            {isRecording ? (
              <>
                <Square className="h-5 w-5 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Record
              </>
            )}
          </Button>
        ) : (
          // Play and send buttons
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={playRecording}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              disabled={isSending}
            >
              <Play className={`h-5 w-5 ${isPlaying ? "text-green-500" : ""}`} />
            </Button>

            <Button
              type="button"
              onClick={sendAudio}
              className="bg-green-500 hover:bg-green-600"
              disabled={isSending || !userEmail}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send Audio
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl || undefined} onEnded={handleAudioEnded} className="hidden" />

      {/* Status message */}
      {audioBlob && !isSending && (
        <p className="text-sm text-gray-500">Click "Send Audio" to convert and send the voice message.</p>
      )}

      {/* Converted URL (for debug) */}
      {convertedUrl && (
        <div className="mt-4 text-xs text-gray-500 break-all">
          <p>Converted URL:</p>
          <p className="bg-gray-100 p-2 rounded">{convertedUrl}</p>
        </div>
      )}
    </div>
  )
}
