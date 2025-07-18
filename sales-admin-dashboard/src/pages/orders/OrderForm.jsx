// This is the OrderForm page, which can only be accessed through the Dashboard or the OrderList page. 
// This page displays the form used to create new orders and handles order creation by sending API calls to the backend.
import React, { useState, useEffect } from "react";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  searchProducts,
  fetchProductById,
  updateProduct,
  updateProductStock,
  searchProductsSimple,
} from "../../features/products/productSlice";
import {
  searchCustomers,
  searchCustomersSimple,
} from "../../features/customers/customerSlice";
import { createOrder } from "../../features/orders/orderSlice";

// Keys for localStorage so that InputField data doesn't get lost on refresh 
// (This is done so that selected customers and products don't disappear)
const PRODUCTS_KEY = "orderFormProducts";
const PRODUCT_QUERIES_KEY = "orderFormProductQueries";
const CUSTOMER_QUERY_KEY = "orderFormCustomerQuery";
const SELECTED_CUSTOMER_KEY = "orderFormSelectedCustomer";

const OrderForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [customerQuery, setCustomerQuery] = useState(() => {
    return localStorage.getItem(CUSTOMER_QUERY_KEY) || "";
  });

  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(() => {
    const saved = localStorage.getItem(SELECTED_CUSTOMER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem(PRODUCTS_KEY);
    return saved
      ? JSON.parse(saved)
      : [{ productId: null, quantity: null, salePrice: null }];
  });

  const [productQueries, setProductQueries] = useState(() => {
    const saved = localStorage.getItem(PRODUCT_QUERIES_KEY);
    return saved ? JSON.parse(saved) : products.map(() => "");
  });

  const [productOptions, setProductOptions] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(PRODUCT_QUERIES_KEY, JSON.stringify(productQueries));
  }, [productQueries]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_QUERY_KEY, customerQuery);
  }, [customerQuery]);

  // Add or remove selected customer from local storage depending on whether the user has deselected the customer or not
  useEffect(() => {
    if (selectedCustomer) {
      localStorage.setItem(
        SELECTED_CUSTOMER_KEY,
        JSON.stringify(selectedCustomer)
      );
    } else {
      localStorage.removeItem(SELECTED_CUSTOMER_KEY);
    }
  }, [selectedCustomer]);

  // Calculate total price on change of the quantity input field of a product
  useEffect(() => {
    setTotalPrice(
      products.reduce((total, p) => {
        if (p.quantity && p.salePrice) {
          return total + Number(p.quantity) * Number(p.salePrice);
        }
        return total;
      }, 0)
    );
  }, [products]);

  useEffect(() => {
    if (!products || products.length === 0) {
      setProducts([{ productId: null, quantity: null, salePrice: null }]);
    }
  }, []);

  // handleCustomerSearchChange helps implement typeahead search for the customers search bar
  const handleCustomerSearchChange = async (e) => {
    const value = e.target.value;
    setCustomerQuery(value);
    setSelectedCustomer(null);
    if (value) {
      try {
        const data = await dispatch(searchCustomersSimple(value)).unwrap();
        setCustomerOptions(data);
      } catch (error) {
        console.error("Failed to search customers", error);
        setCustomerOptions([]);
      }
    } else {
      setCustomerOptions([]);
    }
  };

  // handleProductSearchChange helps implement typeahead search for the products search bar.
  // It queries the database and returns products related to the query and only returns products which have a stock
  // greater than 0
  const handleProductSearchChange = async (e, idx) => {
    const value = e.target.value;

    const updatedQueries = [...productQueries];
    updatedQueries[idx] = value;
    setProductQueries(updatedQueries);

    const updatedProducts = [...products];
    updatedProducts[idx].product = value;
    setProducts(updatedProducts);

    if (value) {
      try {
        const data = await dispatch(searchProductsSimple(value)).unwrap();
        const filteredData = data.filter((product) => product.stock > 0);
        setProductOptions((prev) => ({
          ...prev,
          [idx]: filteredData,
        }));
      } catch (error) {
        console.error("Failed to search products", error);
        setProductOptions((prev) => ({
          ...prev,
          [idx]: [],
        }));
      }
    } else {
      setProductOptions((prev) => ({
        ...prev,
        [idx]: [],
      }));
    }
  };

  // handleOrderSubmit gathers all the orderData from various variables throughout the file and sends it to the backend
  // using createOrder thunk. This function also updates each product's stock that was ordered depending on the quantity 
  // of the product that was ordered. After sending the information, the entire form is reset for its next use.
  const handleOrderSubmit = async () => {
    if (!selectedCustomer) {
      console.error("No customer selected");
      return;
    }

    const validProducts = products.filter(
      (p) => p.productId && p.quantity && p.salePrice
    );

    if (validProducts.length === 0) {
      console.error("No valid products added");
      return;
    }

    setSubmitting(true);

    const orderData = {
      orderId: Date.now(),
      customerId: selectedCustomer.id,
      userId: 1,
      productItems: validProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        salePrice: p.salePrice,
      })),
      totalPrice,
      createdAt: new Date().toDateString(),
    };

    if (orderData.totalPrice <= 0) {
      alert("Total price must be greater than zero.");
      setSubmitting(false);
      return;
    }

    try {
      await dispatch(createOrder(orderData));
      for (const item of validProducts) {
        try {
          const productRes = await dispatch(
            fetchProductById(item.productId)
          ).unwrap();

          const newStock = productRes.stock - item.quantity;
          if (newStock < 0) {
            console.warn(
              `Stock would be negative for product ${item.productId}`
            );
            continue;
          }

          await dispatch(
            updateProductStock({ id: item.productId, stock: newStock })
          );
        } catch (err) {
          console.error(
            `Failed to update stock for product ${item.productId}`,
            err
          );
        }
      }
      setCustomerQuery("");
      setCustomerOptions([]);
      setSelectedCustomer(null);
      setProducts([{ productId: null, quantity: null, salePrice: null }]);
      setProductQueries([""]);
      setProductOptions({});
      setTotalPrice(0);
      localStorage.removeItem(PRODUCTS_KEY);
      localStorage.removeItem(PRODUCT_QUERIES_KEY);
      localStorage.removeItem(CUSTOMER_QUERY_KEY);
      localStorage.removeItem(SELECTED_CUSTOMER_KEY);
      navigate("/orders");
    } catch (error) {
      console.error("Failed to create order", error);
    } finally {
      setSubmitting(false);
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
            onChange={handleCustomerSearchChange}
            style={{ width: 675 }}
          />
          {customerQuery &&
            !selectedCustomer &&
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
        <Button
          color="primary"
          onClick={() => {
            setProducts([
              ...products,
              { productId: null, quantity: null, salePrice: null },
            ]);
            setProductQueries([...productQueries, ""]);
          }}
          style={{ height: 42 }}
        >
          Add Product
        </Button>
        {products.map((product, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 8,
              position: "relative",
            }}
          >
            <div style={{ position: "relative" }}>
              <InputField
                id={`productSearch-${idx}`}
                placeholder="Search Products by Name"
                value={productQueries[idx] || ""}
                onChange={(e) => handleProductSearchChange(e, idx)}
                style={{ width: 250 }}
                autoComplete="off"
              />
              {productQueries[idx] &&
                Array.isArray(productOptions[idx]) &&
                productOptions[idx].length > 0 && (
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
                    {productOptions[idx].map((option, pidx) => (
                      <div
                        key={option.id || pidx}
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          borderBottom: "1px solid #eee",
                        }}
                        onMouseDown={() => {
                          const updatedProducts = [...products];
                          updatedProducts[idx] = {
                            ...updatedProducts[idx],
                            productId: option.id,
                            quantity: updatedProducts[idx].quantity ?? 0,
                            salePrice: option.price,
                          };
                          setProducts(updatedProducts);

                          const updatedQueries = [...productQueries];
                          updatedQueries[idx] = option.name || "";
                          setProductQueries(updatedQueries);

                          setProductOptions((prev) => ({
                            ...prev,
                            [idx]: [],
                          }));
                        }}
                      >
                        {option.name}{" "}
                        <span style={{ color: "#888" }}>
                          ($
                          {option.price?.toFixed
                            ? option.price.toFixed(2)
                            : option.price}
                          )
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <InputField
              id={`quantity-${idx}`}
              placeholder="Quantity"
              type="number"
              value={product.quantity ?? ""}
              onChange={async (e) => {
                const value = Number(e.target.value);
                const clonedProduct = { ...products[idx], quantity: value };
                const updated = [...products];
                updated[idx] = clonedProduct;
                setProducts(updated);

                try {
                  const productRes = await dispatch(
                    fetchProductById(clonedProduct.productId)
                  ).unwrap();
                  //If quantity selected exceeds stock of the product, limit the quantity to the maximum stock available.
                  if (productRes && clonedProduct.quantity > productRes.stock) {
                    alert(
                      "Quantity exceeds available stock, choose a lower quantity or choose another item."
                    );
                    clonedProduct.quantity = productRes.stock;
                    updated[idx] = clonedProduct;
                    setProducts([...updated]);
                  }
                } catch (err) {
                  console.error("Failed to validate stock", err);
                }
              }}
              style={{ width: 100 }}
            />
            <Button
              color="secondary"
              onClick={() => {
                if (products.length === 1) {
                  setProducts([
                    { productId: null, quantity: null, salePrice: null },
                  ]);
                  setProductQueries([""]);
                } else {
                  const updatedProducts = [...products];
                  const updatedQueries = [...productQueries];
                  updatedProducts.splice(idx, 1);
                  updatedQueries.splice(idx, 1);
                  setProducts(updatedProducts);
                  setProductQueries(updatedQueries);
                }
              }}
              disabled={
                products.length === 1 &&
                !(product.productId || product.quantity || product.salePrice)
              }
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
      <Button color="primary" onClick={handleOrderSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Order"}
      </Button>
    </div>
  );
};

export default OrderForm;
