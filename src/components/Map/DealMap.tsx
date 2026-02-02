import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap as useLeafletMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useMap } from '../../hooks/useMap';
import { useDeals } from '../../hooks/useDeals';
import { useDealClusters } from '../../hooks/useDealClusters';
import MapPopupContent from './MapPopupContent';
import type { CityDealCluster, LatLng } from '../../types';

// Fix Leaflet default icon paths for Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const userIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-marker-user',
});

const BAY_AREA_CENTER: [number, number] = [37.55, -122.1];
const DEFAULT_ZOOM = 10;
const MILES_TO_METERS = 1609.34;

function FlyToHandler({ target }: { target: LatLng | null }) {
  const map = useLeafletMap();
  const prevTarget = useRef<LatLng | null>(null);

  useEffect(() => {
    if (target && target !== prevTarget.current) {
      map.flyTo([target.lat, target.lng], 12, { duration: 1.2 });
      prevTarget.current = target;
    } else if (!target && prevTarget.current) {
      map.flyTo(BAY_AREA_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
      prevTarget.current = null;
    }
  }, [target, map]);

  return null;
}

function ClusterMarkers({
  clusters,
  onDealClick,
}: {
  clusters: CityDealCluster[];
  onDealClick: (dealId: string) => void;
}) {
  return (
    <>
      {clusters.map((cluster) => (
        <Marker key={cluster.cityId} position={[cluster.lat, cluster.lng]}>
          <Popup>
            <MapPopupContent cluster={cluster} onDealClick={onDealClick} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function DealMap() {
  const { t } = useTranslation();
  const { userLocation, radiusMiles } = useMap();
  const { deals, setSelectedDeal } = useDeals();
  const clusters = useDealClusters(deals);

  function handleDealClick(dealId: string) {
    setSelectedDeal(dealId);
    const el = document.getElementById(`deal-${dealId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return (
    <MapContainer
      center={BAY_AREA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToHandler target={userLocation} />
      <ClusterMarkers clusters={clusters} onDealClick={handleDealClick} />

      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={radiusMiles * MILES_TO_METERS}
            pathOptions={{
              color: '#F97316',
              fillColor: '#F97316',
              fillOpacity: 0.08,
              weight: 2,
            }}
          />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>{t('map.yourLocation')}</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
