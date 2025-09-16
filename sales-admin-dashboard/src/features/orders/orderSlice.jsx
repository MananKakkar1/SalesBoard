// All frontend API calls for orders are loaded in this file.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const createOrder = createAsyncThunk(
  "orders/createOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/create-order", orderData);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to create order"
      );
    }
  }
);

export const fetchOrders = createAsyncThunk(
  "orders/fetchOrders",
  async (params, { rejectWithValue }) => {
    try {
      const { page = 1, pageSize = 20, search = "" } = params || {};
      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page);
      if (pageSize) queryParams.append("pageSize", pageSize);
      if (search) queryParams.append("search", search);

      const response = await api.get(`/api/orders?${queryParams.toString()}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch orders"
      );
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  "orders/fetchOrderById",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch order"
      );
    }
  }
);

export const deleteOrder = createAsyncThunk(
  "orders/deleteOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/orders/${orderId}`);
      return orderId;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete order"
      );
    }
  }
);

export const searchOrders = createAsyncThunk(
  "orders/searchOrders",
  async (params, { rejectWithValue }) => {
    try {
      const {
        query = "",
        page = 1,
        pageSize = 20,
      } = typeof params === "string" ? { query: params } : (params || {});
      const queryParams = new URLSearchParams();
      queryParams.append("q", query);
      queryParams.append("page", page);
      queryParams.append("pageSize", pageSize);

      const response = await api.get(
        `/api/orders/search?${queryParams.toString()}`
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to search orders"
      );
    }
  }
);

// ---------- DASHBOARD STATS THUNKS (normalized returns) ----------
export const getTotalRevenue = createAsyncThunk(
  "orders/getTotalRevenue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/orders/total");
      // Accept { totalRevenue } or a raw number; normalize to number and default to 0
      const value =
        typeof res.data === "number"
          ? res.data
          : Number(res.data?.totalRevenue ?? 0);
      return value;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch total revenue"
      );
    }
  }
);

export const getTotalOrders = createAsyncThunk(
  "orders/getTotalOrders",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/orders/total-orders");
      const value =
        typeof res.data === "number"
          ? res.data
          : Number(res.data?.totalOrders ?? 0);
      return value;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch total orders"
      );
    }
  }
);

export const getRecentOrders = createAsyncThunk(
  "orders/getRecentOrders",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/orders/recent");
      // Accept either raw array or { data: [...] }
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch recent orders"
      );
    }
  }
);

// ---------- SLICE ----------
const orderSlice = createSlice({
  name: "orders",
  initialState: {
    list: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    // Dashboard stats live here
    stats: {
      totalRevenue: 0,
      totalOrders: 0,
      recentOrders: [],
      status: "idle", // loading state for stats
      error: null,
    },
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ---------- ORDERS LIST ----------
      .addCase(fetchOrders.fulfilled, (state, action) => {
        if (action.payload?.data && action.payload?.pagination) {
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
      .addCase(createOrder.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(searchOrders.fulfilled, (state, action) => {
        if (action.payload?.data && action.payload?.pagination) {
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

      // ---------- DASHBOARD: TOTAL REVENUE ----------
      .addCase(getTotalRevenue.pending, (state) => {
        state.stats.status = "loading";
        state.stats.error = null;
      })
      .addCase(getTotalRevenue.fulfilled, (state, action) => {
        state.stats.totalRevenue = Number(action.payload ?? 0);
        state.stats.status = "succeeded";
      })
      .addCase(getTotalRevenue.rejected, (state, action) => {
        state.stats.status = "failed";
        state.stats.error = action.payload || "Failed to fetch total revenue";
        state.stats.totalRevenue = 0; // safe fallback
      })

      // ---------- DASHBOARD: TOTAL ORDERS ----------
      .addCase(getTotalOrders.pending, (state) => {
        state.stats.status = "loading";
        state.stats.error = null;
      })
      .addCase(getTotalOrders.fulfilled, (state, action) => {
        state.stats.totalOrders = Number(action.payload ?? 0);
        state.stats.status = "succeeded";
      })
      .addCase(getTotalOrders.rejected, (state, action) => {
        state.stats.status = "failed";
        state.stats.error = action.payload || "Failed to fetch total orders";
        state.stats.totalOrders = 0;
      })

      // ---------- DASHBOARD: RECENT ORDERS ----------
      .addCase(getRecentOrders.pending, (state) => {
        state.stats.status = "loading";
        state.stats.error = null;
      })
      .addCase(getRecentOrders.fulfilled, (state, action) => {
        state.stats.recentOrders = Array.isArray(action.payload) ? action.payload : [];
        state.stats.status = "succeeded";
      })
      .addCase(getRecentOrders.rejected, (state, action) => {
        state.stats.status = "failed";
        state.stats.error = action.payload || "Failed to fetch recent orders";
        state.stats.recentOrders = [];
      });
  },
});

export default orderSlice.reducer;

// ---------- SELECTORS (use these in your components) ----------
export const selectOrdersState = (state) => state.orders;

export const selectTotalRevenue = (state) =>
  state.orders?.stats?.totalRevenue ?? 0;

export const selectTotalOrders = (state) =>
  state.orders?.stats?.totalOrders ?? 0;

export const selectRecentOrders = (state) =>
  Array.isArray(state.orders?.stats?.recentOrders)
    ? state.orders.stats.recentOrders
    : [];

export const selectStatsStatus = (state) =>
  state.orders?.stats?.status ?? "idle";

export const selectStatsError = (state) =>
  state.orders?.stats?.error ?? null;
