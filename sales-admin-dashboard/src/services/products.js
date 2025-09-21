const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

export async function searchProductsSimple(query = "") {
  const u = new URL(`${BASE}/products/search-simple`);
  if (query) u.searchParams.set("q", query);
  const r = await fetch(u);
  if (!r.ok) throw new Error("Failed to load products");
  return r.json(); // [{id, name, price, stock}, ...]
}

export async function getProductInventory(productId) {
  const res = await fetch(`http://localhost:8080/api/products/${productId}/inventory`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load product inventory");
  return res.json();
}