// OrderForm.jsx
// New Order form: product + inline warehouse select; no editable unit price.
// Warehouses load per product and the order uses those to fulfill & deplete stock.

import React, { useState, useEffect } from "react";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  fetchProductById,
  fetchProductInventory, // per-warehouse inventory for a product (may not return payload)
  searchProductsSimple, // simple typeahead
} from "../../features/products/productSlice";
import { searchCustomersSimple } from "../../features/customers/customerSlice";
import { createOrder } from "../../features/orders/orderSlice";

// ----- LocalStorage keys -----
const PRODUCTS_KEY = "orderFormProducts";
const PRODUCT_QUERIES_KEY = "orderFormProductQueries";
const CUSTOMER_QUERY_KEY = "orderFormCustomerQuery";
const SELECTED_CUSTOMER_KEY = "orderFormSelectedCustomer";

// One blank line
const emptyLine = {
  productId: null,
  productName: "",
  quantity: 1,
  unitPrice: 0, // derived from product; not editable
  warehouseId: null,
};

export default function OrderForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ----- Customer selection -----
  const [customerQuery, setCustomerQuery] = useState(
    () => localStorage.getItem(CUSTOMER_QUERY_KEY) || ""
  );
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(() => {
    const saved = localStorage.getItem(SELECTED_CUSTOMER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // ----- Lines -----
  const [lines, setLines] = useState(() => {
    const saved = localStorage.getItem(PRODUCTS_KEY);
    return saved ? JSON.parse(saved) : [{ ...emptyLine }];
  });

  // Visible text typed in the product search box per line
  const [productQueries, setProductQueries] = useState(() => {
    const saved = localStorage.getItem(PRODUCT_QUERIES_KEY);
    return saved ? JSON.parse(saved) : lines.map(() => "");
  });

  // Options state
  const [productOptions, setProductOptions] = useState({}); // idx -> [{id, name, price}]
  const [warehouseOptions, setWarehouseOptions] = useState({}); // idx -> [{warehouse_id, warehouse_name, qty}]
  const [warehouseLoading, setWarehouseLoading] = useState({}); // idx -> bool

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ----- Persistence -----
  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    localStorage.setItem(PRODUCT_QUERIES_KEY, JSON.stringify(productQueries));
  }, [productQueries]);

  useEffect(() => {
    localStorage.setItem(CUSTOMER_QUERY_KEY, customerQuery);
  }, [customerQuery]);

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

  // Make sure at least one line exists on mount
  useEffect(() => {
    if (!lines || lines.length === 0) {
      setLines([{ ...emptyLine }]);
      setProductQueries([""]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Total from qty * unitPrice (unitPrice comes from product; UI is removed)
  const totalPrice = lines.reduce((sum, l) => {
    const qty = Number(l.quantity || 0);
    const price = Number(l.unitPrice || 0);
    return sum + qty * price;
  }, 0);

  // ----- Customer typeahead -----
  const handleCustomerSearchChange = async (e) => {
    const value = e.target.value;
    setFormError("");
    setCustomerQuery(value);
    setSelectedCustomer(null);

    if (!value) {
      setCustomerOptions([]);
      return;
    }

    try {
      const data = await dispatch(searchCustomersSimple(value)).unwrap();
      setCustomerOptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to search customers", err);
      setCustomerOptions([]);
    }
  };

  // ----- Load warehouses for a product (robust: thunk OR direct API) -----
  const loadWarehousesForLine = async (idx, productId) => {
    setWarehouseLoading((prev) => ({ ...prev, [idx]: true }));
    try {
      // 1) try thunk return
      let res;
      try {
        res = await dispatch(fetchProductInventory(productId)).unwrap();
      } catch (_) {
        // ignore; some thunk impls don't return payload
      }

      // 2) if thunk didn’t return usable data, hit API directly
      let rows = (Array.isArray(res) && res) || res?.items || res?.data || [];

      if (rows.length === 0) {
        try {
          const direct = await api.get(`/api/products/${productId}/inventory`);
          rows = Array.isArray(direct.data?.data)
            ? direct.data.data
            : Array.isArray(direct.data)
            ? direct.data
            : [];
        } catch (e) {
          // final fallback: empty
          rows = [];
        }
      }

      // Normalize + keep only warehouses with stock > 0
      const withStock = rows
        .map((r) => ({
          warehouse_id: r.warehouse_id ?? r.warehouseId ?? r.id,
          warehouse_name:
            r.warehouse_name ??
            r.name ??
            `#${r.warehouse_id ?? r.warehouseId ?? r.id}`,
          qty: Number(r.qty ?? r.quantity ?? 0),
        }))
        .filter((r) => r.warehouse_id && r.qty > 0)
        .sort((a, b) => b.qty - a.qty);

      setWarehouseOptions((prev) => ({ ...prev, [idx]: withStock }));

      // Admin decides which warehouse—do NOT auto-select
      setLines((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], warehouseId: null };
        return next;
      });
    } catch (e) {
      console.warn("Failed to load per-warehouse inventory for", productId, e);
      setWarehouseOptions((prev) => ({ ...prev, [idx]: [] }));
      setLines((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], warehouseId: null };
        return next;
      });
    } finally {
      setWarehouseLoading((prev) => ({ ...prev, [idx]: false }));
    }
  };

  // ----- Product typeahead -----
  const handleProductSearchChange = async (e, idx) => {
    const value = e.target.value;
    setFormError("");

    setProductQueries((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });

    if (!value) {
      setProductOptions((prev) => ({ ...prev, [idx]: [] }));
      return;
    }

    try {
      const data = await dispatch(searchProductsSimple(value)).unwrap();
      const list = (Array.isArray(data) ? data : data?.data || []).filter(
        (p) => Number(p.totalStock ?? p.stock ?? 0) > 0
      );
      setProductOptions((prev) => ({ ...prev, [idx]: list }));
    } catch (error) {
      console.error("Failed to search products", error);
      setProductOptions((prev) => ({ ...prev, [idx]: [] }));
    }
  };

  // When a product option is clicked
  const selectProductForLine = async (idx, option) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        productId: option.id,
        productName: option.name || "",
        unitPrice: Number(option.price ?? 0), // internal only
        quantity: Number(next[idx].quantity || 1),
        warehouseId: null, // admin will choose
      };
      return next;
    });

    setProductQueries((prev) => {
      const next = [...prev];
      next[idx] = option.name || "";
      return next;
    });

    setProductOptions((prev) => ({ ...prev, [idx]: [] }));

    // Load warehouses (no auto-select; admin chooses)
    await loadWarehousesForLine(idx, option.id);
  };

  // ----- Qty change -----
  const handleQtyChange = (idx, raw) => {
    const value = Math.max(0, Number(raw || 0));
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: value };
      return next;
    });

    // If there is a selected warehouse, clamp to that warehouse's qty
    const wid = Number(lines[idx]?.warehouseId || 0);
    const opts = warehouseOptions[idx] || [];
    if (wid && Array.isArray(opts)) {
      const row = opts.find((r) => Number(r.warehouse_id) === wid);
      if (row && value > Number(row.qty)) {
        setLines((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: Number(row.qty) };
          return next;
        });
        alert(
          `Quantity exceeds available qty (${row.qty}) in the selected warehouse. Clamped to ${row.qty}.`
        );
      }
    }
  };

  // ----- Submit -----
  const handleOrderSubmit = async () => {
    setFormError("");

    if (!selectedCustomer?.id) {
      setFormError("Please select a customer.");
      return;
    }

    // Build items (salePrice from product; not editable)
    const items = lines
      .map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        salePrice: Number(l.unitPrice),
        warehouseId: Number(l.warehouseId),
      }))
      .filter(
        (it) =>
          it.productId &&
          it.quantity > 0 &&
          it.salePrice >= 0 &&
          it.warehouseId > 0
      );

    if (items.length === 0) {
      setFormError(
        "Add at least one valid product (select product, warehouse and quantity > 0)."
      );
      return;
    }

    const computedTotal = items.reduce(
      (sum, it) => sum + it.quantity * it.salePrice,
      0
    );
    if (computedTotal <= 0) {
      setFormError("Total price must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        createOrder({
          orderId: Date.now(),
          customerId: selectedCustomer.id,
          userId: 1,
          productItems: items, // includes warehouseId per line
          totalPrice: computedTotal,
          createdAt: new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        })
      ).unwrap();

      // Reset
      setCustomerQuery("");
      setCustomerOptions([]);
      setSelectedCustomer(null);
      setLines([{ ...emptyLine }]);
      setProductQueries([""]);
      setProductOptions({});
      setWarehouseOptions({});
      localStorage.removeItem(PRODUCTS_KEY);
      localStorage.removeItem(PRODUCT_QUERIES_KEY);
      localStorage.removeItem(CUSTOMER_QUERY_KEY);
      localStorage.removeItem(SELECTED_CUSTOMER_KEY);

      navigate("/orders");
    } catch (err) {
      setFormError(
        (typeof err === "string" && err) ||
          err?.message ||
          "Failed to create order"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>New Order</h1>

      {formError && (
        <div
          style={{
            background: "#fdecea",
            color: "#b71c1c",
            border: "1px solid #f5c6cb",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {formError}
        </div>
      )}

      {/* Customer */}
      <div>
        <h3 style={{ marginBottom: 4 }}>Select Customer</h3>
        <div style={{ position: "relative" }}>
          <InputField
            id="customerSearch"
            placeholder="Search Customers by Name or Email"
            fullWidth={false}
            value={customerQuery}
            onChange={handleCustomerSearchChange}
            style={{ width: 675, height: 42 }}
            autoComplete="off"
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
                  zIndex: 1000,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {customerOptions.map((option) => (
                  <div
                    key={option.id}
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

      {/* Products */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Products:</h3>
        <Button
          color="primary"
          onClick={() => {
            setLines((prev) => [...prev, { ...emptyLine }]);
            setProductQueries((prev) => [...prev, ""]);
          }}
          style={{ height: 42, marginBottom: 24, marginTop: 12 }}
        >
          Add Product
        </Button>

        {lines.map((line, idx) => {
          const pOpts = productOptions[idx] || [];
          const whOpts = warehouseOptions[idx] || [];
          const selectedWh = Number(line.warehouseId) || 0;

          return (
            <div
              key={idx}
              style={{
                display: "grid",
                // product | warehouse (inline) | qty | remove
                gridTemplateColumns: "360px 320px 110px 120px",
                gap: 12,
                marginBottom: 12,
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Product search */}
              <div style={{ position: "relative" }}>
                <InputField
                  id={`productSearch-${idx}`}
                  placeholder="Search Products by Name"
                  value={productQueries[idx] || ""}
                  onChange={(e) => handleProductSearchChange(e, idx)}
                  style={{ width: 360, height: 42 }}
                  autoComplete="off"
                />
                {productQueries[idx] && pOpts.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 42,
                      left: 0,
                      width: "100%",
                      background: "#fff",
                      border: "1px solid #ccc",
                      zIndex: 1000,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {pOpts.map((option) => (
                      <div
                        key={option.id}
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          borderBottom: "1px solid #eee",
                        }}
                        onMouseDown={() => selectProductForLine(idx, option)}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>{option.name}</span>
                          <span style={{ color: "#888" }}>
                            $
                            {option.price?.toFixed
                              ? option.price.toFixed(2)
                              : Number(option.price ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warehouse selector (INLINE, ENABLED) */}
              <div>
                <select
                  value={selectedWh ? String(selectedWh) : ""}
                  onChange={(e) => {
                    const wid = Number(e.target.value);
                    setLines((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], warehouseId: wid || null };
                      return next;
                    });
                    // clamp qty to the selected warehouse's available qty
                    const row = (warehouseOptions[idx] || []).find(
                      (w) => Number(w.warehouse_id) === wid
                    );
                    const lineQty = Number(lines[idx]?.quantity || 0);
                    if (row && lineQty > Number(row.qty)) {
                      setLines((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], quantity: Number(row.qty) };
                        return next;
                      });
                      alert(
                        `Quantity exceeds available qty (${row.qty}) in the selected warehouse. Clamped to ${row.qty}.`
                      );
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 62, // align vertically with InputField
                    padding: "0 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#fff",
                    marginLeft: 40,
                    marginBottom: 16,
                  }}
                >
                  <option value="">
                    {warehouseLoading[idx]
                      ? "Loading warehouses…"
                      : whOpts.length > 0
                      ? "Select warehouse…"
                      : "No stock in any warehouse"}
                  </option>
                  {whOpts.map((w) => (
                    <option key={w.warehouse_id} value={w.warehouse_id}>
                      {w.warehouse_name || `#${w.warehouse_id}`} (qty {w.qty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <InputField
                id={`quantity-${idx}`}
                placeholder="Qty"
                type="number"
                value={line.quantity ?? ""}
                onChange={(e) => handleQtyChange(idx, e.target.value)}
                style={{ width: 110, height: 42, marginLeft: 50 }}
              />

              {/* Remove line */}
              <Button
                color="secondary"
                onClick={() => {
                  if (lines.length === 1) {
                    setLines([{ ...emptyLine }]);
                    setProductQueries([""]);
                    setWarehouseOptions({});
                    setWarehouseLoading({});
                  } else {
                    setLines((prev) => {
                      const next = [...prev];
                      next.splice(idx, 1);
                      return next;
                    });
                    setProductQueries((prev) => {
                      const next = [...prev];
                      next.splice(idx, 1);
                      return next;
                    });
                    setWarehouseOptions((prev) => {
                      const next = { ...prev };
                      delete next[idx];
                      return next;
                    });
                    setWarehouseLoading((prev) => {
                      const next = { ...prev };
                      delete next[idx];
                      return next;
                    });
                  }
                }}
                disabled={
                  lines.length === 1 &&
                  !(line.productId || line.quantity || line.warehouseId)
                }
                style={{ width: 110,height: 42, marginLeft: 90 }}
              >
                Remove
              </Button>
            </div>
          );
        })}
      </div>

      {/* Total & submit */}
      <div style={{ marginTop: 12 }}>
        <h3>Total Price: ${Number(totalPrice || 0).toFixed(2)}</h3>
      </div>
      <Button color="primary" onClick={handleOrderSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Order"}
      </Button>
    </div>
  );
}
