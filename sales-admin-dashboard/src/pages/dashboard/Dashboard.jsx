// This is the dashboard, which is the default page that users visit after signing in from the login page.
import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import Button from "../../components/common/Button";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import StatCard from "../../components/common/StatCard";
import RecentCard from "../../components/common/RecentCard";
import { Link, useNavigate } from "react-router-dom";
import { getTotalRevenue as fetchTotalRevenue } from "../../features/orders/orderSlice";
import { getTotalOrders as fetchTotalOrders } from "../../features/orders/orderSlice";
import { getTotalCustomers as fetchTotalCustomers } from "../../features/customers/customerSlice";
import { getTotalProducts as fetchTotalProducts } from "../../features/products/productSlice";
import { getRecentOrders as fetchRecentOrders } from "../../features/orders/orderSlice";
import { getRecentProducts as fetchRecentProducts } from "../../features/products/productSlice";
import { getRecentCustomers as fetchRecentCustomers } from "../../features/customers/customerSlice";
// 👇 New import (if you don't have it yet, add the thunk to productSlice as described earlier)
import { getLowStock as fetchLowStock } from "../../features/products/productSlice";
import { useDispatch } from "react-redux";

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]); // 👈 NEW
  const LOW_STOCK_THRESHOLD = 5; // 👈 configurable threshold

  // Initial stats are set to null to avoid showing any dummy/fake data
  const [stats, setStats] = useState({
    customers: null, // expected to be an object from customers slice (e.g., { totalCustomers })
    orders: null,    // number from orders slice
    products: null,  // expected to be an object from products slice (e.g., { totalProducts })
    revenue: null,   // number from orders slice
  });

  // Navigate helpers
  const handleAddCustomer = () => navigate("/customers/new");
  const handleAddOrder = () => navigate("/orders/new");
  const handleAddProduct = () => navigate("/products/new");

  // Thunk wrappers
  const getTotalRevenue = async () => {
    const data = await dispatch(fetchTotalRevenue()).unwrap(); // number
    return data;
  };

  const getTotalCustomers = async () => {
    const data = await dispatch(fetchTotalCustomers()).unwrap(); // { totalCustomers }
    return data;
  };

  const getTotalOrders = async () => {
    const data = await dispatch(fetchTotalOrders()).unwrap(); // number
    return data;
  };

  const getTotalProducts = async () => {
    const data = await dispatch(fetchTotalProducts()).unwrap(); // { totalProducts }
    return data;
  };

  const getThreeRecentProducts = async () => {
    const data = await dispatch(fetchRecentProducts()).unwrap(); // array
    return data;
  };

  const getThreeRecentOrders = async () => {
    const data = await dispatch(fetchRecentOrders()).unwrap(); // array
    return data;
  };

  const getThreeRecentCustomers = async () => {
    const data = await dispatch(fetchRecentCustomers()).unwrap(); // array
    return data;
  };

  // 👇 Optional: low stock fetch wrapper (returns array or null on failure)
  const getLowStock = async (threshold = LOW_STOCK_THRESHOLD) => {
    try {
      const data = await dispatch(fetchLowStock(threshold)).unwrap(); // array
      return data;
    } catch {
      return null; // let fallback logic handle it
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [
          totalCustomers,
          totalOrders,
          totalProducts,
          totalRevenue,
          recentOrdersRes,
          recentCustomersRes,
          recentProductsRes,
          lowStockRes, // 👈 try server-provided low-stock list
        ] = await Promise.all([
          getTotalCustomers(),
          getTotalOrders(),
          getTotalProducts(),
          getTotalRevenue(),
          getThreeRecentOrders(),
          getThreeRecentCustomers(),
          getThreeRecentProducts(),
          getLowStock(LOW_STOCK_THRESHOLD), // may be null if thunk isn't implemented yet
        ]);

        setStats({
          customers: totalCustomers,
          orders: Number(totalOrders ?? 0),
          products: totalProducts,
          revenue: Number(totalRevenue ?? 0),
        });

        const recentOrdersSafe = Array.isArray(recentOrdersRes) ? recentOrdersRes : [];
        const recentCustomersSafe = Array.isArray(recentCustomersRes) ? recentCustomersRes : [];
        const recentProductsSafe = Array.isArray(recentProductsRes) ? recentProductsRes : [];

        setRecentOrders(recentOrdersSafe);
        setRecentCustomers(recentCustomersSafe);
        setRecentProducts(recentProductsSafe);

        // 👇 Low-stock: prefer API result; otherwise, fall back to filtering recent products
        const fallbackLowStock =
          recentProductsSafe.filter(
            (p) => Number.isFinite(p?.stock) && p.stock <= LOW_STOCK_THRESHOLD
          ) || [];

        setLowStock(Array.isArray(lowStockRes) ? lowStockRes : fallbackLowStock);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };

    loadDashboardData();
  }, [dispatch]);

  return (
    <div
      style={{ padding: 24, backgroundColor: "#f5f5f5", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "2.5rem" }}>Dashboard</h1>
          <p style={{ margin: 0, color: "rgba(0, 0, 0, 0.54)" }}>
            Welcome to your sales administration dashboard
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <StatCard
            title="Total Customers"
            value={stats.customers?.totalCustomers}
            icon="👤"
          />
          <StatCard
            title="Total Orders"
            value={Number.isFinite(stats.orders) ? stats.orders : null}
            icon="📦"
          />
          <StatCard
            title="Total Products"
            value={stats.products?.totalProducts}
            icon="🏷️"
          />
          <StatCard
            title="Total Revenue"
            value={
              Number.isFinite(stats.revenue)
                ? `$${stats.revenue.toFixed(2)}`
                : null
            }
            icon="💰"
          />
        </div>

        {/* Quick Actions */}
        <Card style={{ marginBottom: 32 }}>
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
          </div>
          <CardContent>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
                justifyContent: "center",
              }}
            >
              <Button color="primary" onClick={handleAddCustomer}>
                Add Customer
              </Button>
              <Button color="primary" onClick={handleAddOrder}>
                Add Order
              </Button>
              <Button color="primary" onClick={handleAddProduct}>
                Add Product
              </Button>
            </div>
            <div
              style={{
                paddingTop: 16,
                borderTop: "1px solid rgba(0, 0, 0, 0.12)",
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Link
                to="/customers"
                style={{ color: "#3f51b5", textDecoration: "none" }}
              >
                View All Customers
              </Link>
              <Link
                to="/orders"
                style={{ color: "#3f51b5", textDecoration: "none" }}
              >
                View All Orders
              </Link>
              <Link
                to="/products"
                style={{ color: "#3f51b5", textDecoration: "none" }}
              >
                View All Products
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Data */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: 24,
          }}
        >
          <RecentCard
            title="Recent Orders"
            items={Array.isArray(recentOrders) ? recentOrders : []}
            emptyMessage="No recent orders"
            renderItem={(order) => (
              <div
                key={order.orderId}
                style={{
                  padding: 12,
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: 4,
                  backgroundColor: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <strong>Order #{order.orderId}</strong>
                  <span style={{ color: "#4caf50", fontWeight: 600 }}>
                    $
                    {Number.isFinite(order.totalPrice)
                      ? order.totalPrice.toFixed(2)
                      : "0.00"}
                  </span>
                </div>
                <div
                  style={{ fontSize: "0.875rem", color: "rgba(0, 0, 0, 0.54)" }}
                >
                  Customer ID: {order.customerId} •{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : ""}
                </div>
              </div>
            )}
          />

          <RecentCard
            title="Recent Customers"
            items={Array.isArray(recentCustomers) ? recentCustomers : []}
            emptyMessage="No recent customers"
            renderItem={(customer) => (
              <div
                key={customer.id}
                style={{
                  padding: 12,
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: 4,
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {customer.name}
                </div>
                <div
                  style={{ fontSize: "0.875rem", color: "rgba(0, 0, 0, 0.54)" }}
                >
                  {customer.email}
                </div>
              </div>
            )}
          />

          <RecentCard
            title="Recent Products"
            items={Array.isArray(recentProducts) ? recentProducts : []}
            emptyMessage="No recent products"
            renderItem={(product) => (
              <div
                key={product.id}
                style={{
                  padding: 12,
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                  borderRadius: 4,
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 600 }}>{product.name}</div>
                {Number.isFinite(product?.price) && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    ${product.price.toFixed(2)}
                  </div>
                )}
              </div>
            )}
          />

          {/* 👇 NEW: Low Stock alert card */}
          <RecentCard
            title={`Low Stock (≤ ${LOW_STOCK_THRESHOLD})`}
            items={Array.isArray(lowStock) ? lowStock : []}
            emptyMessage="All good — no low stock items"
            renderItem={(p) => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  border: "1px solid rgba(255, 111, 0, 0.4)",
                  borderRadius: 4,
                  backgroundColor: "#fff8e1",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{p.name}</strong>
                  <span style={{ fontWeight: 700 }}>
                    Stock: {Number.isFinite(p?.stock) ? p.stock : 0}
                  </span>
                </div>
                {Number.isFinite(p?.price) && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: "0.875rem",
                      color: "rgba(0, 0, 0, 0.54)",
                    }}
                  >
                    ${p.price.toFixed(2)}
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
