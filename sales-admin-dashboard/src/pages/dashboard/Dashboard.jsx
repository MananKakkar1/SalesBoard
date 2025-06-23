import React from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/common/Button";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // Placeholder data, to be replaced with real API calls/selectors
  const stats = {
    customers: 120,
    orders: 45,
    products: 30,
    revenue: "$12,000",
    ordersToday: 5,
  };

  const recentOrders = [
    { id: 1, customer: "John Doe", total: "$120", date: "2024-06-23" },
    { id: 2, customer: "Jane Smith", total: "$80", date: "2024-06-22" },
  ];

  const recentCustomers = [
    { id: 1, name: "John Doe", email: "john@example.com" },
  ];

  const recentProducts = [
    { id: 1, name: "Widget A" },
  ];

  return (
      <div style={{ padding: 24 }}>
        <h1>Dashboard</h1>
        {/* Key Metrics */}
        <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
          <div>
            <h3>Total Customers</h3>
            <p>{stats.customers}</p>
          </div>
          <div>
            <h3>Total Orders</h3>
            <p>{stats.orders}</p>
          </div>
          <div>
            <h3>Total Products</h3>
            <p>{stats.products}</p>
          </div>
          <div>
            <h3>Total Revenue</h3>
            <p>{stats.revenue}</p>
          </div>
          <div>
            <h3>Orders Today</h3>
            <p>{stats.ordersToday}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ marginBottom: 32 }}>
          <Button
            color="primary"
            as={Link}
            to="/customers/new"
            style={{ marginRight: 8 }}
          >
            Add Customer
          </Button>
          <Button
            color="primary"
            as={Link}
            to="/orders/new"
            style={{ marginRight: 8 }}
          >
            Add Order
          </Button>
          <Button color="primary" as={Link} to="/products/new">
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
                <li key={order.id}>
                  #{order.id} - {order.customer} - {order.total} - {order.date}
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
