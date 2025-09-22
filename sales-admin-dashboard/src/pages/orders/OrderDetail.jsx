// This is the OrderDetail page, accessed from the OrderList "View" button.
// Shows full order information including line-level warehouse that fulfilled each item.
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchOrderById } from "../../features/orders/orderSlice";
import Card, { CardHeader, CardContent } from "../../components/common/Card";

const OrderDetail = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(null);

  const orderId = location.pathname.split("/").pop();

  useEffect(() => {
    const getOrder = async () => {
      if (!orderId) {
        console.error("orderId is missing in URL");
        return;
      }
      try {
        const data = await dispatch(fetchOrderById(orderId)).unwrap();
        setOrder(data);
      } catch (err) {
        console.error("Failed to fetch order:", err);
      }
    };
    getOrder();
  }, [dispatch, orderId]);

  if (!order) {
    return <div>Loading...</div>;
  }

  const items = Array.isArray(order.productItems) ? order.productItems : [];

  return (
    <Card>
      <CardHeader>
        <h2>Order #{order.orderId}</h2>
      </CardHeader>
      <CardContent>
        <p>
          <strong>Customer ID:</strong> {order.customerId}
        </p>
        <p>
          <strong>Date:</strong> {order.createdAt}
        </p>
        <p>
          <strong>Total Price:</strong> ${Number(order.totalPrice || 0).toFixed(2)}
        </p>
        <hr />
        <h3>Items:</h3>
        <ul>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              <strong>Product ID: {item.productId}</strong>
              <br />
              Quantity: {item.quantity} | Unit Price: ${Number(item.salePrice || 0).toFixed(2)}
              <br />
              Warehouse: {item.warehouseName || (item.warehouseId ? `#${item.warehouseId}` : "N/A")}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default OrderDetail;
