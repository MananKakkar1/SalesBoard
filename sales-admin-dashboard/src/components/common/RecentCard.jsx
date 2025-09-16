// Common RecentCard used multiple times throughout the dashboard for better organization.
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

const RecentCard = ({ title, items, renderItem, emptyMessage, style }) => {
  const list = Array.isArray(items) ? items : [];
  const safeRenderItem =
    typeof renderItem === "function" ? renderItem : () => null;

  return (
    <Card style={{ flex: 1, minWidth: 300, ...(style || {}) }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length > 0 ? (
          <ItemsContainer>
            {list.map((item, idx) => safeRenderItem(item, idx))}
          </ItemsContainer>
        ) : (
          <EmptyMessage>{emptyMessage || "No data to show yet."}</EmptyMessage>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentCard;
