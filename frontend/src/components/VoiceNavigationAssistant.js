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
    if (vapi) {
      vapi.start({
        name: "Navigation Assistant",
        firstMessage: `Hello! Your destination is Berkeley, CA at coordinates 40.7128° N, 74.0060° W. How can I assist you with directions?`,
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
              content: `You are a navigation assistant. The user's destination is Berkeley, CA at coordinates 40.7128° N, 74.0060° W. 
                        Provide directions and answer questions about the route. If asked about traffic or current conditions, 
                        explain that you don't have real-time data and can only provide general directions.`
            }
          ],
        },
      });
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
    }
  };

  return (
    <div>
      <button onClick={startCall} disabled={callActive}>
        Start Navigation Call
      </button>
      <button onClick={endCall} disabled={!callActive}>
        End Call
      </button>
    </div>
  );
};

export default NavigationAssistant;
