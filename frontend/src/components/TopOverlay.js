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
  width: 100%;
  height: 100%;
`;

const WaveformBar = styled.div`
  width: 3px;
  background-color: white;
  margin: 0 2px;
  animation: ${waveformAnimation} 0.5s ease-in-out infinite;
  animation-delay: ${props => props.delay}s;
`;

export const TopOverlay = ({ isDropped, onHide }) => {
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
    setIsSlideUp(true);
    setTimeout(() => {
      onHide();
      setIsSlideUp(false);
    }, 300); // Match this with the animation duration
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

  return (
    <StyledTopOverlay isDropped={isDropped} isSlideUp={isSlideUp}>
      <OverlayContent>
        <Title>🚨 Fire Evacuation</Title>
        <ButtonContainer>
          <GreenButton onClick={startCall} disabled={callActive}>
            {renderButtonContent()}
          </GreenButton>
          <RedButton onClick={endCall} disabled={!callActive}>
            <FaPhoneSlash />
          </RedButton>
        </ButtonContainer>
      </OverlayContent>
    </StyledTopOverlay>
  );
};
