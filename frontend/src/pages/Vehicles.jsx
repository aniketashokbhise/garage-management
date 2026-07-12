import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Card, Button, Input, VoiceInput, Modal, Select, Badge } from "../components/UI";

const emptyForm = { customer: "", type: "car", brand: "", model: "", regNumber: "", year: "", color: "" };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, cRes] = await Promise.all([api.get("/vehicles"), api.get("/customers")]);
      setVehicles(vRes.data);
      setCustomers(cRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditingId(v._id);
    setForm({
      customer: v.customer?._id || v.customer,
      type: v.type,
      brand: v.brand || "",
      model: v.model || "",
      regNumber: v.regNumber,
      year: v.year || "",
      color: v.color || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/vehicles/${editingId}`, form);
      } else {
        await api.post("/vehicles", form);
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vehicle");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete vehicle");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vehicles</h1>
          <p className="text-sm text-slate-500">Manage registered vehicles</p>
        </div>
        <Button onClick={openCreate}>+ Add Vehicle</Button>
      </div>

      <Card>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : vehicles.length === 0 ? (
          <p className="text-slate-500 text-sm">No vehicles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Reg. Number</th>
                  <th className="py-2 pr-4">Vehicle</th>
                  <th className="py-2 pr-4 hidden sm:table-cell">Owner</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-800">
                      <Link to={`/vehicles/${v._id}`} className="hover:text-primary-600">
                        {v.regNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">
                      {v.brand} {v.model}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 hidden sm:table-cell">
                      {v.customer?.name || "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge color="blue">{v.type}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-right space-x-2">
                      <button
                        onClick={() => openEdit(v)}
                        className="text-primary-600 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v._id)}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Vehicle" : "Add Vehicle"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer"
            required
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="truck">Truck</option>
            <option value="other">Other</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <VoiceInput
              label="Brand"
              name="brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            <VoiceInput
              label="Model"
              name="model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>
          <Input
            label="Registration Number"
            required
            value={form.regNumber}
            onChange={(e) => setForm({ ...form, regNumber: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            <Input
              label="Color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? "Save Changes" : "Add Vehicle"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
