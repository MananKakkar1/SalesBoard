import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch, useSelector } from "react-redux";
import api from "../../services/api";
import {
  createProduct,
  updateProduct,
  fetchProductById as fetchProductByIdThunk,
  fetchProductInventory,
  transferProductInventory,
} from "../../features/products/productSlice";

const initialState = {
  name: "",
  price: "",
  stock: "", // used only on CREATE
  description: "",
};

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [warehouses, setWarehouses] = useState([]); // for transfer select
  const [legacyStock, setLegacyStock] = useState(0); // <-- display only on edit

  // per-product inventory (table)
  const inventoryRows =
    useSelector((s) => s.products.inventoryByProduct?.[id || ""]) || [];

  useEffect(() => {
    const run = async () => {
      if (isEdit) {
        // pull full product (includes .stock)
        const product = await dispatch(fetchProductByIdThunk(id)).unwrap();
        if (product) {
          setForm({
            name: product.name ?? "",
            price: product.price ?? "",
            stock: "", // ignored on edit
            description: product.description ?? "",
          });
          setLegacyStock(Number(product.stock ?? 0));
        }
        // load per-warehouse inventory
        await dispatch(fetchProductInventory(id));
      }
      // load warehouses for transfer dropdowns
      try {
        const res = await api.get("/api/warehouses/search-simple");
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setWarehouses(list);
      } catch (e) {
        console.warn("Failed to load warehouses", e);
      }
    };
    run();
  }, [id, isEdit, dispatch]);

  // Validation
  const validate = () => {
    const priceRegex = /^\d+(\.\d+)?$/;
    const stockRegex = /^\d+$/;
    const errs = {};

    if (!form.name || form.name.trim() === "") {
      errs.name = "Name is required";
    }
    if (!form.price || String(form.price).trim() === "") {
      errs.price = "Price is required";
    } else if (!priceRegex.test(String(form.price))) {
      errs.price = "Price must be a valid number (whole or decimal)";
    } else if (parseFloat(form.price) <= 0) {
      errs.price = "Price must be greater than 0";
    }

    // Only validate stock on CREATE
    if (!isEdit) {
      if (!form.stock || String(form.stock).trim() === "") {
        errs.stock = "Stock is required";
      } else if (!stockRegex.test(String(form.stock))) {
        errs.stock = "Stock must be a valid integer";
      } else if (parseInt(form.stock, 10) < 0) {
        errs.stock = "Stock cannot be negative";
      }
    }

    return errs;
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      try {
        if (isEdit) {
          const payload = {
            name: form.name,
            price: Number(form.price),
          };
          await dispatch(updateProduct({ id, productData: payload })).unwrap();
          await dispatch(fetchProductInventory(id)); // refresh table
        } else {
          // CREATE: include initial stock (legacy column)
          const payload = {
            name: form.name,
            price: Number(form.price),
            stock: Number(form.stock || 0),
          };
          await dispatch(createProduct(payload)).unwrap();
        }
        navigate("/products");
      } catch (error) {
        alert(error?.message || "Failed to save product.");
      }
    }
  };

  // --- Transfer UI state (edit only) ---
  const [fromWh, setFromWh] = useState(""); // must choose a real warehouse
  const [toWh, setToWh] = useState("");
  const [qty, setQty] = useState("");

  const doTransfer = async (e) => {
    e.preventDefault();
    if (!id) return;

    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) {
      alert("Quantity must be > 0");
      return;
    }
    if (!fromWh || !toWh) {
      alert("Please select both From and To warehouses.");
      return;
    }
    if (Number(fromWh) === Number(toWh)) {
      alert("From and To must be different.");
      return;
    }

    try {
      await dispatch(
        transferProductInventory({
          product_id: Number(id),
          from_warehouse_id: Number(fromWh),
          to_warehouse_id: Number(toWh),
          qty: qtyNum,
        })
      ).unwrap();
      setQty("");
      // thunk refreshes product inventory
    } catch (err) {
      alert(err?.message || "Transfer failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2>{isEdit ? "Edit Product" : "Add New Product"}</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <InputField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
            type="text"
          />
          <InputField
            label="Price"
            name="price"
            value={form.price}
            onChange={handleChange}
            error={!!errors.price}
            helperText={errors.price}
            fullWidth
            required
            type="number"
          />

          {!isEdit && (
            <InputField
              label="Stock"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              error={!!errors.stock}
              helperText={errors.stock}
              fullWidth
              required
              type="number"
            />
          )}

          {isEdit && (
            <div style={{ marginTop: 12, fontSize: "0.95rem" }}>
              <strong>Stock:</strong> {legacyStock}
              <div style={{ color: "rgba(0,0,0,0.54)" }}>
                (This is the product’s global stock value.)
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <Button color="primary" type="submit">
              {isEdit ? "Update Product" : "Save Product"}
            </Button>
          </div>
        </form>

        {/* Per-warehouse inventory + transfer section (edit only) */}
        {isEdit && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Per-Warehouse Inventory</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Warehouse</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(inventoryRows) && inventoryRows.length > 0 ? (
                  inventoryRows.map((row) => (
                    <tr key={row.warehouse_id}>
                      <td style={{ padding: 8 }}>
                        {row.warehouse_name || `#${row.warehouse_id}`}
                      </td>
                      <td style={{ padding: 8 }}>{row.qty}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ padding: 8, textAlign: "center" }}>
                      No warehouse inventory yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <h3 style={{ margin: "24px 0 8px" }}>Transfer Stock</h3>
            <form
              onSubmit={doTransfer}
              style={{ display: "grid", gap: 12, maxWidth: 520 }}
            >
              <label>
                From
                <select
                  value={fromWh}
                  onChange={(e) => setFromWh(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 4 }}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                To
                <select
                  value={toWh}
                  onChange={(e) => setToWh(e.target.value)}
                  style={{ width: "100%", padding: 8, marginTop: 4 }}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <InputField
                label="Quantity"
                name="qty"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />

              <div>
                <Button color="primary" type="submit">
                  Transfer
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductForm;
