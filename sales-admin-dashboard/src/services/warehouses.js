const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

export async function listWarehouses({ search = "", page = 1, pageSize = 20 } = {}) {
  const u = new URL(`${BASE}/warehouses`);
  if (search) u.searchParams.set("search", search);
  u.searchParams.set("page", page);
  u.searchParams.set("pageSize", pageSize);
  const r = await fetch(u);
  if (!r.ok) throw new Error("Failed to load warehouses");
  return r.json(); // { data, pagination }
}

export async function getWarehouse(id) {
  const r = await fetch(`${BASE}/warehouses/${id}`);
  if (!r.ok) throw new Error("Warehouse not found");
  return r.json();
}

export async function createWarehouse(body) {
  const r = await fetch(`${BASE}/warehouses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Create warehouse failed");
  return r.json();
}

export async function updateWarehouse(id, body) {
  const r = await fetch(`${BASE}/warehouses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("Update warehouse failed");
  return r.json();
}

export async function deleteWarehouse(id) {
  const r = await fetch(`${BASE}/warehouses/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Delete warehouse failed");
}

export async function getWarehouseInventory(id) {
  const r = await fetch(`${BASE}/warehouses/${id}/inventory`);
  if (!r.ok) throw new Error("Failed to load inventory");
  return r.json(); // [{ product_id, name, qty }]
}

export async function upsertWarehouseInventory(id, items) {
  const r = await fetch(`${BASE}/warehouses/${id}/inventory`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!r.ok) throw new Error("Inventory update failed");
}

export async function getTotal() {
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";
  const r = await fetch(`${BASE}/warehouses/total`);
  if (!r.ok) throw new Error("Failed to load total warehouses");
  return r.json();
}

export async function getRecent() {
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";
  const r = await fetch(`${BASE}/warehouses/recent`);
  if (!r.ok) throw new Error("Failed to load recent warehouses");
  return r.json();
}

export async function transferInventory({ product_id, from_warehouse_id, to_warehouse_id, qty }) {
  const res = await fetch(`http://localhost:8080/api/warehouses/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ product_id, from_warehouse_id, to_warehouse_id, qty: Number(qty) }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Transfer failed");
  }
  return res.json(); // backend returns {ok:true, moved: N} per our earlier handler
}