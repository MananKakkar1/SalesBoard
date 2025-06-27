import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/create-customer', customerData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create customer');
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/customers/${id}`, customerData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update customer');
    }
  }
);

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/customers');
      return response.data; 
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch customers');
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer', 
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/customers/${id}`);
      return id; 
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to delete customer');
    }
  }
)

export const searchCustomers = createAsyncThunk(
  'customers/searchCustomers',
  async (query, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/customers/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to search customers');
    }
  }
);

export const getTotalCustomers = createAsyncThunk(
  'customers/getTotalCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/customers/total-customers');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch total customers');
    }
  }
);

export const getRecentCustomers = createAsyncThunk(
  'customers/getRecentCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/customers/recent');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch recent customers');
    }
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState: {
    list: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.list.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c.id !== action.payload);
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.list = action.payload;
      });
  },
});

export default customerSlice.reducer;