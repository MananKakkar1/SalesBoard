import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/common/Button";
import { Link, useNavigate } from "react-router-dom";
import { getTotalRevenue as fetchTotalRevenue } from "../../features/orders/orderSlice";
import { getTotalOrders as fetchTotalOrders } from "../../features/orders/orderSlice";
import { getTotalCustomers as fetchTotalCustomers } from "../../features/customers/customerSlice";
import { getTotalProducts as fetchTotalProducts } from "../../features/products/productSlice";
import { getRecentOrders as fetchRecentOrders } from "../../features/orders/orderSlice";
import { getRecentProducts as fetchRecentProducts } from "../../features/products/productSlice";
import { getRecentCustomers as fetchRecentCustomers } from "../../features/customers/customerSlice";
import { useDispatch } from "react-redux";

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);

  const handleAddCustomer = () => {
    navigate("/customers/new");
  };
  const handleAddOrder = () => {
    navigate("/orders/new");
  };
  const handleAddProduct = () => {
    navigate("/products/new");
  };

  const getTotalRevenue = async () => {
    const data = await dispatch(fetchTotalRevenue()).unwrap();
    return data;
  };

  const getTotalCustomers = async () => {
    const data = await dispatch(fetchTotalCustomers()).unwrap();
    return data;
  };

  const getTotalOrders = async () => {
    const data = await dispatch(fetchTotalOrders()).unwrap();
    return data;
  };

  const getTotalProducts = async () => {
    const data = await dispatch(fetchTotalProducts()).unwrap();
    return data;
  };

  const getThreeRecentProducts = async () => {
    const data = await dispatch(fetchRecentProducts()).unwrap();
    return data;
  }

  const getThreeRecentOrders = async () => {
    const data = await dispatch(fetchRecentOrders()).unwrap();
    return data;
  };

  const getThreeRecentCustomers = async () => {
    const data = await dispatch(fetchRecentCustomers()).unwrap();
    return data;
  }

  const [stats, setStats] = useState({
    customers: null,
    orders: null,
    products: null,
    revenue: null,
  });

  useEffect(() => {
    const updateStats = async () => {
      try {
        const totalCustomers = await getTotalCustomers();
        const totalOrders = await getTotalOrders();
        const totalProducts = await getTotalProducts();
        const totalRevenue = await getTotalRevenue();

        setStats({
          customers: totalCustomers,
          orders: totalOrders,
          products: totalProducts,
          revenue: totalRevenue,
        });

        const recentOrders = await getThreeRecentOrders();
        const recentCustomers = await getThreeRecentCustomers();
        const recentProducts = await getThreeRecentProducts();
        setRecentProducts(recentProducts);
        setRecentOrders(recentOrders);
        setRecentCustomers(recentCustomers);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    updateStats();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      {/* Key Metrics */}
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        <div>
          <h3>Total Customers</h3>
          <p>{stats.customers ? stats.customers.totalCustomers : "Loading..."}</p>
        </div>
        <div>
          <h3>Total Orders</h3>
          <p>{stats.orders ? stats.orders.totalOrders : "Loading..."}</p>
        </div>
        <div>
          <h3>Total Products</h3>
          <p>{stats.products ? stats.products.totalProducts : "Loading..."}</p>
        </div>
        <div>
          <h3>Total Revenue</h3>
          <p>{stats.revenue ? stats.revenue.totalRevenue : "Loading..."}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: 32 }}>
        <Button
          color="primary"
          onClick={handleAddCustomer}
          style={{ marginRight: 8 }}
        >
          Add Customer
        </Button>
        <Button
          color="primary"
          onClick={handleAddOrder}
          style={{ marginRight: 8 }}
        >
          Add Order
        </Button>
        <Button color="primary" onClick={handleAddProduct}>
          Add Product
        </Button>
        <div style={{ marginTop: 8 }}>
          <Link to="/customers">View All Customers</Link> |{" "}
          <Link to="/orders">View All Orders</Link> |{" "}
          <Link to="/products">View All Products</Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: "flex", gap: 32 }}>
        <div>
          <h3>Recent Orders</h3>
          <ul>
            {recentOrders.map((order) => (
              <li key={order.orderId} style={{ marginBottom: "8px" }}>
                <strong>Order ID:</strong> {order.orderId} <br />
                <strong>Customer ID:</strong> {order.customerId} <br />
                <strong>Total Price:</strong> ${order.totalPrice.toFixed(2)}{" "}
                <br />
                <strong>Date:</strong>{" "}
                {new Date(order.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Recent Customers</h3>
          <ul>
            {recentCustomers.map((c) => (
              <li key={c.id}>
                {c.name} ({c.email})
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Recent Products</h3>
          <ul>
            {recentProducts.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
