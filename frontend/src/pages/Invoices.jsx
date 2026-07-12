import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";
import { Card, Button, Input, Modal, Select, Badge } from "../components/UI";

const emptyItem = { description: "", qty: "", price: "" };
const paymentColor = { paid: "green", partial: "amber", unpaid: "red" };

export default function Invoices() {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    customer: "",
    vehicle: "",
    items: [{ ...emptyItem }],
    tax: "",
    discount: "",
    paymentMode: "cash",
    amountPaid: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [iRes, cRes, vRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/customers"),
        api.get("/vehicles"),
      ]);
      setInvoices(iRes.data);
      setCustomers(cRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Prefill from a job card if navigated with state
  useEffect(() => {
    const order = location.state?.fromOrder;
    if (order) {
      const items = [
        ...order.servicesUsed.map((s) => ({ description: s.name, qty: 1, price: s.cost })),
        ...order.partsUsed.map((p) => ({ description: p.name, qty: p.qty, price: p.unitPrice })),
      ];
      setForm((f) => ({
        ...f,
        customer: order.customer?._id || order.customer,
        vehicle: order.vehicle?._id || order.vehicle,
        items: items.length ? items : [{ ...emptyItem }],
      }));
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const openCreate = () => {
    setForm({
      customer: "",
      vehicle: "",
      items: [{ ...emptyItem }],
      tax: "",
      discount: "",
      paymentMode: "cash",
      amountPaid: "",
    });
    setModalOpen(true);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const vehiclesForCustomer = vehicles.filter((v) => (v.customer?._id || v.customer) === form.customer);
  const subtotal = form.items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const grandTotal = subtotal + (Number(form.tax) || 0) - (Number(form.discount) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: form.items.map((i) => ({
        ...i,
        qty: Number(i.qty) || 0,
        price: Number(i.price) || 0,
      })),
      tax: Number(form.tax) || 0,
      discount: Number(form.discount) || 0,
      amountPaid: Number(form.amountPaid) || 0,
    };
    try {
      await api.post("/invoices", payload);
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create invoice");
    }
  };

  const handleDelete = async (invoice) => {
    const ok = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`
    );
    if (!ok) return;
    setDeletingId(invoice._id);
    try {
      await api.delete(`/invoices/${invoice._id}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== invoice._id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete invoice");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-500">Create and track customer invoices</p>
        </div>
        <Button onClick={openCreate}>+ New Invoice</Button>
      </div>

      <Card>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-slate-500 text-sm">No invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Invoice #</th>
                  <th className="py-2 pr-4 hidden sm:table-cell">Customer</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Date</th>
                  <th className="py-2 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-800">
                      <Link to={`/invoices/${inv._id}`} className="hover:text-primary-600">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 hidden sm:table-cell">
                      {inv.customer?.name}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">₹{inv.grandTotal.toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <Badge color={paymentColor[inv.paymentStatus]}>{inv.paymentStatus}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(inv)}
                        disabled={deletingId === inv._id}
                        className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                        title="Delete invoice"
                      >
                        {deletingId === inv._id ? "Deleting..." : "🗑 Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Invoice">
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Line Items</span>
              <button type="button" onClick={addItem} className="text-xs text-primary-600 font-medium">
                + Add Item
              </button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                  required
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, "qty", e.target.value)}
                  className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => updateItem(idx, "price", e.target.value)}
                  className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm px-2">
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tax (₹)"
              type="number"
              step="0.01"
              value={form.tax}
              onChange={(e) => setForm({ ...form, tax: e.target.value })}
            />
            <Input
              label="Discount (₹)"
              type="number"
              step="0.01"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Payment Mode"
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </Select>
            <Input
              label="Amount Paid (₹)"
              type="number"
              step="0.01"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-800">
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Invoice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
