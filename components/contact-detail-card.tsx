import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Phone, Mail } from "lucide-react"
import { formatDateToBrazilian, daysUntilBirthday } from "@/utils/date-utils"

interface ContactDetailCardProps {
  contact: {
    id: string
    imagem: string
    nome: string
    telefone: string
    data_de_nascimento: string
    email?: string
  }
}

export function ContactDetailCard({ contact }: ContactDetailCardProps) {
  const daysUntil = daysUntilBirthday(contact.data_de_nascimento)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100">
          {contact.imagem ? (
            <img src={contact.imagem || "/placeholder.svg"} alt={contact.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-green-100 text-green-600">
              {contact.nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <CardTitle>{contact.nome}</CardTitle>
          {daysUntil === 0 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Aniversário hoje!
            </span>
          ) : daysUntil <= 7 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Aniversário em {daysUntil} dias
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{contact.telefone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatDateToBrazilian(contact.data_de_nascimento)}</span>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{contact.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
