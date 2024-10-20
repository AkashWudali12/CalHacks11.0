import ReactGA from "react-ga";
import { Provider } from "react-redux";
import React, { useState, useEffect } from "react";
import store from "./redux/store";
import Dashboard from "./pages/dashboard";
import Modal from 'react-modal';

const GA_TRACKER_ID = process.env.REACT_APP_GA_TRACKER_ID;
const GA_DEBUG_MODE = process.env.REACT_APP_GA_DEBUG_MODE === "true";
ReactGA.initialize(GA_TRACKER_ID, { debug: GA_DEBUG_MODE });

// Set the app element for accessibility
Modal.setAppElement('#root');

function App() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [micPermission, setMicPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  
  ReactGA.pageview(window.location.href);

  // Debug mode setup
  var DEBUG = window.location.href.indexOf("localhost") > -1;
  if (!DEBUG) {
    if (!window.console) window.console = {};
    var methods = ["log", "debug", "warn", "info"];
    for (var i = 0; i < methods.length; i++) {
      console[methods[i]] = function () {};
    }
  }

  const requestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission(true);
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      await navigator.geolocation.getCurrentPosition(() => {});
      setLocationPermission(true);
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  useEffect(() => {
    if (micPermission && locationPermission) {
      setIsModalOpen(false);
    }
  }, [micPermission, locationPermission]);

  return (
    <Provider store={store}>
      <Modal
        isOpen={isModalOpen}
        contentLabel="Permission Request"
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)'
          },
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            border: '1px solid #333'
          }
        }}
      >
        <h2 style={{ color: '#ffffff' }}>Permission Request</h2>
        <p style={{ color: '#cccccc' }}>We need your permission to access your microphone and location for the best experience.</p>
        <div>
          <button 
            onClick={requestMicPermission} 
            disabled={micPermission}
            style={{
              marginRight: '10px', 
              backgroundColor: micPermission ? '#4CAF50' : '#2196F3',
              color: '#ffffff',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: micPermission ? 'default' : 'pointer'
            }}
          >
            {micPermission ? 'Microphone Enabled' : 'Enable Microphone'}
          </button>
          <button 
            onClick={requestLocationPermission}
            disabled={locationPermission}
            style={{
              backgroundColor: locationPermission ? '#4CAF50' : '#2196F3',
              color: '#ffffff',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: locationPermission ? 'default' : 'pointer'
            }}
          >
            {locationPermission ? 'Location Enabled' : 'Enable Location'}
          </button>
        </div>
      </Modal>
      <Dashboard />
    </Provider>
  );
}

export default App;
