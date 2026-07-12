import { useEffect, useState } from "react";
import api from "../services/api";
import { Card, Button, Input, VoiceInput, Modal, Badge } from "../components/UI";

const emptyForm = {
  name: "",
  partNumber: "",
  category: "",
  quantity: "",
  unitPrice: "",
  costPrice: "",
  supplier: "",
  lowStockThreshold: "",
};

const emptyRestockForm = { qty: "", supplier: "", costPrice: "", note: "" };

const typeColor = { initial: "slate", purchase: "green", usage: "red", adjustment: "blue" };
const typeLabel = { initial: "Initial stock", purchase: "Purchase", usage: "Used in service", adjustment: "Manual edit" };

export default function Inventory() {
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const [restockOpen, setRestockOpen] = useState(false);
  const [restockPart, setRestockPart] = useState(null);
  const [restockForm, setRestockForm] = useState(emptyRestockForm);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("Inventory History");

  const fetchParts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/parts", { params: { search } });
      setParts(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchParts, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      partNumber: p.partNumber || "",
      category: p.category || "",
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      costPrice: p.costPrice || 0,
      supplier: p.supplier || "",
      lowStockThreshold: p.lowStockThreshold,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: Number(form.quantity) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      costPrice: Number(form.costPrice) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 5,
    };
    try {
      if (editingId) {
        await api.put(`/parts/${editingId}`, payload);
      } else {
        await api.post("/parts", payload);
      }
      setModalOpen(false);
      fetchParts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save part");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this part?")) return;
    try {
      await api.delete(`/parts/${id}`);
      fetchParts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete part");
    }
  };

  const openRestock = (part) => {
    setRestockPart(part);
    setRestockForm({ qty: "", supplier: part.supplier || "", costPrice: part.costPrice || "", note: "" });
    setRestockOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/parts/${restockPart._id}/restock`, restockForm);
      setRestockOpen(false);
      fetchParts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add stock");
    }
  };

  const openHistory = async (part = null) => {
    setHistoryTitle(part ? `History — ${part.name}` : "Inventory History (All Parts)");
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(part ? `/parts/${part._id}/history` : "/parts/history");
      setHistoryLogs(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500">Manage spare parts & materials stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openHistory()}>
            View History
          </Button>
          <Button onClick={openCreate}>+ Add Part</Button>
        </div>
      </div>

      <Card>
        <Input
          placeholder="Search parts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : parts.length === 0 ? (
          <p className="text-slate-500 text-sm">No parts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4 hidden sm:table-cell">Category</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Unit Price</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2 pr-4 text-slate-600 hidden sm:table-cell">{p.category || "-"}</td>
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-2">
                        {p.quantity}
                        {p.quantity <= p.lowStockThreshold && <Badge color="red">Low</Badge>}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">₹{p.unitPrice}</td>
                    <td className="py-2 pr-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openRestock(p)}
                        className="text-green-600 hover:underline text-xs font-medium"
                      >
                        + Restock
                      </button>
                      <button
                        onClick={() => openHistory(p)}
                        className="text-slate-500 hover:underline text-xs font-medium"
                      >
                        History
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-primary-600 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="text-red-600 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Part */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Part" : "Add Part"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <VoiceInput
            label="Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Part Number"
              value={form.partNumber}
              onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
            />
            <VoiceInput
              label="Category"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={editingId ? "Quantity (use Restock to add stock)" : "Starting Quantity"}
              type="number"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Price (₹)"
              type="number"
              step="0.01"
              required
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
            <Input
              label="Cost Price (₹)"
              type="number"
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            />
          </div>
          <VoiceInput
            label="Supplier"
            name="supplier"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? "Save Changes" : "Add Part"}</Button>
          </div>
        </form>
      </Modal>

      {/* Restock (purchase) */}
      <Modal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        title={restockPart ? `Add Stock — ${restockPart.name}` : "Add Stock"}
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">
            Current stock: <span className="font-semibold text-slate-700">{restockPart?.quantity}</span>
          </p>
          <Input
            label="Quantity Purchased"
            type="number"
            min="1"
            required
            value={restockForm.qty}
            onChange={(e) => setRestockForm({ ...restockForm, qty: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <VoiceInput
              label="Supplier"
              name="supplier"
              value={restockForm.supplier}
              onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
            />
            <Input
              label="Cost Price (₹ per unit)"
              type="number"
              step="0.01"
              value={restockForm.costPrice}
              onChange={(e) => setRestockForm({ ...restockForm, costPrice: e.target.value })}
            />
          </div>
          <VoiceInput
            label="Note"
            name="note"
            placeholder="e.g. Invoice #1234 from ABC Auto Parts"
            value={restockForm.note}
            onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRestockOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Stock</Button>
          </div>
        </form>
      </Modal>

      {/* History */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={historyTitle}>
        {historyLoading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : historyLogs.length === 0 ? (
          <p className="text-slate-500 text-sm">No history yet.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {historyLogs.map((log) => (
              <div
                key={log._id}
                className="border border-slate-200 rounded-lg p-3 flex justify-between items-start gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color={typeColor[log.type]}>{typeLabel[log.type]}</Badge>
                    <span className="font-medium text-slate-800 text-sm">{log.partName}</span>
                  </div>
                  {log.note && <p className="text-xs text-slate-500 mt-1">{log.note}</p>}
                  {log.supplier && <p className="text-xs text-slate-400">Supplier: {log.supplier}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-semibold text-sm ${
                      log.quantityChange >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {log.quantityChange >= 0 ? "+" : ""}
                    {log.quantityChange}
                  </p>
                  <p className="text-xs text-slate-400">→ {log.quantityAfter} left</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
