import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Vapi from '@vapi-ai/web';
import { FaPhone, FaPhoneSlash } from 'react-icons/fa';

const dropDownAnimation = keyframes`
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideUpAnimation = keyframes`
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-100%);
    opacity: 0;
  }
`;

const StyledTopOverlay = styled.div`
  background-color: rgba(0, 0, 0, 0.95);
  border-radius: 30px;
  padding: 20px;
  margin-left: 10px;
  margin-right: 10px;
  margin-top: 10px;
  color: #ffffff;
  max-height: 30vh;
  overflow-y: auto;
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  
  ${props => props.isDropped ? css`
    animation: ${dropDownAnimation} 0.3s ease-out forwards;
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  ` : css`
    opacity: 0;
    transform: translateY(-100%);
    pointer-events: none;
  `}
  
  ${props => props.isSlideUp && css`
    animation: ${slideUpAnimation} 0.3s ease-out forwards;
  `}
`;

const HideButton = styled.button`
  background-color: #f44336;
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  margin: 4px 2px;
  cursor: pointer;
  float: right;
`;

const OverlayContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const CircularButton = styled.button`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: white;
  font-size: 1.2rem;
  overflow: hidden;
`;

const GreenButton = styled(CircularButton)`
  background-color: #4CAF50;
`;

const RedButton = styled(CircularButton)`
  background-color: #f44336;
`;

const waveformAnimation = keyframes`
  0% { height: 10px; }
  50% { height: 30px; }
  100% { height: 10px; }
`;

const WaveformContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50%;
  height: 50%;
`;

const WaveformBar = styled.div`
  width: 3px;
  background-color: white;
  margin: 0 2px;
  animation: ${waveformAnimation} 0.5s ease-in-out infinite;
  animation-delay: ${props => props.delay}s;
`;

export const TopOverlay = ({ isDropped, onHide, onAcceptCall, onDeclineCall, isCallAccepted, isCallDeclined, currentPosition, optimalDestination, route  }) => {
  const [vapi, setVapi] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [isSlideUp, setIsSlideUp] = useState(false);

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
    // Extract route instructions
    const instructions = route.legs[0].steps.map(step => step.maneuver.instruction);
    const instructionsText = instructions.join(' Then, ');
    const userLocationDesc = "near the intersection of Van Ness Avenue and Grove Street, close to City Hall";

    vapi.start('1632d22c-6b94-4a72-bc5f-be70f99dd14f', {
      name: "Fire Evacuation Assistant",
      firstMessage: `Emergency! This is the Fire Evacuation Assistant. I'm here to guide you to safety. You're currently ${userLocationDesc} in San Francisco. Are you ready to begin evacuation?`,
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
              content: `You are a Fire Evacuation Assistant. Guide the user to safety, providing clear, 
              calm instructions for evacuation. Prioritize user safety and quick evacuation. 
              Current user location: ${currentPosition.join(', ')}
              Safe destination: ${optimalDestination.join(', ')}
              Route instructions: ${instructionsText}
              
              Provide these instructions to the user step by step, ensuring they understand each direction before moving to the next. Specify the street names that are familiar with human. Ask for confirmation after each major step. If the user seems confused or lost, repeat the current step and offer clarification.`
              
            }
          ],

// 
// 0
// : 
// "Drive northwest."
// 1
// : 
// "Turn left."
// 2
// : 
// "Turn left onto 4th Street."
// 3
// : 
// "Turn left onto Folsom Street."
// 4
// : 
// "Turn left onto 3rd Street."
// 5
// : 
// "Turn left onto Broadway."
// 6
// : 
// "Turn right onto US 101 North/Van Ness Avenue."
// 7
// : 
// "Turn left onto US 101 North/Lombard Street."
// 8
// : 
// "Keep right to stay on US 101 North."
// 9
// : 
// "Take exit 452 toward Central San Rafael."
// 10
// : 
// "Turn left onto Third Street."
// 11
// : 
// "You have arrived at your destination."
        },
      });
      onAcceptCall(); // Call this to inform the parent component
      setCallActive(true);
    }
  };

  const endCall = () => {
    if (vapi && callActive) {
      vapi.stop();
    }
    setCallActive(false);
    setIsSlideUp(true);
    setTimeout(() => {
      onHide();
      setIsSlideUp(false);
    }, 300);
  };

  const renderButtonContent = () => {
    if (callActive) {
      return (
        <WaveformContainer>
          {[0, 1, 2, 3].map((i) => (
            <WaveformBar key={i} delay={i * 0.1} />
          ))}
        </WaveformContainer>
      );
    }
    return <FaPhone />;
  };

  const handleDecline = () => {
    onDeclineCall();
    // Add any other logic for declining the call
  };

  return (
    <StyledTopOverlay isDropped={isDropped} isSlideUp={isSlideUp}>
      <OverlayContent>
        <Title>🚨 Fire Evacuation</Title>
        <ButtonContainer>
          <GreenButton onClick={startCall} disabled={callActive}>
            {renderButtonContent()}
          </GreenButton>
          <RedButton onClick={endCall}>
            <FaPhoneSlash />
          </RedButton>
        </ButtonContainer>
      </OverlayContent>
    </StyledTopOverlay>
  );
};
