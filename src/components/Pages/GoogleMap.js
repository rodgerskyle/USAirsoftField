import React, { useState } from 'react'
import GoogleMapReact from 'google-map-react'
import { useAppearance } from '../../Appearance'
import './map.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons'

const mapColors = {
  light: {
    label: '#174a87',
    halo: '#f8fafc',
    boundary: '#bacbd9',
    land: '#eef2ee',
    park: '#d8e8d9',
    road: '#ffffff',
    water: '#c6deef',
  },
  dark: {
    label: '#ffffff',
    halo: '#3e606f',
    boundary: '#1a3541',
    land: '#2c5a71',
    park: '#406d80',
    road: '#1f4f70',
    water: '#193341',
  },
};

const GMap = ({ location, zoomLevel }) => {
  const [zoom, setZoom] = useState(zoomLevel);
  const colors = mapColors[useAppearance()?.theme] || mapColors.light;

  const mapOptions = {
    styles: [
      {
        featureType: "all",
        elementType: "labels.text.fill",
        stylers: [{ color: colors.label }]
      },
      {
        featureType: "all",
        elementType: "labels.text.stroke",
        stylers: [{ visibility: "on" }, { color: colors.halo }, { weight: 2 }, { gamma: 0.84 }]
      },
      {
        featureType: "all",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "administrative",
        elementType: "geometry",
        stylers: [{ weight: 0.6 }, { color: colors.boundary }]
      },
      {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [{ color: colors.land }]
      },
      {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: colors.park }]
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: colors.road }]
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: colors.park }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: colors.water }]
      }
    ]
  };

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
  };

  return (
    <div className="map">
      <div className="google-map">
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_API_KEY }}
          defaultCenter={location}
          defaultZoom={zoomLevel}
          options={mapOptions}
          onZoomChange={handleZoomChange}
        >
          <LocationPin
            lat={location.lat}
            lng={location.lng}
            text={location.address}
            zoom={zoom}
          />
        </GoogleMapReact>
      </div>
    </div>
  )
}

const LocationPin = ({ text, zoom }) => (
  <div className={`pin ${zoom < 12 ? 'pin-small' : ''}`}>
    <FontAwesomeIcon icon={faMapMarkerAlt} className="pin-icon" />
    {zoom >= 12 && <p className="pin-text">{text}</p>}
  </div>
)

export default GMap; 