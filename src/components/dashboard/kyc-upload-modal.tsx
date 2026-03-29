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
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Upload, X, Loader2, FileText, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface KycUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const DOCUMENT_TYPES = [
  { value: "PASSPORT", label: "Passeport" },
  { value: "ID_CARD", label: "Carte d'Identité" },
  { value: "DRIVERS_LICENSE", label: "Permis de Conduire" },
  { value: "PROOF_OF_ADDRESS", label: "Justificatif de Domicile" },
  { value: "COMPANY_REGISTRATION", label: "Registre de Commerce / RCCM" },
]

export function KycUploadModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: KycUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState("")
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file || !type) {
      toast.error("Veuillez sélectionner un type et un fichier")
      return
    }

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const fileExt = file.name.split('.').pop()
      const fileName = `kyc/${user.id}/${Date.now()}.${fileExt}`
      const filePath = `documents/${fileName}`

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // 3. Insert into DB (request_id is NULL for KYC)
      const { error: dbError } = await supabase
        .from('request_documents')
        .insert({
          service: 'COMPLIANCE',
          type,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          status: 'PENDING'
        })

      if (dbError) throw dbError

      toast.success("Document KYC téléversé. Nos équipes vont l'analyser.")
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error: unknown) {
      console.error('KYC Upload error:', error)
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setType("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>Vérification d&apos;identité (KYC)</DialogTitle>
          <DialogDescription>
            Soumettez vos documents pour vérifier votre compte et augmenter vos limites.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type de document</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type de document" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Fichier (Scan ou Photo)</Label>
            {!file ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Cliquez ou glissez votre fichier
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG ou PNG (max 5MB)
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
                Envoi en cours...
              </>
            ) : (
              "Soumettre pour vérification"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
