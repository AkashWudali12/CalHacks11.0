mapboxgl.accessToken = 'pk.eyJ1IjoiYXd1ZGFsaSIsImEiOiJjbTJmejYwaHowZmQ1Mm9wcXpsZmw3bHhmIn0.KWUuBXHZ-IyAFPtw38r0nQ';


function N(t, N0, k) {
    return N0*(Math.exp(k*t));
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

function caliFireCor(t) {
    const centerCor = [37.1, -122.1]; // [latitude, longitude]
    const centerLat = centerCor[0];
    const centerLon = centerCor[1];
    const R0 = 0.045; // Initial radius in degrees (≈5 km)

    // Constants for radii increase
    const a = 0.005; // Horizontal radius increase per time unit
    const b = 0.02;  // Vertical radius increase per time unit

    // Calculate radii at time t
    const Rx = R0 + a * t;
    const Ry = R0 + b * t;

    // Generate random angle theta between 0 and 2π
    const theta = Math.random() * 2 * Math.PI;

    // Generate random radius factor (uniform area distribution)
    const r = Math.sqrt(Math.random());

    // Calculate offsets
    const dx = Rx * r * Math.cos(theta);
    const dy = Ry * r * Math.sin(theta);

    // Adjust dx for longitude distortion
    const adjustedDx = dx / Math.cos(centerLat * Math.PI / 180);

    // Calculate final coordinates
    const lat = centerLat + dy;
    const lon = centerLon + adjustedDx;

    return [lon, lat];
}

function isPointInOval(t, lon, lat) {
    const centerCor = [37.1, -122.1]; // [latitude, longitude]
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

    // Compute the normalized distance
    const value = (dx / Rx) ** 2 + (dy / Ry) ** 2;

    // Determine if point is inside the oval
    return value <= 1;
}

function distanceToOvalEdge(t, lon, lat) {
    const centerCor = [37.1, -122.1]; // [latitude, longitude]
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

function makeFire(t, N0, k) {
    const points = [];
    const numPoints = N(t, N0, k)

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

    // looping logic based on fire growth rate (more time = more points)
    // fire are just red dots, fire intensity represents shade of red

    return {
        "type": "FeatureCollection",
        "features": points
    };
}

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

function getCurrentPosition() {
    console.log("Called");
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                console.log("Got user's coordinates:", userLon, userLat);
                resolve([userLon, userLat]);
            },
            (error) => {
                console.log("Error:", error);
                reject(error);
            }
        );
    });
}

async function getOptimalDestination() {

    // optimization logic, simulate next few timesteps of fire to see where to go.
    const address = "1600 Amphitheatre Parkway, Mountain View, CA";
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`;

    try {
        const response = await fetch(geocodingUrl);
        const data = await response.json();
        const [destLon, destLat] = data.features[0].center;
        console.log("Got destination coordinates:", destLat, destLon);
        return [destLon, destLat];
    }

    catch (error) {
        console.log("Could not get optimal destination:", error);
        return [0, 0]; // how to handle this edge case
    }
}

async function showDirections(startCors, destinationCors) {
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCors[0]},${startCors[1]};${destinationCors[0]},${destinationCors[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;

    try {
        const response = await fetch(directionsUrl);
        const data = await response.json();
        const route = data.routes[0];
        const instructions = route.legs[0].steps.map(step => step.maneuver.instruction);
        console.log("Instructions:", instructions)
        return route;
    }

    catch (error) {
        console.log(error);
        return null;
    }
}

map.on('load', async () => {

    console.log("On");
    map.flyTo({
        center: [-122.5, 37.7], // Coordinates you want to zoom to and stay fixed
        zoom: 7,            // Adjust zoom level as needed
        speed: 0.5,         // Speed of the transition
        curve: 1            // Smoothing curve (1 = linear)
    });

    const currentPosition = await getCurrentPosition();
    const optimalDestination = await getOptimalDestination();
    const route = await showDirections(currentPosition, optimalDestination);

    console.log("Current Position:", currentPosition);
    console.log("Optimal Destination:", optimalDestination); 
    console.log("Route:", route)

    map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        }
    });

    map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#888',
          'line-width': 8
        }
    });

    map.addSource('fire-heatmap', {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": []
        }
    });

    // Add the heatmap layer
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
                0, "rgba(255, 165, 0, 0)",  // Transparent orange
                0.1, "rgb(255, 165, 0)",    // Light orange
                0.3, "rgb(255, 140, 0)",    // Darker orange
                0.5, "rgb(255, 69, 0)",     // Red-orange
                0.7, "rgb(255, 0, 0)",      // Bright red
                0.9, "rgb(139, 0, 0)",      // Dark red
                1, "rgb(128, 0, 0)"         // Maroon (darkest)
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

    let keyPressed = false;

    document.addEventListener('keydown', (event) => {
    if (event.key === 'q') { // Replace 'Enter' with your desired key
        keyPressed = true;
    }
    });

    startAnimation();

    async function startAnimation() {
        const N0 = 50;
        const k = 0.05;
        const startTime = new Date(); 
        console.log(startTime)
        async function animate() {
            const currTime = new Date();
            const t = (currTime - startTime)/60000;

            console.log("Time:", currTime);
            console.log("Minutes since start:", t);

            const heatmapData = makeFire(t, N0, k)
            map.getSource('fire-heatmap').setData(heatmapData);

            // const currentPosition = await getCurrentPosition();
            // console.log("Current Position:", currentPosition)
            // console.log("Current Distance From Fire:", distanceToOvalEdge(t, currentPosition[0], currentPosition[1]));
            // console.log("In the fire:", isPointInOval(t, currentPosition[0], currentPosition[1]));

            console.log(keyPressed);

            if (!keyPressed) {
                setTimeout(animate, 60000); 
            }
        }
        animate()
    }
});