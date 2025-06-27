import React, { useEffect, useState } from "react";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useNavigate } from "react-router-dom";
import {
  deleteOrder,
  fetchOrders,
  searchOrders,
} from "../../features/orders/orderSlice";
import { useDispatch, useSelector } from "react-redux";

const OrderList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: orders, pagination } = useSelector((state) => state.orders);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const ordersArray = Array.isArray(orders) ? orders : [];

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    setLoading(true);
    try {
      if (value) {
        await dispatch(
          searchOrders({ query: value, page: 1, pageSize })
        ).unwrap();
      } else {
        await dispatch(fetchOrders({ page: 1, pageSize })).unwrap();
      }
    } catch (error) {
      console.error("Failed to search orders", error);
    }
    setLoading(false);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadOrders(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
    loadOrders(1, newPageSize);
  };

  const handleViewOrder = (orderId) => navigate(`/orders/${orderId}`);

  const handleDeleteOrder = async (orderId) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      await loadOrders();
    } catch (error) {
      console.error("Failed to delete or re-fetch orders:", error);
    }
  };

  const handleNewOrder = () => navigate("/orders/new");

  const loadOrders = async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      if (search) {
        await dispatch(
          searchOrders({
            query: search,
            page: currentPage,
            pageSize: currentPageSize,
          })
        ).unwrap();
      } else {
        await dispatch(
          fetchOrders({
            page: currentPage,
            pageSize: currentPageSize,
          })
        ).unwrap();
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
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
            ) : !ordersArray || ordersArray.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "8px", textAlign: "center" }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              ordersArray.map((order, index) => (
                <tr key={order.orderId || `order-${index}`}>
                  <td style={{ padding: "8px 16px" }}>{order.orderId}</td>
                  <td style={{ padding: "8px 16px" }}>{order.customerId}</td>
                  <td style={{ padding: "8px 16px" }}>{order.createdAt}</td>
                  <td style={{ padding: "8px 16px" }}>
                    ${(order.totalPrice || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "8px 16px" }}>
                    <Button
                      color="primary"
                      size="small"
                      onClick={() => handleViewOrder(order.orderId)}
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
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(page - 1)}
            style={{ marginLeft: 16 }}
          >
            Previous
          </Button>
          <span style={{ margin: "0 8px" }}>
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <Button
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderList;
