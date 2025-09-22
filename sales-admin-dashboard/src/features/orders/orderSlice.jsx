// All frontend API calls for orders are loaded in this file.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

const normalizeCreatePayload = (raw) => {
  const {
    orderId,
    customerId,
    userId,
    createdAt,
    totalPrice, // optional; backend recomputes
    productItems = [],
  } = raw || {};

  if (!customerId) throw new Error("Please select a customer.");
  if (!Array.isArray(productItems) || productItems.length === 0) {
    throw new Error("Add at least one product.");
  }

  const items = productItems.map((it, idx) => {
    const pid = Number(it.productId ?? it.productID ?? it.id);
    const qty = Number(it.quantity ?? it.qty);
    const sale = Number(
      it.salePrice ?? it.price ?? it.unitPrice ?? it.productPrice
    );
    const wh = Number(it.warehouseId ?? it.warehouseID ?? it.warehouse?.id);

    if (!pid || qty <= 0 || !Number.isFinite(sale) || !wh) {
      throw new Error(
        `Line ${idx + 1}: productId, quantity (>0), salePrice, and warehouseId are required.`
      );
    }
    return {
      productId: pid,
      quantity: qty,
      salePrice: sale,
      warehouseId: wh,
    };
  });

  return {
    orderId,
    customerId,
    userId,
    createdAt,
    totalPrice,
    productItems: items,
  };
};

export const createOrder = createAsyncThunk(
  "orders/createOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const payload = normalizeCreatePayload(orderData);
      const response = await api.post("/api/create-order", payload);
      const data =
        response.data && Object.keys(response.data).length > 0
          ? response.data
          : { orderId: payload.orderId };
      return data;
    } catch (err) {
      const msg =
        err?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create order";
      return rejectWithValue(msg);
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
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch orders"
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
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch order"
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
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to delete order"
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
      } = typeof params === "string" ? { query: params } : params || {};
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
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to search orders"
      );
    }
  }
);

// ---------- DASHBOARD STATS ----------
export const getTotalRevenue = createAsyncThunk(
  "orders/getTotalRevenue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/orders/total");
      const value =
        typeof res.data === "number"
          ? res.data
          : Number(res.data?.totalRevenue ?? 0);
      return value;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch total revenue"
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
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch total orders"
      );
    }
  }
);

export const getRecentOrders = createAsyncThunk(
  "orders/getRecentOrders",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/orders/recent");
      return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch recent orders"
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
    stats: {
      totalRevenue: 0,
      totalOrders: 0,
      recentOrders: [],
      status: "idle",
      error: null,
    },
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
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
      .addCase(createOrder.fulfilled, (state) => {
        // do not push partial order; let the page refetch after submit
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.error = action.payload || "Failed to create order";
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

      // ---------- DASHBOARD ----------
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
        state.stats.totalRevenue = 0;
      })

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

      .addCase(getRecentOrders.pending, (state) => {
        state.stats.status = "loading";
        state.stats.error = null;
      })
      .addCase(getRecentOrders.fulfilled, (state, action) => {
        state.stats.recentOrders = Array.isArray(action.payload)
          ? action.payload
          : [];
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

// ---------- SELECTORS ----------
export const selectOrdersState = (state) => state.orders;
export const selectTotalRevenue = (state) => state.orders?.stats?.totalRevenue ?? 0;
export const selectTotalOrders = (state) => state.orders?.stats?.totalOrders ?? 0;
export const selectRecentOrders = (state) =>
  Array.isArray(state.orders?.stats?.recentOrders)
    ? state.orders.stats.recentOrders
    : [];
export const selectStatsStatus = (state) => state.orders?.stats?.status ?? "idle";
export const selectStatsError = (state) => state.orders?.stats?.error ?? null;
