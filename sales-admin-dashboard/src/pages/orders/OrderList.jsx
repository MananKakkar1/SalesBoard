import React, { useEffect, useState } from "react";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

const OrderList = () => {
  const dispatch = useDispatch();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  const handleNewOrder = () => {
    console.log("Navigate to new order form");
    navigate("/orders/new");
  }

  const handleDeleteOrder = async (id) => {
    console.log("Deleting order with ID:", id);
  };

  const handleSearchChange = async (e) => {
    console.log("Search input changed:", e.target.value);
  };

  return (
    <Card>
      <CardHeader>
        <h2>Sales Orders</h2>
        <Button color="primary" onClick={handleNewOrder}>
          New Order
        </Button>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: 16 }}>
          <InputField
            id="search"
            placeholder="Search by customer, order ID, or date"
            fullWidth
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px" }}>Order ID</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Customer</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Email</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Date</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Total</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : !orders || orders.length === 0 ? null : (
              orders.map((order) => (
                <tr key={order.orderId}>
                  <td style={{ padding: "8px" }}>{order.orderId}</td>
                  <td style={{ padding: "8px" }}>{order.customerName}</td>
                  <td style={{ padding: "8px" }}>{order.customerEmail}</td>
                  <td style={{ padding: "8px" }}>{order.createdAt}</td>
                  <td style={{ padding: "8px" }}>{order.totalPrice}</td>
                  <td style={{ padding: "8px" }}>
                    <Button
                      color="secondary"
                      size="small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDeleteOrder(order.orderId)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Pagination controls here */}
      </CardContent>
    </Card>
  );
};

export default OrderList;
