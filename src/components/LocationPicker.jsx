import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Where the map opens before a customer has chosen anything: Lahore.
const DEFAULT_CENTER = [31.5204, 74.3587]

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      })
    },
  })
  return null
}

// MapContainer ignores `center` after mounting, so "use my location" moves it here.
function FollowPin({ value }) {
  const map = useMap()
  useEffect(() => {
    if (value) map.panTo([value.lat, value.lng])
  }, [map, value])
  return null
}

export default function LocationPicker({ value, onChange }) {
  const position = value ? [value.lat, value.lng] : DEFAULT_CENTER

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '280px', borderRadius: '14px' }}
    >
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onSelect={onChange} />
      <FollowPin value={value} />

      {value && <Marker position={position} />}
    </MapContainer>
  )
}
