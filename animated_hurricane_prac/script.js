
// Define the hurricane path
const hurricanePath = {
    "type": "Feature",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            // Starting near Mexico in the Pacific Ocean
            [-110.00, 15.00],
            [-111.50, 16.50],
            [-113.00, 18.00],
            [-114.50, 19.50],
            
            // Moving north, still in the ocean
            [-115.00, 21.00],
            [-115.50, 23.00],
            [-116.00, 25.00],
            [-116.50, 27.00],
            [-117.00, 28.50], 
            
            // Getting closer to the Baja California Peninsula
            [-117.50, 30.00],
            [-118.00, 31.50],
            [-118.50, 32.50], // Close to the southern tip of Baja California
            
            // In the ocean near Southern California
            [-119.00, 34.00],
            [-119.50, 35.50], // Near Los Angeles
            
            // Moving up along the California coast
            [-120.00, 37.00], // Near San Francisco
            [-120.50, 38.50], 
            [-121.00, 40.00], // Near Northern California coast
            
            // Further north, approaching the Oregon coast
            [-121.50, 42.00],
            [-122.00, 44.00], // Near Oregon coast
            
            // In the ocean again near Northern California and Oregon
            [-122.50, 46.00],
            [-123.00, 48.00], // Near Washington state coast
            
            // Moving further offshore
            [-123.50, 49.00]
        ]
    }
};



// Your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiYXd1ZGFsaSIsImEiOiJjbTJmejYwaHowZmQ1Mm9wcXpsZmw3bHhmIn0.KWUuBXHZ-IyAFPtw38r0nQ';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // Container ID
    style: 'mapbox://styles/mapbox/light-v10', // Map style
    center: [-75, 25], // Initial map center [lng, lat]
    zoom: 5 // Initial zoom level
});

// Add zoom and rotation controls
map.addControl(new mapboxgl.NavigationControl());

var geolocate = new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true
  });
  
map.addControl(geolocate);

function calculateDistanceFromCenter(center, point) {
    const lat1 = center[1];
    const lon1 = center[0];
    const lat2 = point[1];
    const lon2 = point[0];
    
    // Approximate Euclidean distance in degrees (for small distances)
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    
    // This is a simplified distance formula (good enough for small distances)
    return Math.sqrt(dLat * dLat + dLon * dLon);
}

// Function to generate logarithmic spiral heatmap data around a center point
function generateLogarithmicSpiralData(center) {
    const points = [];
    const numSpirals = 5; // Number of spiral arms
    const pointsPerSpiral = 1000; // Points per spiral arm
    const spiralSpacing = (2 * Math.PI) / numSpirals; // Angular spacing between spirals
    const a = 0.02; // Controls the initial radius
    const b = Math.random() * (0.3 - 0.28) + 0.28; // Controls the tightness of the spiral

    const maxTheta = pointsPerSpiral * 0.04; // Adjusted angle increment to match 'theta' in the loop
    const maxRadius = a * Math.exp(b * maxTheta); // Maximum radius for intensity calculation

    for (let s = 0; s < numSpirals; s++) {
        const spiralOffset = s * spiralSpacing;
        for (let i = 0; i < pointsPerSpiral; i++) {
            const theta = i * 0.02; // Angle parameter (ensure it matches 'maxTheta' calculation)
            const radius = a * Math.exp(b * theta); // Logarithmic spiral equation

            // Add some randomness to the radius and angle
            const randomRadius = radius + (Math.random() - 0.5) * 0.02;
            const randomTheta = theta + (Math.random() - 0.5) * 0.2;

            // Calculate coordinates
            const x = randomRadius * Math.cos(randomTheta + spiralOffset);
            const y = randomRadius * Math.sin(randomTheta + spiralOffset);

            // Adjust for longitude distortion at different latitudes
            const offsetLng = x / Math.cos(center[1] * Math.PI / 180);
            const offsetLat = y;

            // Calculate intensity based on radius (closer to center = higher intensity)
            const pointCoords = [center[0] + offsetLng, center[1] + offsetLat];

            // Calculate distance from the center
            const distanceFromCenter = calculateDistanceFromCenter(center, pointCoords);
            
            // Use the distance from the center to calculate intensity
            const maxDistance = maxRadius; // Use the maximum radius as the reference for the furthest point
            const intensity = 45 * (distanceFromCenter / maxDistance);

            points.push({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [center[0] + offsetLng, center[1] + offsetLat]
                },
                "properties": {
                    "intensity": intensity
                }
            });
        }
    }

    return {
        "type": "FeatureCollection",
        "features": points
    };
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                resolve([userLon, userLat]);
            },
            (error) => reject(error)
        );
    });
}

async function getOptimalDestination() {

    // optimization logic
    const address = "1600 Amphitheatre Parkway, Mountain View, CA";
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`;

    try {
        const response = await fetch(geocodingUrl);
        const data = await response.json();
        const [destLon, destLat] = data.features[0].center;
        console.log(destLat, destLon);
        return [destLon, destLat];
    }

    catch (error) {
        console.log("Could not get optimal destination:", error);
        return [0, 0]; // how to handle this edge case
    }
}

async function showDirections(startCors, destinationCors) {
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCors[0]},${startCors[1]};${destinationCors[0]},${destinationCors[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken};`

    try {
        const response = await fetch(directionsUrl);
        const data = await response.json();
        const route = data.routes[0];

        return route;

        // const instructions = route.legs[0].steps.map(step => step.maneuver.instruction);
    }

    catch (error) {
        console.log(error);
        return null;
    }
}


map.on('load', async () => {
    map.flyTo({
        center: [-137, 35], // Coordinates you want to zoom to and stay fixed
        zoom: 3.5,            // Adjust zoom level as needed
        speed: 0.5,         // Speed of the transition
        curve: 1            // Smoothing curve (1 = linear)
    });

    geolocate.trigger();

    // Initialize the heatmap source with an empty FeatureCollection
    map.addSource('hurricane-heatmap', {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": []
        }
    });

    // Add the heatmap layer
    map.addLayer({
        "id": "hurricane-heatmap",
        "type": "heatmap",
        "source": "hurricane-heatmap",
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
                0, "rgba(0, 0, 255, 0)",    
                0.1, "rgb(0, 0, 255)",      
                0.3, "rgb(0, 255, 0)",      
                0.5, "rgb(255, 255, 0)",   
                0.7, "rgb(255, 165, 0)",    
                0.9, "rgb(255, 69, 0)",     
                1, "rgb(255, 0, 0)"         
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

    // const currentPosition = await getCurrentPosition();
    // const optimalDestination = await getOptimalDestination();
    // const route = await showDirections(currentPosition, optimalDestination);

    // map.addSource('route', {
    //     type: 'geojson',
    //     data: {
    //       type: 'Feature',
    //       properties: {},
    //       geometry: route.geometry
    //     }
    // });

    // map.addLayer({
    //     id: 'route',
    //     type: 'line',
    //     source: 'route',
    //     layout: {
    //       'line-join': 'round',
    //       'line-cap': 'round'
    //     },
    //     paint: {
    //       'line-color': '#888',
    //       'line-width': 8
    //     }
    // });

    startAnimation();


    function startAnimation() {
        let counter = 0;
        const steps = hurricanePath.geometry.coordinates.length;

        function animate() {
            const currentPosition = hurricanePath.geometry.coordinates[counter];
            const heatmapData = generateLogarithmicSpiralData(currentPosition);
            map.getSource('hurricane-heatmap').setData(heatmapData);

            counter++;

            if (counter < steps) {
                setTimeout(animate, 1000); 
            }
        }

        animate();
    }
});