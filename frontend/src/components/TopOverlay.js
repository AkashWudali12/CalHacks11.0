import styled from "styled-components";
import React from "react";
import NavigationAssistant from "./VoiceNavigationAssistant";

const StyledTopOverlay = styled.div`
  background-color: rgba(0, 0, 0, 0.95);
  border-radius: 20px;
  padding: 20px;
  margin-left: 10px;
  margin-right: 10px;
  color: #ffffff;
  max-height: 30vh;
  overflow-y: auto;
`;

export const TopOverlay = () => {
  return (
    <StyledTopOverlay>
      <NavigationAssistant />
    </StyledTopOverlay>
  );
};
