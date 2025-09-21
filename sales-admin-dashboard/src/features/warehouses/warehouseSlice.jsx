import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  listWarehouses as apiList,
  getWarehouse as apiGet,
  createWarehouse as apiCreate,
  updateWarehouse as apiUpdate,
  deleteWarehouse as apiDelete,
  getWarehouseInventory as apiGetInv,
  upsertWarehouseInventory as apiUpsertInv,
  getTotal as apiGetTotal,
  getRecent as apiGetRecent,
} from "../../services/warehouses";

// -------- Thunks --------
export const fetchWarehouses = createAsyncThunk(
  "warehouses/fetchList",
  async ({ search = "", page = 1, pageSize = 20 } = {}, { rejectWithValue }) => {
    try { return await apiList({ search, page, pageSize }); }
    catch (e) { return rejectWithValue(e.message || "Failed to load warehouses"); }
  }
);

export const fetchWarehouse = createAsyncThunk(
  "warehouses/fetchOne",
  async (id, { rejectWithValue }) => {
    try { return await apiGet(id); }
    catch (e) { return rejectWithValue(e.message || "Warehouse not found"); }
  }
);

export const createWarehouse = createAsyncThunk(
  "warehouses/create",
  async (body, { rejectWithValue }) => {
    try { return await apiCreate(body); }
    catch (e) { return rejectWithValue(e.message || "Create failed"); }
  }
);

export const updateWarehouse = createAsyncThunk(
  "warehouses/update",
  async ({ id, body }, { rejectWithValue }) => {
    try { return await apiUpdate(id, body); }
    catch (e) { return rejectWithValue(e.message || "Update failed"); }
  }
);

export const deleteWarehouse = createAsyncThunk(
  "warehouses/delete",
  async (id, { rejectWithValue }) => {
    try { await apiDelete(id); return id; }
    catch (e) { return rejectWithValue(e.message || "Delete failed"); }
  }
);

// Inventory
export const fetchInventory = createAsyncThunk(
  "warehouses/fetchInventory",
  async (warehouseId, { rejectWithValue }) => {
    try { return { warehouseId, items: await apiGetInv(warehouseId) }; }
    catch (e) { return rejectWithValue(e.message || "Failed to load inventory"); }
  }
);

export const upsertInventory = createAsyncThunk(
  "warehouses/upsertInventory",
  async ({ warehouseId, items }, { rejectWithValue }) => {
    try {
      await apiUpsertInv(warehouseId, items);
      // fetch latest snapshot after upsert
      const refreshed = await apiGetInv(warehouseId);
      return { warehouseId, items: refreshed };
    } catch (e) {
      return rejectWithValue(e.message || "Inventory update failed");
    }
  }
);

export const getTotalWarehouses = createAsyncThunk(
  "warehouses/getTotal",
  async (_, { rejectWithValue }) => {
    try { return await apiGetTotal(); } // -> { totalWarehouses }
    catch (e) { return rejectWithValue(e.message || "Failed to load total warehouses"); }
  }
);

export const getRecentWarehouses = createAsyncThunk(
  "warehouses/getRecent",
  async (_, { rejectWithValue }) => {
    try { return await apiGetRecent(); } // -> array
    catch (e) { return rejectWithValue(e.message || "Failed to load recent warehouses"); }
  }
);

// -------- Slice --------
const initialState = {
  list: [],
  pagination: { page: 1, pageSize: 20, totalPages: 1, totalCount: 0, hasPrev: false, hasNext: false },
  search: "",
  current: null,          // selected warehouse (detail/edit)
  inventory: [],          // current warehouse's inventory
  status: "idle",         // idle | loading | succeeded | failed
  error: null,
  total: null,            // { totalWarehouses }
  recent: [],             // array of recent warehouses
};

const warehouseSlice = createSlice({
  name: "warehouses",
  initialState,
  reducers: {
    setSearch(state, action) { state.search = action.payload || ""; },
    setPage(state, action) { state.pagination.page = action.payload || 1; },
    setPageSize(state, action) { state.pagination.pageSize = action.payload || 20; },
    clearCurrent(state) { state.current = null; state.inventory = []; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchWarehouses.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchWarehouses.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        s.list = payload.data || [];
        s.pagination = { ...(s.pagination || {}), ...(payload.pagination || {}) };
      })
      .addCase(fetchWarehouses.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // get one
      .addCase(fetchWarehouse.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchWarehouse.fulfilled, (s, { payload }) => { s.status = "succeeded"; s.current = payload; })
      .addCase(fetchWarehouse.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // create
      .addCase(createWarehouse.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(createWarehouse.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        s.list = [payload, ...s.list];
        s.pagination.totalCount += 1;
      })
      .addCase(createWarehouse.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // update
      .addCase(updateWarehouse.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(updateWarehouse.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        s.current = payload;
        s.list = s.list.map((w) => (w.id === payload.id ? payload : w));
      })
      .addCase(updateWarehouse.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // delete
      .addCase(deleteWarehouse.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(deleteWarehouse.fulfilled, (s, { payload: id }) => {
        s.status = "succeeded";
        s.list = s.list.filter((w) => w.id !== id);
        s.pagination.totalCount = Math.max(0, (s.pagination.totalCount || 1) - 1);
      })
      .addCase(deleteWarehouse.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      // inventory
      .addCase(fetchInventory.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchInventory.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        if (!s.current || s.current.id === Number(payload.warehouseId) || String(s.current.id) === String(payload.warehouseId)) {
          s.inventory = payload.items;
        }
      })
      .addCase(fetchInventory.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      .addCase(upsertInventory.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(upsertInventory.fulfilled, (s, { payload }) => {
        s.status = "succeeded";
        s.inventory = payload.items;
      })
      .addCase(upsertInventory.rejected, (s, { payload }) => { s.status = "failed"; s.error = payload; })

      .addCase(getTotalWarehouses.fulfilled, (s, { payload }) => {
        s.total = payload; // { totalWarehouses }
      })
      .addCase(getRecentWarehouses.fulfilled, (s, { payload }) => {
        s.recent = Array.isArray(payload) ? payload : [];
      });
  },
});

export const { setSearch, setPage, setPageSize, clearCurrent, clearError } = warehouseSlice.actions;
export default warehouseSlice.reducer;

// Selectors
export const selectWarehouseState = (state) => state.warehouses;
export const selectWarehouses = (state) => state.warehouses.list;
export const selectWarehousePagination = (state) => state.warehouses.pagination;
export const selectWarehouseCurrent = (state) => state.warehouses.current;
export const selectWarehouseInventory = (state) => state.warehouses.inventory;
export const selectWarehouseStatus = (state) => state.warehouses.status;
export const selectWarehouseError = (state) => state.warehouses.error;
export const selectWarehouseTotal = (state) => state.warehouses.total;
export const selectWarehouseRecent = (state) => state.warehouses.recent;
