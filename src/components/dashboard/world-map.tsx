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
  "AFG": { lng: 69.1723, lat: 34.5553 },
  "DZA": { lng: 3.0588, lat: 36.7538 },
  "AGO": { lng: 13.2344, lat: -8.8390 },
  "ARG": { lng: -58.3816, lat: -34.6037 },
  "AUS": { lng: 149.1287, lat: -35.2809 },
  "AUT": { lng: 16.3738, lat: 48.2082 },
  "BEL": { lng: 4.3517, lat: 50.8503 },
  "BEN": { lng: 2.4263, lat: 6.3654 },
  "BRA": { lng: -47.8825, lat: -15.7942 },
  "CAN": { lng: -75.6972, lat: 45.4215 },
  "CHL": { lng: -70.6693, lat: -33.4489 },
  "CHN": { lng: 114.0579, lat: 22.5431 }, // Shenzhen
  "COL": { lng: -74.0721, lat: 4.7110 },
  "COD": { lng: 15.2663, lat: -4.4419 },
  "CIV": { lng: -4.0263, lat: 5.3599 },
  "CUB": { lng: -82.3666, lat: 23.1136 },
  "DNK": { lng: 12.5683, lat: 55.6761 },
  "EGY": { lng: 31.2357, lat: 30.0444 },
  "ETH": { lng: 38.7469, lat: 9.0192 },
  "FRA": { lng: 2.3522, lat: 48.8566 },
  "DEU": { lng: 13.4050, lat: 52.5200 },
  "GHA": { lng: -0.1870, lat: 5.6037 },
  "GRC": { lng: 23.7275, lat: 37.9838 },
  "IND": { lng: 77.1025, lat: 28.6139 },
  "IDN": { lng: 106.8456, lat: -6.2088 },
  "IRN": { lng: 51.3890, lat: 35.6892 },
  "IRQ": { lng: 44.3661, lat: 33.3152 },
  "ITA": { lng: 12.4964, lat: 41.9028 },
  "JPN": { lng: 139.6503, lat: 35.6762 },
  "KEN": { lng: 36.8219, lat: -1.2921 },
  "KOR": { lng: 126.9780, lat: 37.5665 },
  "MAR": { lng: -7.5898, lat: 33.5731 },
  "MEX": { lng: -99.1332, lat: 19.4326 },
  "NLD": { lng: 4.8952, lat: 52.3702 },
  "NGA": { lng: 7.4951, lat: 9.0579 },
  "NOR": { lng: 10.7522, lat: 59.9139 },
  "PAK": { lng: 73.0479, lat: 33.6844 },
  "PER": { lng: -77.0428, lat: -12.0464 },
  "PHL": { lng: 120.9842, lat: 14.5995 },
  "POL": { lng: 21.0122, lat: 52.2297 },
  "PRT": { lng: -9.1393, lat: 38.7223 },
  "QAT": { lng: 51.5310, lat: 25.2854 },
  "RUS": { lng: 37.6173, lat: 55.7558 },
  "SAU": { lng: 46.6753, lat: 24.7136 },
  "SEN": { lng: -17.4467, lat: 14.6928 },
  "SGP": { lng: 103.8198, lat: 1.3521 },
  "ZAF": { lng: 28.2293, lat: -25.7479 },
  "ESP": { lng: -3.7038, lat: 40.4168 },
  "CHE": { lng: 7.4474, lat: 46.9480 },
  "THA": { lng: 100.5018, lat: 13.7563 }, // Bangkok
  "TUN": { lng: 10.1815, lat: 36.8065 },
  "TUR": { lng: 28.9784, lat: 41.0082 }, // Istanbul
  "UKR": { lng: 30.5234, lat: 50.4501 },
  "ARE": { lng: 55.2708, lat: 25.2048 }, // Dubai
  "GBR": { lng: -0.1276, lat: 51.5074 },
  "USA": { lng: -77.0369, lat: 38.9072 },
  "VNM": { lng: 105.8342, lat: 21.0285 },
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
          style: "mapbox://styles/mapbox/standard", // 3D, colorful, and modern
          center: [20, 20],
          zoom: 1.5,
          projection: { name: 'globe' } as any,
          pitch: 45,
          bearing: -17.6
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
                <p class="text-[10px] text-muted-foreground">${hasPartner.company_name}</p>
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
          <span>Partenaire Certifié AlphaIX</span>
        </div>
      </div>
    </div>
  )
}
