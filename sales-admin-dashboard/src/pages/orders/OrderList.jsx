import React, { useEffect, useState } from "react";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useNavigate } from "react-router-dom";
import { deleteOrder, fetchOrders } from "../../features/orders/orderSlice";
import { useDispatch } from "react-redux";

const OrderList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const dispatch = useDispatch();

  const handleSearchChange = (e) => setSearch(e.target.value);
  const handlePageChange = (newPage) => setPage(newPage);
  const handleLimitChange = (e) => setLimit(Number(e.target.value));
  const handleViewOrder = (e) => {
    console.log("View order with ID:", e);
  };
  const handleDeleteOrder = async (orderId) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      const data = await dispatch(fetchOrders()).unwrap();

      const ordersArray = Array.isArray(data) ? data : data.orders || [];

      const uniqueOrdersMap = new Map();
      ordersArray.forEach((order) => {
        if (!uniqueOrdersMap.has(order.orderId)) {
          uniqueOrdersMap.set(order.orderId, order);
        }
      });

      const uniqueOrders = Array.from(uniqueOrdersMap.values());
      setOrders(uniqueOrders);
    } catch (error) {
      console.error("Failed to delete or re-fetch orders:", error);
    }
  };
  const handleNewOrder = () => {
    navigate("/orders/new");
  };

  useEffect(() => {
    const getOrders = async () => {
      setLoading(true);
      try {
        const data = await dispatch(fetchOrders()).unwrap();

        const ordersArray = Array.isArray(data) ? data : data.orders || [];

        const uniqueOrdersMap = new Map();
        ordersArray.forEach((order) => {
          if (!uniqueOrdersMap.has(order.orderId)) {
            uniqueOrdersMap.set(order.orderId, order);
          }
        });
        const uniqueOrders = Array.from(uniqueOrdersMap.values());

        setOrders(uniqueOrders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setOrders([]);
      }
      setLoading(false);
    };
    getOrders();
  }, [dispatch]);

  return (
    <Card>
      <CardHeader>
        <h2>Sales Orders</h2>
        <Button color="primary" onClick={handleNewOrder}>
          Add New Order
        </Button>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: 16 }}>
          <InputField
            id="search"
            placeholder="Search by customer name/email, order ID, or date"
            fullWidth
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 16px" }}>
                Order ID
              </th>
              <th style={{ textAlign: "left", padding: "8px 16px" }}>
                Customer ID
              </th>
              <th style={{ textAlign: "left", padding: "8px 16px" }}>Date</th>
              <th style={{ textAlign: "left", padding: "8px 16px" }}>Total</th>
              <th style={{ textAlign: "left", padding: "8px 16px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  Loading...
                </td>
              </tr>
            ) : !Array.isArray(orders) || orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.orderId}>
                  <td style={{ padding: "8px 16px" }}>{order.orderId}</td>
                  <td style={{ padding: "8px 16px" }}>{order.customerId}</td>
                  <td style={{ padding: "8px 16px" }}>{order.createdAt}</td>
                  <td style={{ padding: "8px 16px" }}>{order.totalPrice}</td>
                  <td style={{ padding: "8px 16px" }}>
                    <Button
                      color="primary"
                      size="small"
                      onClick={handleViewOrder}
                    >
                      View
                    </Button>
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
        <div style={{ marginTop: 16 }}>
          <label>
            Page Size:&nbsp;
            <select value={limit} onChange={handleLimitChange}>
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            style={{ marginLeft: 16 }}
          >
            Previous
          </Button>
          <span style={{ margin: "0 8px" }}>Page {page}</span>
          <Button onClick={() => handlePageChange(page + 1)}>Next</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderList;
