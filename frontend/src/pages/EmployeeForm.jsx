import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import { Card, Button, Input, VoiceInput, Select } from "../components/UI";

const BACKEND_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  joiningDate: "",
  jobRole: "Mechanic",
  status: "Active",
  monthlySalary: "",
  salaryAdvance: "",
  employeeLoan: "",
  advanceAmount: "",
  bonus: "",
  overtimePay: "",
  deductions: "",
  paymentStatus: "Pending",
  lastPaymentDate: "",
};

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhoto, setExistingPhoto] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    const fetchEmployee = async () => {
      try {
        const { data } = await api.get(`/employees/${id}`);
        setForm({
          name: data.name || "",
          mobile: data.mobile || "",
          email: data.email || "",
          address: data.address || "",
          joiningDate: toDateInput(data.joiningDate),
          jobRole: data.jobRole || "Mechanic",
          status: data.status || "Active",
          monthlySalary: data.salary?.monthlySalary ?? "",
          salaryAdvance: data.salary?.salaryAdvance ?? "",
          employeeLoan: data.salary?.employeeLoan ?? "",
          advanceAmount: data.salary?.advanceAmount ?? "",
          bonus: data.salary?.bonus ?? "",
          overtimePay: data.salary?.overtimePay ?? "",
          deductions: data.salary?.deductions ?? "",
          paymentStatus: data.salary?.paymentStatus || "Pending",
          lastPaymentDate: toDateInput(data.salary?.lastPaymentDate),
        });
        setExistingPhoto(data.photo || null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load employee");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id, isEdit]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) fd.append(key, value);
      });
      if (photoFile) fd.append("photo", photoFile);

      if (isEdit) {
        await api.put(`/employees/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        navigate(`/employees/${id}`);
      } else {
        const { data } = await api.post("/employees", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        navigate(`/employees/${data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save employee");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-500">Loading...</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link to="/employees" className="text-sm text-primary-600 hover:underline">
          ← Back to Employees
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <h3 className="font-semibold text-slate-800 mb-4">Employee Information</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {photoPreview || existingPhoto ? (
                <img
                  src={photoPreview || `${BACKEND_ORIGIN}${existingPhoto}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">Photo</span>
              )}
            </div>
            <div>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={handlePhotoChange}
                className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WEBP, up to 3MB.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <VoiceInput label="Employee Name" name="name" required value={form.name} onChange={set("name")} />
            <Input label="Mobile Number" required value={form.mobile} onChange={set("mobile")} />
            <Input label="Email Address" type="email" value={form.email} onChange={set("email")} />
            <Input label="Joining Date" type="date" value={form.joiningDate} onChange={set("joiningDate")} />
            <Select label="Job Role" required value={form.jobRole} onChange={set("jobRole")}>
              <option value="Mechanic">Mechanic</option>
              <option value="Helper">Helper</option>
              <option value="Manager">Manager</option>
              <option value="Receptionist">Receptionist</option>
            </Select>
            <Select label="Employment Status" value={form.status} onChange={set("status")}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <div className="mt-4">
            <VoiceInput label="Address" name="address" value={form.address} onChange={set("address")} />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-800 mb-4">Salary Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Salary (₹)"
              type="number"
              min="0"
              value={form.monthlySalary}
              onChange={set("monthlySalary")}
            />
            <Input label="Bonus (₹)" type="number" min="0" value={form.bonus} onChange={set("bonus")} />
            <Input
              label="Overtime Pay (₹)"
              type="number"
              min="0"
              value={form.overtimePay}
              onChange={set("overtimePay")}
            />
            <Input
              label="Salary Deductions (₹)"
              type="number"
              min="0"
              value={form.deductions}
              onChange={set("deductions")}
            />
            <Input
              label="Salary Advance (₹)"
              type="number"
              min="0"
              value={form.salaryAdvance}
              onChange={set("salaryAdvance")}
            />
            <Input
              label="Employee Loan (₹)"
              type="number"
              min="0"
              value={form.employeeLoan}
              onChange={set("employeeLoan")}
            />
            <Input
              label="Advance Amount Recovered (₹)"
              type="number"
              min="0"
              value={form.advanceAmount}
              onChange={set("advanceAmount")}
            />
            <Select label="Payment Status" value={form.paymentStatus} onChange={set("paymentStatus")}>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
            </Select>
            <Input
              label="Last Payment Date"
              type="date"
              value={form.lastPaymentDate}
              onChange={set("lastPaymentDate")}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Net salary and remaining loan balance are calculated automatically after saving.
          </p>
        </Card>

        {isEdit && (
          <Card>
            <h3 className="font-semibold text-slate-800 mb-1">Attendance</h3>
            <p className="text-sm text-slate-500">
              Attendance is marked day-by-day and isn't edited from this form.{" "}
              <Link to={`/attendance?employee=${id}`} className="text-primary-600 hover:underline">
                Go to Attendance →
              </Link>
            </p>
          </Card>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
