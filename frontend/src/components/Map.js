import mapboxgl from 'mapbox-gl';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { createRoot } from 'react-dom/client';
import './Map.css';
import { BottomOverlay } from './BottomOverlay';
import { TopOverlay } from './TopOverlay'; // Add this import
import * as turf from '@turf/turf';
import pingSound from '../assets/alarm.mp3'; // Add this import
import { v4 as uuidv4 } from 'uuid'; // Add this import

mapboxgl.accessToken = 'pk.eyJ1IjoiYmxhaXJvcmNoYXJkIiwiYSI6ImNsNWZzeGtrNDEybnMzaXA4eHRuOGU5NDUifQ.s59N5x1EqfyPZxeImzNwbw';

const Marker = ({ onClick, children, call }) => {
  const _onClick = () => {
    onClick(call);
  };

  return (
    <button onClick={_onClick} className="marker">
      {children}
    </button>
  );
};

const Map = ({ handleMouseEnter, handleMouseLeave, handleCallClick }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const animationRef = useRef(null);
  const calls = useSelector(state => state.calls);
  const [geocoder, setGeocoder] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [isTopOverlayVisible, setIsTopOverlayVisible] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isCallDeclined, setIsCallDeclined] = useState(false);
  const audioRef = useRef(new Audio(pingSound));
  const [userLocation, setUserLocation] = useState(null);
  const [firePoints, setFirePoints] = useState([]);
  const [animationTime, setAnimationTime] = useState(0);

  // Add these new functions
  function N(t, N0, k) {
    return N0 * (Math.exp(k * t));
  }

  function caliFireCor(t, existingPoint = null) {
    const centerCor = [37.7, -122.4];
    const centerLat = centerCor[0];
    const centerLon = centerCor[1];
    const R0 = 0.01; // Increased initial radius

    const a = 0.0005; // Increased growth rate
    const b = 0.001;

    const Rx = R0 + a * t;
    const Ry = R0 + b * t;

    let theta, r;
    if (existingPoint) {
      const [lon, lat] = existingPoint.geometry.coordinates;
      theta = Math.atan2(lat - centerLat, (lon - centerLon) * Math.cos(centerLat * Math.PI / 180));
      r = Math.sqrt(Math.pow((lon - centerLon) * Math.cos(centerLat * Math.PI / 180), 2) + Math.pow(lat - centerLat, 2)) / Math.max(Rx, Ry);
    } else {
      theta = Math.random() * 2 * Math.PI;
      r = Math.sqrt(Math.random());
    }

    const randomOffset = (Math.random() - 0.5) * 0.0002; // Increased random offset
    const northWindVector = 0.0001 * t; // Increased wind strength

    const dx = Rx * r * Math.cos(theta) + randomOffset;
    const dy = Ry * r * Math.sin(theta) + randomOffset + northWindVector;

    const adjustedDx = dx / Math.cos(centerLat * Math.PI / 180);

    const lat = centerLat + dy;
    const lon = centerLon + adjustedDx;

    return [lon, lat];
  }

  function distanceToOvalEdge(t, lon, lat) {
    const centerCor = [37.7, -122.4]; // [latitude, longitude]
    const centerLat = centerCor[0];
    const centerLon = centerCor[1];
    const R0 = 0.045; // Initial radius in degrees (≈5 km)

    // Constants for radii increase
    const a = 0.005; // Horizontal radius increase per time unit
    const b = 0.02;  // Vertical radius increase per time unit

    // Calculate radii at time t
    const Rx = R0 + a * t;
    const Ry = R0 + b * t;

    // Calculate offsets from center
    const adjustedDx = lon - centerLon;
    const dx = adjustedDx * Math.cos(centerLat * Math.PI / 180); // Adjust for longitude distortion
    const dy = lat - centerLat;

    // Compute the value for lambda calculation
    const value = (dx / Rx) ** 2 + (dy / Ry) ** 2;

    // Compute lambda (scaling factor)
    const lambda = Math.sqrt(value);

    // Compute the distance from the center to the point
    const D = Math.sqrt(dx ** 2 + dy ** 2);

    // Handle the case when the point is at the center
    if (lambda === 0) {
        return D * 111; // Convert degrees to kilometers
    }

    // Compute the distance to the ellipse edge
    const distanceDegrees = D * Math.abs(1 - 1 / lambda);

    // Convert distance from degrees to kilometers
    const distanceKm = distanceDegrees * 111; // Approximate conversion factor

    return distanceKm; // Distance in kilometers
}


  function makeFire(t, N0, k, existingPoints = []) {
    const points = [...existingPoints];
    const newPointsCount = Math.floor(N(t, N0, k)) - points.length;

    // Update existing points
    points.forEach(point => {
      const updatedCoordinates = caliFireCor(t, point);
      point.geometry.coordinates = updatedCoordinates;
      point.properties.intensity = Math.min(point.properties.intensity + 0.02, 1); // Faster intensity increase
    });

    // Add new points
    for (let p = 0; p < newPointsCount; p++) {
      const pt = caliFireCor(t);
      const intensity = Math.random() * 0.4 + 0.2; // Initial intensity between 0.2 and 0.6

      points.push({
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": pt
        },
        "properties": {
          "intensity": intensity,
          "id": uuidv4()
        }
      });
    }

    return {
      "type": "FeatureCollection",
      "features": points
    };
  }

  async function corOnLand(lon, lat) {
    // need to fix this potentialy
    try {
        const response = await fetch(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?layers=water&access_token=${mapboxgl.accessToken}`);
        const data = await response.json();
        if (data.features.length > 0) {
            console.log("The coordinate is on water");
            return false;
        } else {
            console.log("The coordinate is on land");
            return true;
        }
    }       
    catch (error) {
        return false;
    }
}

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/blairorchard/cm2gp48bg001z01pld8kf866m',
      center: [-122.5, 37.7],
      zoom: 7,
      pitch: 60,
      bearing: -60,
      antialias: true,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('style.load', () => {
      // map.addSource('emergency-locations', {
      //   type: 'geojson',
      //   data: emergencyData
      // });

      // Add a layer for fire stations
      // map.addLayer({
      //   id: 'fire-stations',
      //   type: 'circle',
      //   source: 'emergency-locations',
      //   filter: ['==', ['get', 'type'], 'Fire Station'],
      //   paint: {
      //     'circle-radius': 10,
      //     'circle-color': 'red',
      //     'circle-opacity': 0.6,
      //     'circle-stroke-width': 2,
      //     'circle-stroke-color': 'white'
      //   }
      // });

      // // Add a layer for police stations
      // map.addLayer({
      //   id: 'police-stations',
      //   type: 'circle',
      //   source: 'emergency-locations',
      //   filter: ['==', ['get', 'type'], 'Police Station'],
      //   paint: {
      //     'circle-radius': 10,
      //     'circle-color': 'blue',
      //     'circle-opacity': 0.6,
      //     'circle-stroke-width': 2,
      //     'circle-stroke-color': 'white'
      //   }
      // });

      // map.addSource('mapbox-dem', {
      //   'type': 'raster-dem',
      //   'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
      //   'tileSize': 512,
      //   'maxzoom': 14
      // });
      map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2 });

      map.addLayer({
        'id': 'sky',
        'type': 'sky',
        'paint': {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

       // Add 3D buildings
       const layers = map.getStyle().layers;
       const labelLayerId = layers.find(
         (layer) => layer.type === 'symbol' && layer.layout['text-field']
       ).id;
       
       map.addLayer(
         {
           'id': '3d-buildings',
           'source': 'composite',
           'source-layer': 'building',
           'filter': ['==', 'extrude', 'true'],
           'type': 'fill-extrusion',
           'paint': {
             'fill-extrusion-color': '#313131',
             'fill-extrusion-height': [
               'interpolate',
               ['linear'],
               ['zoom'],
               0,
               0,
               8,
               ['*', ['get', 'height'], 0.1],
               12,
               ['*', ['get', 'height'], 0.5],
               16,
               ['get', 'height']
             ],
             'fill-extrusion-base': [
               'interpolate',
               ['linear'],
               ['zoom'],
               0,
               0,
               8,
               ['*', ['get', 'min_height'], 0.1],
               12,
               ['*', ['get', 'min_height'], 0.5],
               16,
               ['get', 'min_height']
             ],
             'fill-extrusion-opacity': [
               'interpolate',
               ['linear'],
               ['zoom'],
               0,
               0,
               8,
               0.3,
               12,
               0.7,
               16,
               0.9
             ]
           }
         },
         labelLayerId
       );

      // Add fire heatmap source and layer
      map.addSource('fire-heatmap', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": []
        }
      });

      map.addLayer({
        "id": "fire-heatmap",
        "type": "heatmap",
        "source": "fire-heatmap",
        // Remove the maxzoom property
        "paint": {
          "heatmap-weight": ["get", "intensity"],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 1,
            9, 3,
            22, 5 // Add a higher zoom level with increased intensity
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(255, 165, 0, 0)",
            0.1, "rgb(255, 165, 0)",
            0.3, "rgb(255, 140, 0)",
            0.5, "rgb(255, 69, 0)",
            0.7, "rgb(255, 0, 0)",
            0.9, "rgb(139, 0, 0)",
            1, "rgb(128, 0, 0)"
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 2,
            9, 30,
            22, 60 // Add a higher zoom level with increased radius
          ],
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, 1,
            9, 0.9,
            22, 0.8 // Gradually decrease opacity at higher zoom levels
          ]
        }
      });

      // Start the fire animation
      startAnimation();
    });

    // map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Initialize geocoder
    const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
    const geocodingClient = mbxGeocoding({ accessToken: mapboxgl.accessToken });
    setGeocoder(geocodingClient);

    // Add user location marker
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([longitude, latitude]);

        const el = document.createElement('div');
        el.className = 'user-location-marker';

        new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .addTo(map);

        map.flyTo({
          center: [longitude, latitude],
          zoom: 14
        });
      });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!geocoder || !mapRef.current) return;

    const newMarkers = [];

    const getNearestStation = (type, callLocation) => {
      // const stations = emergencyData.features.filter(feature => feature.properties.type === type);
      // let nearestStation = null;
      // let minDistance = Infinity;

      // stations.forEach(station => {
      //   const [stationLng, stationLat] = station.geometry.coordinates;
      //   const distance = Math.sqrt(
      //     Math.pow(callLocation[0] - stationLng, 2) + Math.pow(callLocation[1] - stationLat, 2)
      //   );
      //   if (distance < minDistance) {
      //     minDistance = distance;
      //     nearestStation = station.geometry.coordinates;
      //   }
      // });

      // return nearestStation;
    };

    const getRoute = async (start, end, layerId, lineColor) => {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
        { method: 'GET' }
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      };

      if (mapRef.current.getSource(layerId)) {
        mapRef.current.getSource(layerId).setData(geojson);
      } else {
        mapRef.current.addLayer({
          id: layerId,
          type: 'line',
          source: {
            type: 'geojson',
            data: geojson
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': lineColor,
            'line-width': 5,
            'line-opacity': 0.75
          }
        });
      }
    };

  }, [calls, geocoder]);

  useEffect(() => {
    if (markers.length === 0 || !mapRef.current) return;

    let currentIndex = 0;
    const animateCamera = () => {
      const marker = markers[currentIndex];
      mapRef.current.easeTo({
        center: marker.lngLat,
        zoom: 16,
        duration: 3000,
        pitch: 60,
        bearing: (currentIndex * 45) % 360
      });

      currentIndex = (currentIndex + 1) % markers.length;

      // Schedule the next animation
      animationRef.current = setTimeout(animateCamera, 5000);
    };

    // Start the animation loop
    animateCamera();

    // Clean up on component unmount
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [markers]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.on('load', () => {
        startAnimation();
      });
    }
  }, [mapRef.current]);

  const handleToggleTopOverlay = () => {
    setIsTopOverlayVisible(!isTopOverlayVisible);
    if (!isTopOverlayVisible && !isCallAccepted && !isCallDeclined) {
      audioRef.current.loop = true;
      audioRef.current.play();
    }
  };

  const handleHideTopOverlay = () => {
    setIsTopOverlayVisible(false);
    stopSound();
  };

  const handleAcceptCall = () => {
    setIsCallAccepted(true);
    stopSound();
    // Add any other logic for accepting the call
  };

  const handleDeclineCall = () => {
    setIsCallDeclined(true);
    stopSound();
    // Add any other logic for declining the call
  };

  const stopSound = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  const startAnimation = () => {
    const N0 = 30; // Initial number of points
    const k = 0.02; // Growth rate
    const startTime = new Date();
  
    const animate = () => {
      const currTime = new Date();
      const t = Math.floor((currTime - startTime) / 1000);
      setAnimationTime(t);
  
      const heatmapData = makeFire(t, N0, k, firePoints);
      setFirePoints(heatmapData.features);
  
      if (mapRef.current && mapRef.current.getSource('fire-heatmap')) {
        mapRef.current.getSource('fire-heatmap').setData(heatmapData);
      }

      console.log(`Animation frame: ${t} seconds, ${heatmapData.features.length} points`);

      // Call handleToggleTopOverlay after 20 seconds
      if (t === 20) {
        handleToggleTopOverlay();
      }

      if (t < 600) { // Run for 10 minutes (600 seconds)
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(animate);
        }, 1000); // Update every second
      } else {
        cancelAnimationFrame(animationRef.current);
      }
    };
  
    animate();
  };

  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="mapbox-container" />
      <div className="overlay-wrapper">
        <div className="overlay-container">
          <TopOverlay 
            isDropped={isTopOverlayVisible} 
            onHide={handleHideTopOverlay}
            onAcceptCall={handleAcceptCall}
            onDeclineCall={handleDeclineCall}
            isCallAccepted={isCallAccepted}
            isCallDeclined={isCallDeclined}
          />
        </div>
        <div className="overlay-container bottom-overlay">
          <BottomOverlay
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            handleCallClick={handleCallClick}
            onToggleTopOverlay={handleToggleTopOverlay}
            isTopOverlayVisible={isTopOverlayVisible}
          />
        </div>
      </div>
    </div>
  );
};

export default Map;
