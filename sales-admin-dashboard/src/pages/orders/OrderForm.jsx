import React, { useState, useEffect } from "react";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { searchProducts, searchCustomers } from "../../features/auth/authSlice";

const PRODUCTS_KEY = "orderFormProducts";

const OrderForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [customerQuery, setCustomerQuery] = useState("");
  const [productsQuery, setProductsQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem(PRODUCTS_KEY);
    return saved
      ? JSON.parse(saved)
      : [{ product: "", quantity: null, salePrice: 0 }];
  });

  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  const handleOrderSubmit = () => {
    navigate(`/orders`);
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setCustomerQuery(value);
    if (value) {
      try {
        const data = await dispatch(searchCustomers(value)).unwrap();
        setCustomerOptions(data);
      } catch (error) {
        console.error("Failed to search customers", error);
        setCustomerOptions([0]);
      }
    } else {
      setCustomerOptions([]);
    }
  };

  return (
    <div>
      <h1>New Order</h1>
      <div>
        <h3 style={{ marginBottom: 4 }}>Select Customer</h3>
        <div style={{ position: "relative" }}>
          <InputField
            id="search"
            placeholder="Search Customers by Name or Email"
            fullWidth={false}
            value={customerQuery}
            onChange={handleSearchChange}
            style={{ width: 675 }}
          />
          {customerQuery &&
            Array.isArray(customerOptions) &&
            customerOptions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 42,
                  left: 0,
                  width: "100%",
                  background: "#fff",
                  border: "1px solid #ccc",
                  zIndex: 10,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {customerOptions.map((option, idx) => (
                  <div
                    key={option.id || idx}
                    style={{
                      padding: "8px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                    onMouseDown={() => {
                      setSelectedCustomer(option);
                      setCustomerQuery(option.name || option.email || "");
                      setCustomerOptions([]);
                    }}
                  >
                    {option.name}{" "}
                    {option.email && (
                      <span style={{ color: "#888" }}>({option.email})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: 4 }}>Products:</h3>
        {products.map((product, idx) => (
          <div key={idx} style={{ display: "flex", gap: 16, marginBottom: 8 }}>
            <InputField
              id={`productSearch-${idx}`}
              placeholder="Search Products by Name"
              value={product.product}
              onChange={(e) => {
                const updated = [...products];
                updated[idx].product = e.target.value;
                setProducts(updated);
              }}
              style={{ width: 250 }}
            />
            <InputField
              id={`quantity-${idx}`}
              placeholder="Quantity"
              type="number"
              value={product.quantity}
              onChange={(e) => {
                const updated = [...products];
                updated[idx].quantity = e.target.value;
                setProducts(updated);
              }}
              style={{ width: 100 }}
            />
            <Button
              color="primary"
              onClick={() => {
                setProducts([
                  ...products,
                  { product: "", quantity: null, salePrice: 0 },
                ]);
              }}
              style={{ height: 42 }}
              disabled={idx !== products.length - 1}
            >
              Add Product
            </Button>
            <Button
              color="secondary"
              onClick={() => {
                const updated = [...products];
                updated.splice(idx, 1);
                setProducts(updated);
              }}
              style={{ height: 42 }}
            >
              Remove Product
            </Button>
          </div>
        ))}
      </div>
      <div>
        <h3>Total Price: ${totalPrice.toFixed(2)}</h3>
      </div>
      <Button color="primary" onClick={handleOrderSubmit} Submit Order>
        Submit Order
      </Button>
    </div>
  );
};

export default OrderForm;
