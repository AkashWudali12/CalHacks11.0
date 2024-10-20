import mapboxgl from 'mapbox-gl';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { createRoot } from 'react-dom/client';
import './Map.css';
import { BottomOverlay } from './BottomOverlay';
import { TopOverlay } from './TopOverlay'; // Add this import
import * as turf from '@turf/turf';
import pingSound from '../assets/alarm.mp3'; // Add this import

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

  // Add these new functions
  function N(t, N0, k) {
    return N0 * (Math.exp(k * t));
  }

  function caliFireCor(t) {
    const centerCor = [37.1, -122.1];
    const centerLat = centerCor[0];
    const centerLon = centerCor[1];
    const R0 = 0.045;

    const a = 0.005;
    const b = 0.02;

    const Rx = R0 + a * t;
    const Ry = R0 + b * t;

    const theta = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random());

    const dx = Rx * r * Math.cos(theta);
    const dy = Ry * r * Math.sin(theta);

    const adjustedDx = dx / Math.cos(centerLat * Math.PI / 180);

    const lat = centerLat + dy;
    const lon = centerLon + adjustedDx;

    return [lon, lat];
  }

  function makeFire(t, N0, k) {
    const points = [];
    const numPoints = N(t, N0, k);

    for (let p = 0; p < numPoints; p++) {
      const intensity = Math.random() / 2;

      points.push({
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": caliFireCor(t)
        },
        "properties": {
          "intensity": intensity
        }
      });
    }

    return {
      "type": "FeatureCollection",
      "features": points
    };
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
        "maxzoom": 9,
        "paint": {
          "heatmap-weight": ["get", "intensity"],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 1,
            9, 3
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
            9, 30
          ],
          "heatmap-opacity": 1
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

    const updateMarkers = async () => {
      for (const call of calls) {
        if (!call.location) continue;

        //make sure callStatus is active
        if (call.callStatus !== "active") continue;

        try {
          const response = await geocoder.forwardGeocode({
            query: call.location,
            limit: 1
          }).send();

          if (response && response.body && response.body.features && response.body.features.length) {
            const [lng, lat] = response.body.features[0].center;

            if (markersRef.current[call.id]) {
              // Update existing marker
              markersRef.current[call.id].setLngLat([lng, lat]);
            } else {
              // Create new marker
              const markerNode = document.createElement('div');
              const root = createRoot(markerNode);
              root.render(<Marker onClick={markerClicked} call={call} />);

              const marker = new mapboxgl.Marker(markerNode)
                .setLngLat([lng, lat])
                .addTo(mapRef.current);

              markersRef.current[call.id] = marker;
            }
            newMarkers.push({ id: call.id, lngLat: [lng, lat] });

            const callLocation = [lng, lat];

            if (call.dispatchInformation && call.dispatchInformation.fire) {
              const nearestFireStation = getNearestStation('Fire Station', callLocation);
              if (nearestFireStation) {
                getRoute(nearestFireStation, callLocation, `fire-route-${call.id}`, 'red');
              }
            }

            if (call.dispatchInformation && call.dispatchInformation.police) {
              const nearestPoliceStation = getNearestStation('Police Station', callLocation);
              if (nearestPoliceStation) {
                getRoute(nearestPoliceStation, callLocation, `police-route-${call.id}`, 'blue');
              }
            }
          }
        } catch (error) {
          console.error('Error geocoding location:', error);
        }
      }

      // Remove markers for calls that no longer exist
      Object.keys(markersRef.current).forEach(id => {
        if (!calls.find(call => call.id === id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });

      setMarkers(newMarkers);
    };

    updateMarkers();
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

  const markerClicked = call => {
    console.log('Marker clicked:', call);
  };

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
    const N0 = 50;
    const k = 0.02;
    const startTime = new Date();
  
    const animate = () => {
      const currTime = new Date();
      const t = (currTime - startTime) / 10000; // Convert to seconds
  
      const heatmapData = makeFire(t, N0, k);

      console.log("Got heatmap data");
  
      if (mapRef.current && mapRef.current.getSource('fire-heatmap')) {
        mapRef.current.getSource('fire-heatmap').setData(heatmapData);
      }
  
      if (t < 10) {
        setTimeout(animationRef.current = requestAnimationFrame(animate), 10000);
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