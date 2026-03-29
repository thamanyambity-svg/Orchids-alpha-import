"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

interface WorldMapProps {
  mapboxToken: string
  selectedCountry?: string
  onCountrySelect: (countryCode: string) => void
  partners?: Record<string, { full_name: string; company_name: string; cities?: string[]; performance_score: number; total_orders_handled: number }>
}

// Zones Alpha : Turquie, Dubai, Chine, Japon, Thaïlande uniquement
const countryCoordinates: Record<string, { lat: number; lng: number }> = {
  "CHN": { lng: 114.0579, lat: 22.5431 }, // Shenzhen
  "TUR": { lng: 28.9784, lat: 41.0082 }, // Istanbul
  "ARE": { lng: 55.2708, lat: 25.2048 }, // Dubai
  "JPN": { lng: 139.6503, lat: 35.6762 }, // Tokyo
  "THA": { lng: 100.5018, lat: 13.7563 }, // Bangkok
}

export function WorldMap({ mapboxToken, selectedCountry, onCountrySelect, partners }: WorldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Record<string, mapboxgl.Marker>>({})

  useEffect(() => {
    if (!mapContainer.current) return

    console.log("Initializing map with partners:", partners)

    mapboxgl.accessToken = mapboxToken

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: [90, 25], // Centre Asie + Moyen-Orient (Chine, Turquie, Dubai, Japon, Thaïlande)
      zoom: 2.8,
      projection: { name: 'globe' } as mapboxgl.MapOptions['projection'],
      pitch: 25,
      bearing: -10
    })

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    map.current.on('style.load', () => {
      if (!map.current) return

      // The Standard style already includes 3D buildings, terrain, and atmosphere.
      // We just need to ensure the lighting is vibrant.
      try {
        map.current.setConfigProperty('basemap', 'lightPreset', 'day');
      } catch (e) {
        console.warn("Could not set light preset", e);
      }
    })

    Object.entries(countryCoordinates).forEach(([code, coords]) => {
      const hasPartner = partners?.[code]
      if (!hasPartner) return // Only show markers for partners

      console.log(`Creating marker for ${code} at`, coords)

      const el = document.createElement('div')
      el.className = `marker-${code} cursor-pointer transition-all duration-300 transform hover:scale-125`
      el.style.zIndex = "10"

      el.innerHTML = `
          <div class="relative flex items-center justify-center pointer-events-auto">
            <div class="absolute w-10 h-10 rounded-full animate-ping bg-primary/40 pointer-events-none"></div>
            <div class="relative w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-xl bg-primary/30 border-primary text-primary backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `

      const handleClick = (e: MouseEvent) => {
        console.log(`Marker clicked: ${code}`)
        e.stopPropagation()
        onCountrySelect(code)

        // Improved scrolling logic
        const scrollToPartner = () => {
          const element = document.getElementById('partner-card-container')
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            console.log("Scrolled to partner card")
          } else {
            // Try again in case it's still rendering
            setTimeout(scrollToPartner, 100)
          }
        }

        setTimeout(scrollToPartner, 400)
      }

      el.addEventListener('click', handleClick)

      const popupContent = `
          <div class="p-3 min-w-[180px] bg-background">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                ${hasPartner.full_name[0]}
              </div>
              <div>
                <h4 class="font-bold text-sm leading-tight">${hasPartner.full_name}</h4>
                <p class="text-[10px] text-muted-foreground">
                  ${(hasPartner.cities && hasPartner.cities.length > 0) ? hasPartner.cities.join(", ") : hasPartner.company_name}
                </p>
              </div>
            </div>
            <div class="flex items-center justify-between text-[10px] mb-2">
              <span class="text-amber-500 font-bold">★ ${hasPartner.performance_score}/5.0</span>
              <span class="text-muted-foreground">${hasPartner.total_orders_handled}+ commandes</span>
            </div>
            <div class="text-[9px] py-1 px-2 bg-primary/5 border border-primary/10 rounded text-primary font-medium text-center">
              Sélectionné automatiquement au clic
            </div>
          </div>
        `

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'custom-map-popup'
      }).setHTML(popupContent)

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(map.current!)

      markers.current[code] = marker
    })

    return () => {
      map.current?.remove()
      markers.current = {}
    }
  }, [mapboxToken, partners])

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
        const inner = el.querySelector('.relative.w-8.h-8')
        if (inner) {
          if (code === selectedCountry) {
            inner.classList.remove('bg-primary/30')
            inner.classList.add('bg-primary', 'border-white', 'shadow-primary/50')
          } else {
            inner.classList.remove('bg-primary', 'border-white', 'shadow-primary/50')
            inner.classList.add('bg-primary/30', 'border-primary')
          }
        }
      })
    }
  }, [selectedCountry])

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-border shadow-inner">
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-md p-2 rounded-lg border border-border text-[10px] font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Partenaire Certifié — Turquie · Dubai · Chine · Japon · Thaïlande</span>
        </div>
      </div>
    </div>
  )
}
