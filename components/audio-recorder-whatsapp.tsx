"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, Square, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function AudioRecorderWhatsApp() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [sending, setSending] = useState(false)
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<{ success?: boolean; message: string } | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { user } = useAuth()

  // Function to start recording
  const startRecording = async () => {
    try {
      // Clear previous states
      setStatus(null)
      setAudioBlob(null)
      setRecordingTime(0)

      // Request permission to access the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create the MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Set up event to collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Set up event for when recording is finished
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" })
        setAudioBlob(audioBlob)

        // Stop all tracks of the stream
        stream.getTracks().forEach((track) => track.stop())
      }

      // Start recording
      mediaRecorder.start()
      setRecording(true)
      console.log("[AudioRecorder] Recording started")

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("[AudioRecorder] Error starting recording:", error)
      setStatus({
        success: false,
        message: `Error starting recording: ${error instanceof Error ? error.message : "Microphone access denied"}`,
      })
    }
  }

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      console.log("[AudioRecorder] Recording finished")

      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Function to send the recorded audio
  const sendRecording = async () => {
    if (!audioBlob) {
      setStatus({ success: false, message: "No audio recorded to send" })
      return
    }

    if (!phone) {
      setStatus({ success: false, message: "Enter the recipient's phone number" })
      return
    }

    if (!user?.email) {
      setStatus({ success: false, message: "You need to be logged in to send audio" })
      return
    }

    try {
      setSending(true)
      setStatus(null)

      console.log(`[AudioRecorder] Preparing to send audio to ${phone}`)

      // Create FormData with the audio
      const formData = new FormData()
      formData.append("audio", audioBlob, "audio.ogg") // File name

      // Convert blob to base64 for sending
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        const base64data = reader.result as string
        const audioData = base64data.split(",")[1] // Remove the data URL prefix

        // Send to endpoint
        const response = await fetch("https://api.parabenspravoce.com/api/sendVoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: phone,
            audioData: audioData,
            userEmail: user.email,
            mimeType: "audio/ogg; codecs=opus",
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.message || `Error ${response.status}`)
        }

        console.log("[AudioRecorder] Audio sent successfully:", data)
        setStatus({ success: true, message: "Audio sent successfully!" })

        // Clear the audio after successful sending
        setAudioBlob(null)
      }
    } catch (error) {
      console.error("[AudioRecorder] Error sending audio:", error)
      setStatus({
        success: false,
        message: `Error sending audio: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setSending(false)
    }
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <h2 className="text-xl font-semibold">Send WhatsApp Audio</h2>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="text"
          placeholder="Ex: 447897274321"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={recording || sending}
        />
        <p className="text-sm text-gray-500">
          Enter the number with country code, without spaces or special characters
        </p>
      </div>

      {/* Recording time */}
      {(recording || audioBlob) && (
        <div className="text-center">
          <div className="text-2xl font-mono">{formatTime(recordingTime)}</div>
        </div>
      )}

      <div className="flex gap-2">
        {!recording ? (
          <Button onClick={startRecording} disabled={sending} className="bg-green-500 hover:bg-green-600">
            <Mic className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} className="bg-red-500 hover:bg-red-600">
            <Square className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        )}

        <Button
          onClick={sendRecording}
          disabled={!audioBlob || recording || sending || !phone || !user?.email}
          className="bg-green-500 hover:bg-green-600"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Audio
            </>
          )}
        </Button>
      </div>

      {audioBlob && (
        <div className="p-3 border rounded bg-gray-50">
          <p className="text-sm font-medium mb-2">Recorded Audio:</p>
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
        </div>
      )}

      {status && (
        <div
          className={`p-3 border rounded ${status.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {status.message}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        <p>Tips:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Make sure your microphone is working properly</li>
          <li>Speak clearly and close to the microphone</li>
          <li>WhatsApp must be connected for sending to work</li>
        </ul>
      </div>
    </div>
  )
}
