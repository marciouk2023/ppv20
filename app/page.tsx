import { Sidebar } from "@/components/sidebar"
import { ChatMain } from "@/components/chat-main"

export default function Component() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-50">
      <Sidebar />
      <ChatMain />
    </div>
  )
}
