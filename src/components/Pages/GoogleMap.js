import React, { useState } from 'react'
import GoogleMapReact from 'google-map-react'
import './map.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons'

const GMap = ({ location, zoomLevel }) => {
  const [zoom, setZoom] = useState(zoomLevel);

  const mapOptions = {
    styles: [
      {
        featureType: "all",
        elementType: "labels.text.fill",
        stylers: [{ color: "#ffffff" }]
      },
      {
        featureType: "all",
        elementType: "labels.text.stroke",
        stylers: [{ visibility: "on" }, { color: "#3e606f" }, { weight: 2 }, { gamma: 0.84 }]
      },
      {
        featureType: "all",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "administrative",
        elementType: "geometry",
        stylers: [{ weight: 0.6 }, { color: "#1a3541" }]
      },
      {
        featureType: "landscape",
        elementType: "geometry",
        stylers: [{ color: "#2c5a71" }]
      },
      {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: "#406d80" }]
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1f4f70" }]
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#406d80" }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#193341" }]
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