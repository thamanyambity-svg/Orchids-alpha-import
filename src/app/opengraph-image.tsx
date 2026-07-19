import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Alpha Import Exchange RDC'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
    // Use a standard font inside the edge function (optional to load custom fonts)
    // For simplicity, we use system-ui style

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
                <div
                    style={{
                        fontSize: 80,
                        fontWeight: 'bold',
                        background: 'linear-gradient(to right, #C5A059, #FFF8D6, #C5A059)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        marginBottom: 20,
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
                    L'INFRASTRUCTURE DE CONFIANCE RDC - CHINE · TURQUIE · DUBAI · JAPON · THAÏLANDE
                </div>

                <div style={{ display: 'flex', marginTop: 40, gap: 20 }}>
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
