import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';

const NavigationAssistant = () => {
  const [vapi, setVapi] = useState(null);
  const [callActive, setCallActive] = useState(false);

  useEffect(() => {
    const vapiInstance = new Vapi('47b3eb9c-9e6e-4fa7-9a55-a9c2d3caf50a');
    setVapi(vapiInstance);

    vapiInstance.on('call-start', () => {
      console.log('Call started');
      setCallActive(true);
    });

    vapiInstance.on('call-end', () => {
      console.log('Call ended');
      setCallActive(false);
    });

    vapiInstance.on('error', (error) => {
      console.error('Vapi error:', error);
      setCallActive(false);
    });

    return () => {
      vapiInstance.removeAllListeners();
    };
  }, []);

  const startCall = () => {
    if (vapi && !callActive) {
      vapi.start({
        name: "Fire Evacuation Assistant",
        firstMessage: `Emergency! This is the Fire Evacuation Assistant. I'm here to guide you to safety. What's your current location in the building?`,
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
        voice: {
          provider: "playht",
          voiceId: "jennifer",
        },
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a Fire Evacuation Assistant. Guide the user to safety, asking for their location and providing clear, calm instructions for evacuation. Prioritize user safety and quick evacuation.`
            }
          ],
        },
      });
    }
  };

  const endCall = () => {
    if (vapi && callActive) {
      vapi.stop();
    }
  };

  return null; // We don't need to render anything here anymore
};

export default NavigationAssistant;
