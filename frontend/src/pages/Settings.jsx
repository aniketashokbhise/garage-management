import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Input } from "../components/UI";

// Backend origin without the trailing "/api", used to build the logo preview URL.
const BACKEND_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

export default function Settings() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    workshopName: "",
    phone: "",
    address: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        workshopName: user.workshopName || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const currentLogoUrl = user?.logoUrl ? `${BACKEND_ORIGIN}${user.logoUrl}` : null;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const fd = new FormData();
      fd.append("workshopName", form.workshopName);
      fd.append("phone", form.phone);
      fd.append("address", form.address);
      if (logoFile) fd.append("logo", logoFile);

      const { data } = await api.put("/auth/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Keep the token, just refresh the profile fields shown around the app.
      setUser((prev) => ({ ...prev, ...data }));
      setLogoFile(null);
      setLogoPreview(null);
      setMessage("Workshop details saved. These now appear on new invoice PDFs.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save workshop details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Workshop Settings</h1>
        <p className="text-sm text-slate-500">
          Your logo, address, and phone number appear on every invoice PDF.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="text-sm font-medium text-slate-700 mb-2 block">Workshop Logo</span>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {logoPreview || currentLogoUrl ? (
                  <img
                    src={logoPreview || currentLogoUrl}
                    alt="Workshop logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400 text-center px-2">No logo yet</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleLogoChange}
                  className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="text-xs text-slate-400 mt-1">PNG or JPG, up to 3MB.</p>
              </div>
            </div>
          </div>

          <Input
            label="Workshop Name"
            required
            value={form.workshopName}
            onChange={(e) => setForm({ ...form, workshopName: e.target.value })}
          />
          <Input
            label="Phone Number (shown on invoice)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-1 block">
              Workshop Address (shown at the bottom of invoice PDF)
            </span>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Shop No., Street, City, State, PIN"
            />
          </label>

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
