import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Login from "../pages/auth/Login";
import CustomerList from "../pages/customers/CustomerList";
import CustomerForm from "../pages/customers/CustomerForm";
import ProductList from "../pages/products/ProductList";
import ProductForm from "../pages/products/ProductForm";
import OrderList from "../pages/orders/OrderList";
import OrderForm from "../pages/orders/OrderForm";
import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "customers",
        element: <CustomerList />,
      },
      {
        path: "customers/new",
        element: <CustomerForm />,
      },
      {
        path: "customers/:id",
        element: <CustomerForm />,
      },
      {
        path: "products",
        element: <ProductList />,
      },
      {
        path: "products/new",
        element: <ProductForm />,
      },
      {
        path: "products/:id",
        element: <ProductForm />,
      },
      {
        path: "orders",
        element: <OrderList />,
      },
      {
        path: "orders/new",
        element: <OrderForm />,
      },
      {
        path: "orders/:id",
        element: <OrderForm />,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
