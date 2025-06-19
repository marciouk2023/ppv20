"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Share2, Send, SlidersHorizontal } from "lucide-react"
import { generateDeepSeekResponse } from "@/actions/chat" // Importa o novo Server Action
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatMessage {
  id: number
  sender: "user" | "freud"
  text: string
}

export function ChatMain() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "freud",
      text: "Olá! Estou pronto para ajudá-lo a enfrentar qualquer escolha difícil que você tenha na vida, desde as grandes até as pequenas.\nEm que você precisa de ajuda para decidir hoje?",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return

    const newMessage: ChatMessage = {
      id: messages.length + 1,
      sender: "user",
      text: inputMessage,
    }
    setMessages((prevMessages) => [...prevMessages, newMessage])
    setInputMessage("")
    setIsSending(true)

    const result = await generateDeepSeekResponse(inputMessage)

    if (result.success && result.response) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, sender: "freud", text: result.response },
      ])
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, sender: "freud", text: result.response || "Erro ao obter resposta." },
      ])
    }
    setIsSending(false)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Freud Explica</h2>
          <p className="text-sm text-gray-400">freudexplica.ai</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">0/5</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-6">
        {messages.length === 1 && messages[0].sender === "freud" ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-6 flex flex-col items-center text-center">
              <Avatar className="mb-4 h-24 w-24 border border-gray-700">
                <AvatarImage src="/placeholder.svg?height=96&width=96" />
                <AvatarFallback>SF</AvatarFallback>
              </Avatar>
              <h1 className="text-3xl font-bold">Freud Explica</h1>
              <p className="text-md text-gray-400">freudexplica.ai</p>
            </div>
            <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-4 text-gray-50">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border border-gray-700">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>SF</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Freud <span className="text-gray-400">freudexplica.ai</span>
                  </div>
                  <p className="mt-1 text-lg whitespace-pre-wrap">{messages[0].text}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="sr-only">Options</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.sender === "user" ? "justify-end" : ""}`}
              >
                {message.sender === "freud" && (
                  <Avatar className="h-8 w-8 border border-gray-700">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>SF</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender === "user" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {message.sender === "user" ? "Você" : "Freud"}
                    {message.sender === "freud" && <span className="text-gray-400">freudexplica.ai</span>}
                  </div>
                  <p className="mt-1 text-lg whitespace-pre-wrap">{message.text}</p>
                </div>
                {message.sender === "user" && (
                  <Avatar className="h-8 w-8 border border-gray-700">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>Você</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border border-gray-700">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>SF</AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-lg bg-gray-800 p-3 text-gray-50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Freud <span className="text-gray-400">freudexplica.ai</span>
                  </div>
                  <p className="mt-1 text-lg">Digitando...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      <div className="flex items-center border-t border-gray-800 p-4">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enviar mensagem para Freud"
            className="h-12 w-full rounded-full border-none bg-gray-800 pl-5 pr-12 text-lg text-gray-50 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !isSending) {
                handleSendMessage()
              }
            }}
            disabled={isSending}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
            onClick={handleSendMessage}
            disabled={isSending || inputMessage.trim() === ""}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
