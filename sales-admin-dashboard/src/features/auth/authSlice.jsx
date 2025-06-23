import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";
import api from "../../services/api";

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/login", credentials);
      const { token, user } = response.data;

      localStorage.setItem("token", token);

      return {
        token,
        user,
      };
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data && error.response.data.error
          ? error.response.data.error
          : "Login failed"
      );
    }
  }
);

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
      return response.data; // Return the list of customers
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch customers');
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer', 
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/customers/${id}/delete`);
      return id; // Return the ID of the deleted customer
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

const initialState = {
  token: localStorage.getItem("token") || null,
  user: null,
  isAuthenticated: !!localStorage.getItem("token"),
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Login failed";
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
