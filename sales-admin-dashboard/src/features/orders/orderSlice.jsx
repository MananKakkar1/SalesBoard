//All frontend API calls for orders are loaded in this file.
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
        err.response?.data?.error || "Failed to create order"
      );
    }
  }
);

export const fetchOrders = createAsyncThunk(
  "orders/fetchOrders",
  async (params, { rejectWithValue }) => {
    try {
      const { page = 1, pageSize = 20, search = "" } = params;
      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page);
      if (pageSize) queryParams.append("pageSize", pageSize);
      if (search) queryParams.append("search", search);

      const response = await api.get(`/api/orders?${queryParams.toString()}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch orders"
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
        err.response?.data?.error || "Failed to fetch order"
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
        err.response?.data?.error || "Failed to delete order"
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
      } = typeof params === "string" ? { query: params } : params;
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
        err.response?.data?.error || "Failed to search orders"
      );
    }
  }
);

export const getTotalRevenue = createAsyncThunk(
  "orders/getTotalRevenue",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/orders/total");
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch total revenue"
      );
    }
  }
);

export const getTotalOrders = createAsyncThunk(
  "orders/getTotalOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/orders/total-orders");
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch total orders"
      );
    }
  }
);

export const getRecentOrders = createAsyncThunk(
  "orders/getRecentOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/orders/recent");
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch recent orders"
      );
    }
  }
);

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
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.fulfilled, (state, action) => {
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
      .addCase(createOrder.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(searchOrders.fulfilled, (state, action) => {
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
      });
  },
});

export default orderSlice.reducer;