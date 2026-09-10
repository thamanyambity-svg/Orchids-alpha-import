import { describe, it, expect } from 'vitest'
import { piecesKyc, lienFichier } from './pieces'

describe('piecesKyc', () => {
  it('retourne une liste vide pour une valeur absente ou non tableau', () => {
    expect(piecesKyc(null)).toEqual([])
    expect(piecesKyc(undefined)).toEqual([])
    expect(piecesKyc({ path: 'x' })).toEqual([])
  })

  it('pointe vers la route privée, jamais vers un lien public', () => {
    const [piece] = piecesKyc([{ path: 'kyc/u1/a b.pdf', type: 'PASSPORT', name: 'passeport.pdf', uploaded_at: '2026-09-10T10:00:00Z' }], 'IN_PROGRESS')
    expect(piece.file_url).toBe('/api/files/documents?path=kyc%2Fu1%2Fa%20b.pdf')
    expect(piece.file_url).not.toContain('/storage/v1/object/public')
    expect(piece).toMatchObject({ id: 'kyc/u1/a b.pdf', type: 'PASSPORT', name: 'passeport.pdf', status: 'IN_PROGRESS', created_at: '2026-09-10T10:00:00Z' })
  })

  it('ignore les entrées sans chemin', () => {
    expect(piecesKyc([{ type: 'PASSPORT' }, null, 'x', { path: '' }, { path: 'kyc/u1/ok.pdf' }])).toHaveLength(1)
  })

  it('reprend le statut du dossier et trie du plus récent au plus ancien', () => {
    const pieces = piecesKyc([
      { path: 'kyc/u1/ancien.pdf', uploaded_at: '2026-01-01T00:00:00Z' },
      { path: 'kyc/u1/recent.pdf', uploaded_at: '2026-09-01T00:00:00Z' },
    ], 'VERIFIED')
    expect(pieces.map((p) => p.path)).toEqual(['kyc/u1/recent.pdf', 'kyc/u1/ancien.pdf'])
    expect(pieces.every((p) => p.status === 'VERIFIED')).toBe(true)
  })

  it('donne des valeurs de repli lisibles', () => {
    const [piece] = piecesKyc([{ path: 'kyc/u1/x.pdf' }])
    expect(piece).toMatchObject({ type: 'DOCUMENT', name: 'Document', status: 'IN_PROGRESS', created_at: null })
  })
})

describe('lienFichier', () => {
  it('encode le chemin', () => {
    expect(lienFichier('invoices', 'o1/F 1.pdf')).toBe('/api/files/invoices?path=o1%2FF%201.pdf')
  })
})
