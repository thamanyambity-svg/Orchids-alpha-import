"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Upload, X, Loader2, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface DocumentUploadModalProps {
  requestId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const SERVICES = [
  { value: "SOURCING", label: "Sourcing" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "LOGISTICS", label: "Logistique" },
  { value: "COMPLIANCE", label: "Conformité" },
]

const DOCUMENT_TYPES = [
  { value: "PROFORMA_INVOICE", label: "Facture Proforma" },
  { value: "COMMERCIAL_INVOICE", label: "Facture Commerciale" },
  { value: "PACKING_LIST", label: "Packing List" },
  { value: "INSPECTION_REPORT", label: "Rapport d'inspection" },
  { value: "BILL_OF_LADING", label: "Bill of Lading / LTA" },
  { value: "CERTIFICATE_ORIGIN", label: "Certificat d'Origine" },
  { value: "OTHER", label: "Autre document" },
]

export function DocumentUploadModal({ 
  requestId, 
  open, 
  onOpenChange, 
  onSuccess 
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [service, setService] = useState("")
  const [type, setType] = useState("")
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !service || !type) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const fileExt = file.name.split('.').pop()
      const fileName = `${requestId}/${Date.now()}.${fileExt}`
      const filePath = `requests/${fileName}`

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // 3. Insert into DB via API to trigger notification
      const response = await fetch('/api/requests/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          service,
          type,
          fileUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          uploadedBy: user.id,
          status: 'PENDING'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record document')
      }

      toast.success("Document téléversé avec succès")
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setService("")
    setType("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Téléversez un document pour ce dossier. Il sera visible par l'administrateur et le client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="service">Service concerné</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type de document</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Fichier</Label>
            {!file ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Cliquez ou glissez un fichier ici
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Images ou Word (max 10MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="max-w-[200px] truncate">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Téléversement...
              </>
            ) : (
              "Téléverser"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
