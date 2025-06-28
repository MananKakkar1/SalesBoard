//All frontend API calls for customers are loaded in this file.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/create-customer", customerData);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to create customer"
      );
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, customerData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/customers/${id}`, customerData);
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to update customer"
      );
    }
  }
);

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { page = 1, pageSize = 20, search = "" } = params;
      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page);
      if (pageSize) queryParams.append("pageSize", pageSize);
      if (search) queryParams.append("search", search);

      const response = await api.get(
        `/api/customers?${queryParams.toString()}`
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch customers"
      );
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  "customers/deleteCustomer",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/customers/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to delete customer"
      );
    }
  }
);

export const searchCustomers = createAsyncThunk(
  "customers/searchCustomers",
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
        `/api/customers/search?${queryParams.toString()}`
      );
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to search customers"
      );
    }
  }
);

export const getTotalCustomers = createAsyncThunk(
  "customers/getTotalCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/customers/total-customers");
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch total customers"
      );
    }
  }
);

export const getRecentCustomers = createAsyncThunk(
  "customers/getRecentCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/api/customers/recent");
      return response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch recent customers"
      );
    }
  }
);

export const searchCustomersSimple = createAsyncThunk(
  "customers/searchCustomersSimple",
  async (query, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("q", query);

      const response = await api.get(
        `/api/customers/search-simple?${queryParams.toString()}`
      );
      return response.data.data || response.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to search customers"
      );
    }
  }
);

const customerSlice = createSlice({
  name: "customers",
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
      .addCase(fetchCustomers.fulfilled, (state, action) => {
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

export default customerSlice.reducer;
