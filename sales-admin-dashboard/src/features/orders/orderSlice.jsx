import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/create-order', orderData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create order');
    }
  }
);

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/orders');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch order');
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/orders/${orderId}`);
      return orderId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to delete order');
    }
  }
);

export const searchOrders = createAsyncThunk(
  'orders/searchOrders',
  async (query, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/orders/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to search orders');
    }
  }
);

const orderSlice = createSlice({
  name: "orders",
  initialState: {
    list: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default orderSlice.reducer;
