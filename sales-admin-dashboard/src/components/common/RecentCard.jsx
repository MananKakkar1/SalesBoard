//Common RecentCard used multiple times throughout the dashboard for better organization.
import React from "react";
import styled from "@emotion/styled";
import Card, { CardHeader, CardContent } from "./Card";

const CardTitle = styled.h3`
  margin: 0;
`;

const ItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyMessage = styled.p`
  color: rgba(0, 0, 0, 0.54);
  text-align: center;
`;

const RecentCard = ({ title, items, renderItem, emptyMessage }) => (
  <Card style={{ flex: 1, minWidth: 300 }}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {items.length > 0 ? (
        <ItemsContainer>{items.map(renderItem)}</ItemsContainer>
      ) : (
        <EmptyMessage>{emptyMessage}</EmptyMessage>
      )}
    </CardContent>
  </Card>
);

export default RecentCard;