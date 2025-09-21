//All frontend API calls for products are loaded in this file.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const createProduct = createAsyncThunk(
  "products/createProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/create-product", productData);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to create product"
      );
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/products/${id}`, productData);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to update product"
      );
    }
  }
);

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, pageSize = 20, search = "" } = params;
      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page);
      if (pageSize) queryParams.append("pageSize", pageSize);
      if (search) queryParams.append("search", search);

      const response = await api.get(`/api/products?${queryParams.toString()}`);
      return response.data; // { data: [{ id, name, price, totalStock, warehousesCount }], pagination: {...} }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch products"
      );
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/products/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to delete product"
      );
    }
  }
);

export const searchProducts = createAsyncThunk(
  "products/searchProducts",
  async (params, { rejectWithValue }) => {
    try {
      const {
        query = "",
        page = 1,
        pageSize = 20,
      } = typeof params === "string" ? { query: params } : params;
      const queryParams = new URLSearchParams();
      queryParams.append("q", query);
      queryParams.append("page", page);
      queryParams.append("pageSize", pageSize);

      const response = await api.get(
        `/api/products/search?${queryParams.toString()}`
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to search products"
      );
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data; // should include { id, name, price, totalStock, warehousesCount }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch product"
      );
    }
  }
);

export const getTotalProducts = createAsyncThunk(
  "products/getTotalProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/products/total-products");
      return response.data; // { totalProducts }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch total products"
      );
    }
  }
);

export const getRecentProducts = createAsyncThunk(
  "products/getRecentProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/products/recent");
      return response.data; // array
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch recent products"
      );
    }
  }
);

export const updateProductStock = createAsyncThunk(
  "products/updateProductStock",
  async ({ id, stock }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/products/${id}/stock`, { stock });
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to update product stock"
      );
    }
  }
);

export const searchProductsSimple = createAsyncThunk(
  "products/searchProductsSimple",
  async (query, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("q", query);

      const response = await api.get(
        `/api/products/search-simple?${queryParams.toString()}`
      );
      return response.data.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to search products"
      );
    }
  }
);

/** Low-stock list (dashboard uses unwrap, but we also store it optionally) */
export const getLowStock = createAsyncThunk(
  "products/getLowStock",
  async (threshold = 5, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/products/low-stock?threshold=${threshold}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch low stock"
      );
    }
  }
);

/** NEW: fetch per-warehouse inventory for a product */
export const fetchProductInventory = createAsyncThunk(
  "products/fetchProductInventory",
  async (productId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/products/${productId}/inventory`);
      // rows: [{ warehouse_id, warehouse_name, qty }]
      return { productId, rows: Array.isArray(res.data) ? res.data : [] };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to load product inventory"
      );
    }
  }
);

/** NEW: transfer product qty between warehouses (or to/from 0) */
export const transferProductInventory = createAsyncThunk(
  "products/transferProductInventory",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      await api.post(`/api/warehouses/transfer`, {
        product_id: Number(payload.product_id),
        from_warehouse_id: Number(payload.from_warehouse_id) || 0,
        to_warehouse_id: Number(payload.to_warehouse_id) || 0,
        qty: Number(payload.qty) || 0,
      });
      // refresh after transfer
      await dispatch(fetchProductInventory(payload.product_id)).unwrap();
      return true;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Transfer failed"
      );
    }
  }
);

const productSlice = createSlice({
  name: "products",
  initialState: {
    list: [],
    singleProduct: null,
    pagination: {
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    status: "idle",
    error: null,

    // NEW state:
    lowStock: [],
    inventoryByProduct: {}, // { [productId]: [{warehouse_id, warehouse_name, qty}] }
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (
          action.payload &&
          action.payload.data &&
          action.payload.pagination
        ) {
          state.list = action.payload.data;
          state.pagination = action.payload.pagination;
        } else if (Array.isArray(action.payload)) {
          state.list = action.payload;
          state.pagination = {
            page: 1,
            pageSize: action.payload.length,
            totalCount: action.payload.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          };
        } else {
          state.list = [];
          state.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          };
        }
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        // payload may include totalStock & warehousesCount (from updated backend)
        state.singleProduct = action.payload;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
        if (state.singleProduct?.id === action.payload.id) {
          state.singleProduct = action.payload;
        }
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        if (
          action.payload &&
          action.payload.data &&
          action.payload.pagination
        ) {
          state.list = action.payload.data;
          state.pagination = action.payload.pagination;
        } else if (Array.isArray(action.payload)) {
          state.list = action.payload;
          state.pagination = {
            page: 1,
            pageSize: action.payload.length,
            totalCount: action.payload.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          };
        } else {
          state.list = [];
          state.pagination = {
            page: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          };
        }
      })

      // --- NEW: low stock (optional state) ---
      .addCase(getLowStock.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(getLowStock.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        s.lowStock = Array.isArray(payload) ? payload : [];
      })
      .addCase(getLowStock.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // --- NEW: inventory per product ---
      .addCase(fetchProductInventory.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchProductInventory.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        const { productId, rows } = payload || {};
        if (productId != null) s.inventoryByProduct[productId] = Array.isArray(rows) ? rows : [];
      })
      .addCase(fetchProductInventory.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // --- NEW: transfer -> nothing to store directly; inventory is refreshed by the thunk ---
      .addCase(transferProductInventory.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(transferProductInventory.fulfilled, (s) => { s.status = "succeeded"; })
      .addCase(transferProductInventory.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; });
  },
});

export default productSlice.reducer;
