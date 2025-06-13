import type { Metadata } from "next"
import ClientPage from "./ClientPage"

export const metadata: Metadata = {
  title: "Igreja Evangélica no Porto | IND - Igreja Evangélica Novo Dia Porto",
  description:
    "Igreja Evangélica no Porto? Conheça a IND - Igreja Evangélica Novo Dia - Porto. Situada no centro da cidade do Porto.",
}

export default function Component() {
  return <ClientPage />
}
