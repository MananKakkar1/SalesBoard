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
          <strong>Total Price:</strong> ${order.totalPrice}
        </p>
        <hr />
        <h3>Items:</h3>
        <ul>
          {order.productItems?.map((item, idx) => (
            <li key={idx}>
              <strong>Product ID: {item.productId}</strong>
              <br />
              Quantity: {item.quantity} | Price: ${item.salePrice}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default OrderDetail;
