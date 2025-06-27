import React from "react";
import styled from "@emotion/styled";
import Card, { CardContent } from "./Card";

const StatContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatInfo = styled.div``;

const StatTitle = styled.h3`
  margin: 0 0 8px 0;
  color: rgba(0, 0, 0, 0.54);
  font-size: 0.875rem;
`;

const StatValue = styled.p`
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
`;

const StatIcon = styled.div`
  font-size: 2rem;
`;

const StatCard = ({ title, value, icon }) => (
  <Card style={{ flex: 1, minWidth: 200 }}>
    <CardContent>
      <StatContainer>
        <StatInfo>
          <StatTitle>{title}</StatTitle>
          <StatValue>{value || "Loading..."}</StatValue>
        </StatInfo>
        <StatIcon>{icon}</StatIcon>
      </StatContainer>
    </CardContent>
  </Card>
);

export default StatCard;