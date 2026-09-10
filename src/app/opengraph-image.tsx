import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Alpha Import Exchange RDC'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

/**
 * Récupère l'emblème et le convertit en URI de données.
 *
 * Cette fonction s'exécute en périphérie : pas d'accès au système de fichiers,
 * d'où la lecture par requête sur le fichier public. L'échec est absorbé —
 * une image de partage sans emblème vaut infiniment mieux qu'une génération
 * qui lève, laquelle ferait apparaître un lien nu dans WhatsApp ou LinkedIn.
 */
async function embleme(): Promise<string | null> {
    try {
        const reponse = await fetch(
            new URL('/logo-embleme.png', 'https://aonosekehouseinvestmentdrc.site')
        )
        if (!reponse.ok) return null
        const octets = new Uint8Array(await reponse.arrayBuffer())
        let binaire = ''
        for (const octet of octets) binaire += String.fromCharCode(octet)
        return `data:image/png;base64,${btoa(binaire)}`
    } catch {
        return null
    }
}

export default async function Image() {
    const logo = await embleme()

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #111111, #000000)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    border: '20px solid #C5A059', // Gold border
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logo && (
                    <img
                        src={logo}
                        alt=""
                        width={150}
                        height={150}
                        style={{ marginBottom: 24 }}
                    />
                )}
                <div
                    style={{
                        fontSize: 68,
                        fontWeight: 'bold',
                        background: 'linear-gradient(to right, #C5A059, #FFF8D6, #C5A059)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        marginBottom: 16,
                        textAlign: 'center',
                    }}
                >
                    ALPHA IMPORT EXCHANGE
                </div>
                <div
                    style={{
                        fontSize: 30,
                        color: '#cccccc',
                        textAlign: 'center',
                        maxWidth: '800px',
                    }}
                >
                    L'INFRASTRUCTURE DE CONFIANCE RDC · CHINE · TURQUIE · ÉMIRATS · JAPON · THAÏLANDE
                </div>

                <div style={{ display: 'flex', marginTop: 28, gap: 20 }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 30px', borderRadius: 20, fontSize: 24 }}>Sécurité 100%</div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 30px', borderRadius: 20, fontSize: 24 }}>Traçabilité</div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 30px', borderRadius: 20, fontSize: 24 }}>Contrôle</div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
