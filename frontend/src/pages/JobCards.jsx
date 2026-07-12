import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Card, Button, Input, VoiceInput, Modal, Select, Badge } from "../components/UI";

const emptyForm = {
  customer: "",
  vehicle: "",
  odometerReading: "",
  mechanicNotes: "",
  servicesUsed: [],
  partsUsed: [],
};

const statusColor = { pending: "amber", "in-progress": "blue", completed: "green" };

export default function JobCards() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [oRes, cRes, vRes, sRes, pRes] = await Promise.all([
        api.get("/service-orders", { params: filterStatus ? { status: filterStatus } : {} }),
        api.get("/customers"),
        api.get("/vehicles"),
        api.get("/services"),
        api.get("/parts"),
      ]);
      setOrders(oRes.data);
      setCustomers(cRes.data);
      setVehicles(vRes.data);
      setServices(sRes.data);
      setParts(pRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load job cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const addServiceLine = () => {
    setForm({ ...form, servicesUsed: [...form.servicesUsed, { service: "", name: "", cost: 0 }] });
  };

  const addPartLine = () => {
    setForm({ ...form, partsUsed: [...form.partsUsed, { part: "", name: "", qty: 1, unitPrice: 0 }] });
  };

  const updateServiceLine = (idx, serviceId) => {
    const svc = services.find((s) => s._id === serviceId);
    const updated = [...form.servicesUsed];
    updated[idx] = { service: serviceId, name: svc?.name || "", cost: svc?.laborCost || 0 };
    setForm({ ...form, servicesUsed: updated });
  };

  const updatePartLine = (idx, field, value) => {
    const updated = [...form.partsUsed];
    if (field === "part") {
      const part = parts.find((p) => p._id === value);
      updated[idx] = { ...updated[idx], part: value, name: part?.name || "", unitPrice: part?.unitPrice || 0 };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setForm({ ...form, partsUsed: updated });
  };

  const removeServiceLine = (idx) => {
    setForm({ ...form, servicesUsed: form.servicesUsed.filter((_, i) => i !== idx) });
  };

  const removePartLine = (idx) => {
    setForm({ ...form, partsUsed: form.partsUsed.filter((_, i) => i !== idx) });
  };

  const vehiclesForCustomer = vehicles.filter((v) => (v.customer?._id || v.customer) === form.customer);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/service-orders", form);
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create job card");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/service-orders/${id}/status`, { status });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Job Cards</h1>
          <p className="text-sm text-slate-500">Track service jobs from intake to completion</p>
        </div>
        <Button onClick={openCreate}>+ New Job Card</Button>
      </div>

      <Card>
        <div className="mb-4">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="max-w-xs">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </Select>
        </div>

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-slate-500 text-sm">No job cards found.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o._id} className="border border-slate-200 rounded-lg p-4 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <p className="font-medium text-slate-800">
                    {o.vehicle?.brand} {o.vehicle?.model} · {o.vehicle?.regNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.customer?.name} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={statusColor[o.status]}>{o.status}</Badge>
                  <Select
                    value={o.status}
                    onChange={(e) => updateStatus(o._id, e.target.value)}
                    className="text-xs py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                  <Link
                    to="/invoices"
                    state={{ fromOrder: o }}
                    className="text-primary-600 text-xs font-medium hover:underline"
                  >
                    Create Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Job Card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer"
            required
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value, vehicle: "" })}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </Select>

          <Select
            label="Vehicle"
            required
            value={form.vehicle}
            onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
            disabled={!form.customer}
          >
            <option value="">Select vehicle</option>
            {vehiclesForCustomer.map((v) => (
              <option key={v._id} value={v._id}>
                {v.brand} {v.model} ({v.regNumber})
              </option>
            ))}
          </Select>

          <Input
            label="Odometer Reading"
            type="number"
            value={form.odometerReading}
            onChange={(e) => setForm({ ...form, odometerReading: e.target.value })}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Services</span>
              <button type="button" onClick={addServiceLine} className="text-xs text-primary-600 font-medium">
                + Add Service
              </button>
            </div>
            {form.servicesUsed.map((s, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  value={s.service}
                  onChange={(e) => updateServiceLine(idx, e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Select service</option>
                  {services.map((sv) => (
                    <option key={sv._id} value={sv._id}>
                      {sv.name} (₹{sv.laborCost})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeServiceLine(idx)} className="text-red-500 text-sm px-2">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Parts Used</span>
              <button type="button" onClick={addPartLine} className="text-xs text-primary-600 font-medium">
                + Add Part
              </button>
            </div>
            {form.partsUsed.map((p, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <select
                  value={p.part}
                  onChange={(e) => updatePartLine(idx, "part", e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Select part</option>
                  {parts.map((pt) => (
                    <option key={pt._id} value={pt._id}>
                      {pt.name} (Stock: {pt.quantity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={p.qty}
                  onChange={(e) => updatePartLine(idx, "qty", Number(e.target.value))}
                  className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => removePartLine(idx)} className="text-red-500 text-sm px-2">
                  ×
                </button>
              </div>
            ))}
          </div>

          <VoiceInput
            label="Mechanic Notes"
            name="mechanicNotes"
            value={form.mechanicNotes}
            onChange={(e) => setForm({ ...form, mechanicNotes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Job Card</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
