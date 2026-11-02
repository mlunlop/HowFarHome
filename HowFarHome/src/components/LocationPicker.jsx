import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

// Marcador propio: el icono por defecto de Leaflet no encuentra sus imágenes con Vite.
const pinIcon = L.divIcon({
  className: 'sign-pin',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function PlaceOnClick({ onChange }) {
  useMapEvents({ click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) })
  return null
}

// limit: { center, radiusKm } para enseñar hasta dónde se puede mover un cartel.
function LocationPicker({ center, value, onChange, limit, zoom = 16 }) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="dark-tiles isolate size-full"
      scrollWheelZoom
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {limit && (
        <Circle
          center={[limit.center.lat, limit.center.lng]}
          radius={limit.radiusKm * 1000}
          pathOptions={{ color: '#ff2d2d', weight: 1, dashArray: '4 6', fillOpacity: 0.04 }}
        />
      )}
      <Marker
        position={[value.lat, value.lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend: (event) => {
            const { lat, lng } = event.target.getLatLng()
            onChange({ lat, lng })
          },
        }}
      />
      <PlaceOnClick onChange={onChange} />
    </MapContainer>
  )
}

export default LocationPicker
