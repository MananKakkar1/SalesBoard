import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card, { CardHeader, CardContent } from "../../components/common/Card";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";
import { useDispatch } from "react-redux";
import {
  fetchWarehouses,
  fetchInventory,
  upsertInventory,
} from "../../features/warehouses/warehouseSlice";
import { searchProductsSimple } from "../../services/products";

// mirrors product pattern: get warehouse from list
const fetchWarehouseById = async (id, dispatch) => {
  const res = await dispatch(fetchWarehouses()).unwrap(); // {data, pagination}
  const list = Array.isArray(res?.data) ? res.data : [];
  return list.find((w) => String(w.id) === String(id));
};

const WarehouseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [warehouse, setWarehouse] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Product UI state
  const [addOpen, setAddOpen] = useState(false);
  const [prodQuery, setProdQuery] = useState("");
  const [prodResults, setProdResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newQty, setNewQty] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [wh, invRes] = await Promise.all([
        fetchWarehouseById(id, dispatch),
        dispatch(fetchInventory(id)).unwrap(), // { warehouseId, items }
      ]);
      setWarehouse(wh || null);
      setInventory(invRes?.items || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // live product search for Add section
  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const res = await searchProductsSimple(prodQuery);
        if (!ignore) setProdResults(Array.isArray(res) ? res : []);
      } catch {
        if (!ignore) setProdResults([]);
      }
    };
    run();
    return () => { ignore = true; };
  }, [prodQuery]);

  const adjustQty = async (product_id, delta) => {
    try {
      const current = inventory.find((i) => i.product_id === product_id)?.qty || 0;
      const next = Math.max(0, current + delta);
      await dispatch(
        upsertInventory({ warehouseId: id, items: [{ product_id, qty: next }] })
      ).unwrap();
      // optimistic update
      setInventory((arr) =>
        arr.map((i) => (i.product_id === product_id ? { ...i, qty: next } : i))
      );
    } catch (e) {
      alert(e?.message || "Failed to update inventory");
    }
  };

  const handleAddToInventory = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return alert("Pick a product first.");
    const qtyNum = Number(newQty);
    if (Number.isNaN(qtyNum) || qtyNum < 0) return alert("Quantity must be ≥ 0");

    try {
      await dispatch(
        upsertInventory({
          warehouseId: id,
          items: [{ product_id: selectedProduct.id, qty: qtyNum }],
        })
      ).unwrap();

      // refresh visible inventory
      const invRes = await dispatch(fetchInventory(id)).unwrap();
      setInventory(invRes?.items || []);

      // reset form
      setSelectedProduct(null);
      setNewQty("");
      setProdQuery("");
      setAddOpen(false);
    } catch (e) {
      alert(e?.message || "Failed to add product");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><h2>Warehouse</h2></CardHeader>
        <CardContent>Loading…</CardContent>
      </Card>
    );
  }

  if (!warehouse) {
    return (
      <Card>
        <CardHeader><h2>Warehouse</h2></CardHeader>
        <CardContent>Not found.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2>Warehouse: {warehouse.name}</h2>
        <div>
          <Button color="primary" onClick={() => navigate(`/warehouses/${id}/edit`)}>Edit</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate("/warehouses")}>
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="ID" value={warehouse.id} />
          <Kpi label="Capacity" value={warehouse.capacity} />
          <Kpi label="Latitude" value={warehouse.latitude} />
          <Kpi label="Longitude" value={warehouse.longitude} />
        </div>

        {/* --- Add Product to Inventory --- */}
        <div style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Add Product to Inventory</h3>
            <Button onClick={() => setAddOpen((v) => !v)}>
              {addOpen ? "Close" : "Add"}
            </Button>
          </div>

          {addOpen && (
            <div style={{ padding: 12, borderTop: "1px solid #e5e7eb" }}>
              <form onSubmit={handleAddToInventory} noValidate>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px", gap: 12 }}>
                  {/* Product search */}
                  <div>
                    <InputField
                      label="Search product"
                      value={prodQuery}
                      onChange={(e) => setProdQuery(e.target.value)}
                      placeholder="Type name or leave empty to list all"
                      fullWidth
                    />
                    {/* results */}
                    <div style={{
                      marginTop: 8, maxHeight: 160, overflowY: "auto",
                      border: "1px solid #eee", borderRadius: 8
                    }}>
                      {prodResults.length === 0 ? (
                        <div style={{ padding: 8, color: "#6b7280" }}>No results</div>
                      ) : prodResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          style={{
                            padding: 8,
                            cursor: "pointer",
                            background: selectedProduct?.id === p.id ? "rgba(63,81,181,0.08)" : "transparent"
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            ID #{p.id} • Price ${p.price} • Stock {p.stock}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Qty */}
                  <div>
                    <InputField
                      label="Quantity"
                      type="number"
                      min={0}
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      required
                      fullWidth
                    />
                  </div>

                  {/* Submit */}
                  <div style={{ display: "flex", alignItems: "end" }}>
                    <Button color="primary" type="submit" disabled={!selectedProduct || newQty === ""}>
                      Add
                    </Button>
                  </div>
                </div>

                {selectedProduct && (
                  <div style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
                    Selected: <strong>{selectedProduct.name}</strong> (ID #{selectedProduct.id})
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* --- Inventory table --- */}
        <h3 style={{ marginBottom: 8 }}>Inventory</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Product ID</th>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Qty</th>
              <th style={{ textAlign: "left", padding: 8 }}>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 8 }}>
                  No inventory yet.
                </td>
              </tr>
            ) : (
              inventory.map((row) => (
                <tr key={row.product_id}>
                  <td style={{ padding: 8 }}>{row.product_id}</td>
                  <td style={{ padding: 8 }}>{row.name}</td>
                  <td style={{ padding: 8 }}>{row.qty}</td>
                  <td style={{ padding: 8 }}>
                    <Button size="small" onClick={() => adjustQty(row.product_id, -1)}>-1</Button>
                    <Button size="small" style={{ marginLeft: 8 }} onClick={() => adjustQty(row.product_id, +1)}>+1</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

const Kpi = ({ label, value }) => (
  <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
    <div style={{ color: "#6b7280", fontSize: 12 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600 }}>{String(value)}</div>
  </div>
);

export default WarehouseDetail;
