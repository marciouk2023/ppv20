"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ApiConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (url: string, key: string) => void
  defaultUrl?: string
  defaultKey?: string
}

export function ApiConfigModal({ open, onOpenChange, onSave, defaultUrl = "", defaultKey = "" }: ApiConfigModalProps) {
  const [apiUrl, setApiUrl] = useState(defaultUrl)
  const [apiKey, setApiKey] = useState(defaultKey)

  // Update state when props change
  useEffect(() => {
    setApiUrl(defaultUrl)
    setApiKey(defaultKey)
  }, [defaultUrl, defaultKey])

  const handleSave = () => {
    onSave(apiUrl, apiKey)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuração da API WAHA</DialogTitle>
          <DialogDescription>
            Configure a URL e a chave da API WAHA para conectar ao serviço WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-url" className="text-right">
              URL da API
            </Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.parabenspravoce.com"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              Chave da API
            </Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Opcional"
              className="col-span-3"
              type="password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
