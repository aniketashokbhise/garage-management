import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { Card, Button, Badge, Input, Modal } from "../components/UI";

const paymentColor = { paid: "green", partial: "amber", unpaid: "red" };

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchInvoice = async () => {
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoice");
    }
  };

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const downloadPDF = () => {
    const token = localStorage.getItem("token");
    const base = api.defaults.baseURL;
    // Open in new tab with token as query isn't supported by backend, so fetch as blob instead.
    fetch(`${base}/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoice.invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  const shareWhatsApp = () => {
    const phone = invoice.customer?.phone?.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hi ${invoice.customer?.name}, here is your invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal}. Payment status: ${invoice.paymentStatus}. Thank you for your business!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const sendWhatsAppNow = async () => {
    setSendingWhatsApp(true);
    setWhatsappMsg("");
    try {
      await api.post(`/invoices/${id}/send-whatsapp`);
      setWhatsappMsg("Invoice sent to customer's WhatsApp ✅");
      fetchInvoice();
    } catch (err) {
      setWhatsappMsg(err.response?.data?.message || "Failed to send WhatsApp message");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/invoices/${id}/payment`, { amount: Number(payAmount), mode: "cash" });
      setPayModalOpen(false);
      setPayAmount("");
      fetchInvoice();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment");
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/invoices/${id}`);
      navigate("/invoices");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete invoice");
      setDeleting(false);
    }
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (!invoice) return <div className="text-slate-500">Loading...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link to="/invoices" className="text-sm text-primary-600 hover:underline">
          ← Back to Invoices
        </Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-slate-500">{new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
          <Badge color={paymentColor[invoice.paymentStatus]}>{invoice.paymentStatus}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={downloadPDF}>⬇ Download PDF</Button>
        <Button variant="secondary" onClick={sendWhatsAppNow} disabled={sendingWhatsApp}>
          {sendingWhatsApp ? "Sending..." : "📤 Send Invoice on WhatsApp"}
        </Button>
        <Button variant="secondary" onClick={shareWhatsApp}>
          📱 Share via WhatsApp (manual)
        </Button>
        {invoice.paymentStatus !== "paid" && (
          <Button variant="secondary" onClick={() => setPayModalOpen(true)}>
            💵 Record Payment
          </Button>
        )}
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "🗑 Delete Invoice"}
        </Button>
        {invoice.whatsappStatus && (
          <Badge color={invoice.whatsappStatus === "sent" ? "green" : invoice.whatsappStatus === "failed" ? "red" : "amber"}>
            WhatsApp: {invoice.whatsappStatus.replace("_", " ")}
          </Badge>
        )}
      </div>
      {whatsappMsg && <p className="text-sm text-slate-600">{whatsappMsg}</p>}
      {invoice.whatsappStatus === "failed" && invoice.whatsappError && (
        <p className="text-xs text-red-500">Reason: {invoice.whatsappError}</p>
      )}

      <Card>
        <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-slate-500">Bill To</p>
            <p className="font-medium text-slate-800">{invoice.customer?.name}</p>
            <p className="text-slate-500">{invoice.customer?.phone}</p>
          </div>
          <div>
            <p className="text-slate-500">Vehicle</p>
            <p className="font-medium text-slate-800">
              {invoice.vehicle?.brand} {invoice.vehicle?.model}
            </p>
            <p className="text-slate-500">{invoice.vehicle?.regNumber}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right">₹{item.price}</td>
                <td className="py-2 text-right">₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-sm ml-auto max-w-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>₹{invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax</span>
            <span>₹{invoice.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Discount</span>
            <span>-₹{invoice.discount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1">
            <span>Grand Total</span>
            <span>₹{invoice.grandTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Amount Paid</span>
            <span>₹{invoice.amountPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium text-red-600">
            <span>Balance Due</span>
            <span>₹{invoice.balanceDue.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} title="Record Payment">
        <form onSubmit={recordPayment} className="space-y-4">
          <Input
            label={`Amount (Balance Due: ₹${invoice.balanceDue.toLocaleString()})`}
            type="number"
            step="0.01"
            required
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
