"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { MapPin } from "lucide-react"

interface WorldMapProps {
  mapboxToken: string
  selectedCountry?: string
  onCountrySelect: (countryCode: string) => void
  partners?: Record<string, any>
}

const countryCoordinates: Record<string, { lat: number; lng: number }> = {
  "CHN": { lng: 116.4074, lat: 39.9042 },
  "ARE": { lng: 55.2708, lat: 25.2048 },
  "TUR": { lng: 28.9784, lat: 41.0082 },
  "THA": { lng: 100.5018, lat: 13.7563 },
  "COD": { lng: 15.3222, lat: -4.3224 },
  "NGA": { lng: 3.3792, lat: 6.5244 },
  "KEN": { lng: 36.8219, lat: -1.2921 },
  "MAR": { lng: -7.5898, lat: 33.5731 },
  "FRA": { lng: 2.3522, lat: 48.8566 },
  "USA": { lng: -74.0060, lat: 40.7128 },
  "IND": { lng: 77.1025, lat: 28.6139 },
  "BRA": { lng: -43.1729, lat: -22.9068 },
}

export function WorldMap({ mapboxToken, selectedCountry, onCountrySelect, partners }: WorldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Record<string, mapboxgl.Marker>>({})

  useEffect(() => {
    if (!mapContainer.current) return

    mapboxgl.accessToken = mapboxToken
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [20, 20],
      zoom: 1.5,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    Object.entries(countryCoordinates).forEach(([code, coords]) => {
      const el = document.createElement('div')
      el.className = `marker-${code} cursor-pointer transition-all duration-300 transform hover:scale-125`
      
      const hasPartner = partners?.[code]
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full animate-ping ${hasPartner ? 'bg-primary/40' : 'bg-muted-foreground/20'}"></div>
          <div class="relative w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg ${hasPartner ? 'bg-primary/20 border-primary text-primary' : 'bg-muted border-muted-foreground/30 text-muted-foreground'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `

      el.addEventListener('click', () => {
        onCountrySelect(code)
      })

      const marker = new mapboxgl.Marker(el)
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current!)
      
      markers.current[code] = marker
    })

    return () => map.current?.remove()
  }, [])

  useEffect(() => {
    if (selectedCountry && countryCoordinates[selectedCountry] && map.current) {
      const { lng, lat } = countryCoordinates[selectedCountry]
      map.current.flyTo({
        center: [lng, lat],
        zoom: 4,
        duration: 2000
      })

      // Update marker classes
      Object.entries(markers.current).forEach(([code, marker]) => {
        const el = marker.getElement()
        const inner = el.querySelector('.relative.w-6.h-6')
        if (inner) {
          if (code === selectedCountry) {
            inner.classList.remove('bg-primary/20', 'bg-muted')
            inner.classList.add('bg-primary', 'border-white')
          } else {
            const hasPartner = partners?.[code]
            inner.classList.remove('bg-primary', 'border-white')
            if (hasPartner) {
              inner.classList.add('bg-primary/20', 'border-primary')
            } else {
              inner.classList.add('bg-muted', 'border-muted-foreground/30')
            }
          }
        }
      })
    }
  }, [selectedCountry])

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-border shadow-inner">
      <div ref={mapContainer} className="w-full h-full" />
      
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-md p-2 rounded-lg border border-border text-[10px] font-medium flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Partenaire Actif</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-muted border border-muted-foreground/30" />
          <span>Zone en attente</span>
        </div>
      </div>
    </div>
  )
}
