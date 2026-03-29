"use client"

import { FileText, MoreHorizontal, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function DocumentTable({ requestId }: { requestId?: string }) {
  const [documents, setDocuments] = useState<{ file_name: string; type: string; status: string; created_at: string; file_url?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!requestId) return

    async function fetchDocuments() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('request_documents')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false })
        
        if (data) setDocuments(data)
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [requestId])

  if (!requestId) {
    return (
      <div className="glass rounded-3xl overflow-hidden p-10 text-center">
        <p className="text-muted-foreground uppercase text-xs tracking-widest">Aucun document disponible</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest uppercase">DOCUMENTS DE LA DEMANDE</h3>
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <MoreHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-white/5">
              <th className="px-6 py-4 font-normal">Document</th>
              <th className="px-6 py-4 font-normal">Type</th>
              <th className="px-6 py-4 font-normal">Statut</th>
              <th className="px-6 py-4 font-normal text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-xs uppercase">Aucun document trouvé</td>
              </tr>
            ) : (
              documents.map((doc, idx) => (
                <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono text-white max-w-[200px] truncate">{doc.file_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-primary uppercase">{doc.type}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground uppercase">{doc.status}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-secondary/50 text-muted-foreground border border-white/5">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
