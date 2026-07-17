import { renderToStream } from "@react-pdf/renderer"
import { InvoicePDF } from "./invoice-pdf"
import type { InvoiceData } from "./invoice-pdf"

export async function generateInvoice(data: InvoiceData): Promise<Buffer> {
  const stream = await renderToStream(<InvoicePDF data={data} />)
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks)
}
