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

  return (
    <div>
      <h1>New Order</h1>
      <div>
        <h3 style={{ marginBottom: 4 }}>Select Customer</h3>
        <InputField
          id="search"
          placeholder="Search Customers by Name or Email"
          fullWidth={false}
          value={customerQuery}
          onChange={(e) => setCustomerQuery(e.target.value)}
          style={{ width: 675 }}
        />
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
