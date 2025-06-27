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
  async (params, { rejectWithValue }) => {
    try {
      const { page = 1, pageSize = 20, search = "" } = params;
      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page);
      if (pageSize) queryParams.append("pageSize", pageSize);
      if (search) queryParams.append("search", search);

      const response = await api.get(`/api/products?${queryParams.toString()}`);
      return response.data;
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
      return response.data;
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
      return response.data;
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
      return response.data;
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
        state.singleProduct = action.payload;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.list[index] = action.payload;
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
      });
  },
});

export default productSlice.reducer;
