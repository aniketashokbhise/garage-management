import { useEffect, useState } from "react";
import api from "../services/api";
import { Card, Button, Input, VoiceInput, Modal } from "../components/UI";

const emptyForm = { name: "", description: "", category: "", laborCost: "", estimatedTime: "" };

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/services");
      setServices(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name,
      description: s.description || "",
      category: s.category || "",
      laborCost: s.laborCost,
      estimatedTime: s.estimatedTime || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, laborCost: Number(form.laborCost) || 0 };
    try {
      if (editingId) {
        await api.put(`/services/${editingId}`, payload);
      } else {
        await api.post("/services", payload);
      }
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save service");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await api.delete(`/services/${id}`);
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete service");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Services</h1>
          <p className="text-sm text-slate-500">Manage your service catalog & labor rates</p>
        </div>
        <Button onClick={openCreate}>+ Add Service</Button>
      </div>

      <Card>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : services.length === 0 ? (
          <p className="text-slate-500 text-sm">No services found.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((s) => (
              <div key={s._id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-sm font-semibold text-primary-700">₹{s.laborCost}</p>
                </div>
                {s.category && <p className="text-xs text-slate-500 mt-1">{s.category}</p>}
                {s.description && <p className="text-xs text-slate-500 mt-1">{s.description}</p>}
                {s.estimatedTime && (
                  <p className="text-xs text-slate-400 mt-1">Est. time: {s.estimatedTime}</p>
                )}
                <div className="mt-3 space-x-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-primary-600 hover:underline text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="text-red-600 hover:underline text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Service" : "Add Service"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <VoiceInput
            label="Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <VoiceInput
            label="Description"
            name="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Labor Cost (₹)"
              type="number"
              step="0.01"
              required
              value={form.laborCost}
              onChange={(e) => setForm({ ...form, laborCost: e.target.value })}
            />
            <Input
              label="Estimated Time"
              placeholder="e.g. 1-2 hrs"
              value={form.estimatedTime}
              onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? "Save Changes" : "Add Service"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
