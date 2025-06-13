import type { Metadata } from "next"
import ClientPage from "./ClientPage"

export const metadata: Metadata = {
  title: "Igreja Evangélica em Paris | IND - Igreja Evangélica Novo Dia Paris",
  description:
    "Igreja Evangélica em Paris? Conheça a IND - Igreja Evangélica Novo Dia - Paris. Situada em Montrouge, Paris.",
}

export default function Component() {
  return <ClientPage />
}
