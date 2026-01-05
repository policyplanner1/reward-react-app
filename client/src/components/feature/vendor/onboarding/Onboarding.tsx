import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { ComponentType } from "react";
// import { useNavigate, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  FaBuilding,
  FaAddressBook,
  FaCreditCard,
  FaShippingFast,
  FaUniversity,
  FaFileContract,
  FaFileUpload,
  FaEnvelope,
} from "react-icons/fa";
import { api } from "../../../../api/api";

/* ================= TYPES ================= */

interface VendorOnboardingData {
  companyName: string;
  fullName: string;
  vendorType:
    | "Manufacturer"
    | "Trader"
    | "Distributor"
    | "Service Provider"
    | "";
  gstin: string;
  panNumber: string;
  ip_address: string;

  gstinFile: File | null;
  panFile: File | null;
  bankProofFile: File | null;
  signatoryIdFile: File | null;
  businessProfileFile: File | null;
  vendorAgreementFile: File | null;
  brandLogoFile: File | null;
  authorizationLetterFile: File | null;
  electricityBillFile: File | null;
  rightsAdvisoryFile: File | null;
  nocFile: File | null;

  agreementAccepted: boolean;

  companyEmail: string;
  companyPhone: string;

  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  pincode: string;

  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPincode: string;

  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;

  bankName: string;
  accountNumber: string;
  branch: string;
  ifscCode: string;

  primaryContactNumber: string;
  email: string;
  alternateContactNumber: string;

  paymentTerms: string;
  comments: string;
}

/* ================= INITIAL STATE ================= */

const initialFormData: VendorOnboardingData = {
  companyName: "",
  fullName: "",
  vendorType: "",
  gstin: "",
  panNumber: "",
  ip_address: "",

  gstinFile: null,
  panFile: null,
  bankProofFile: null,
  signatoryIdFile: null,
  businessProfileFile: null,
  vendorAgreementFile: null,
  brandLogoFile: null,
  authorizationLetterFile: null,
  electricityBillFile: null,
  rightsAdvisoryFile: null,
  nocFile: null,

  agreementAccepted: false,

  companyEmail: "",
  companyPhone: "",

  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  city: "",
  state: "",
  pincode: "",

  billingAddressLine1: "",
  billingAddressLine2: "",
  billingCity: "",
  billingState: "",
  billingPincode: "",

  shippingAddressLine1: "",
  shippingAddressLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingPincode: "",

  bankName: "",
  accountNumber: "",
  branch: "",
  ifscCode: "",

  primaryContactNumber: "",
  email: "",
  alternateContactNumber: "",

  paymentTerms: "",
  comments: "",
};

/* ================= SMALL UI HELPERS (added) ================= */

type IconComp = ComponentType<any>;

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComp;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center space-x-4 pb-4 border-b border-gray-100 mb-6">
      <div className="p-3 text-white rounded-2xl shadow-lg shadow-[#852BAF]/20 bg-gradient-to-tr from-[#852BAF] to-[#FC3F78]">
        <Icon className="text-xl" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 font-medium">{description}</p>
        )}
      </div>
    </div>
  );
}

function FormInput(props: {
  id: string;
  label: string;
  value?: string | number;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const {
    id,
    label,
    value = "",
    onChange,
    type = "text",
    required,
    placeholder,
    error,
  } = props;
  return (
    <div className="flex flex-col space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1"
      >
        {label} {required && <span className="text-[#FC3F78]">*</span>}
      </label>
      <input
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        className="px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#852BAF]/10 focus:border-[#852BAF] focus:bg-white transition-all outline-none text-sm text-gray-800 placeholder:text-gray-400"
      />
      {error && (
        <p className="text-[10px] font-bold text-[#FC3F78] mt-1 ml-1 uppercase">
          {error}
        </p>
      )}
    </div>
  );
}

function FileUploadInput(props: {
  id: string;
  label: string;
  file: File | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  required?: boolean;
  description?: string;
}) {
  const { id, label, file, onChange, accept, required, description } = props;
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-600 ml-1">
        {label} {required && <span className="text-[#FC3F78]">*</span>}
      </label>
      <div className="relative group">
        <input
          id={id}
          name={id}
          type="file"
          accept={accept}
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className={`p-3 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center bg-gray-50/50 
          ${
            file
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-gray-200 group-hover:border-[#852BAF]/40 group-hover:bg-gray-50"
          }`}
        >
          <FaFileUpload
            className={`text-xl mb-1 ${
              file ? "text-emerald-500" : "text-gray-400"
            }`}
          />
          <span className="text-[11px] font-bold text-gray-500 text-center truncate w-full px-2">
            {file ? file.name : "Click to upload document"}
          </span>
        </div>
      </div>
      {description && (
        <p className="text-[10px] text-gray-400 italic leading-tight">
          {description}
        </p>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function Onboarding() {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState<VendorOnboardingData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [vendorStatus, setVendorStatus] = useState<
    "pending" | "sent_for_approval" | "approved" | "rejected" | null
  >(null);

  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(true);

  // NEW local UI checkbox states & handlers
  const [isSameAsAddress, setIsSameAsAddress] = useState(false);
  const [isSameAsBilling, setIsSameAsBilling] = useState(false);

  /* ================= VALIDATORS ================= */

  const allowOnlyAlphabets = (value: string) => /^[A-Za-z ]*$/.test(value);

  const allowOnlyNumbers = (value: string) => /^[0-9]*$/.test(value);

  const allowAddressChars = (value: string) =>
    /^[A-Za-z0-9\s,./-]*$/.test(value);

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const validators = {
    fullName: (value: string) => /^[A-Za-z ]+$/.test(value),
    panNumber: (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value),
    pincode: (value: string) => /^[0-9]{6}$/.test(value),
    phone: (value: string) => /^[0-9]{10}$/.test(value),
    state: (value: string) => /^[A-Za-z ]+$/.test(value),
    email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
  };

  /* ================= FIELD VALIDATION ================= */

  const validateField = (
    name: string,
    value: any,
    formData: VendorOnboardingData,
    flags: {
      isSameAsAddress: boolean;
      isSameAsBilling: boolean;
    }
  ): string => {
    switch (name) {
      case "companyName":
        return value.trim() ? "" : "Company Name is required";

      case "fullName":
        if (!value.trim()) return "Full Name is required";
        if (!validators.fullName(value)) return "Only alphabets allowed";
        return "";

      case "vendorType":
        return value ? "" : "Select vendor type";

      case "gstin":
        return value.trim() ? "" : "GSTIN is required";

      case "panNumber":
        if (!value.trim()) return "PAN Number is required";
        if (!validators.panNumber(value.toUpperCase()))
          return "PAN must be in format ABCDE1234F";
        return "";

      case "email":
        if (!value.trim()) return "Email is required";
        if (!validators.email(value)) return "Enter a valid email";
        return "";

      case "primaryContactNumber":
        if (!value.trim()) return "Primary contact is required";
        if (!validators.phone(value)) return "Contact number must be 10 digits";
        return "";

      case "pincode":
      case "billingPincode":
      case "shippingPincode":
        if (!value.trim()) return "Pincode is required";
        if (!validators.pincode(value)) return "Pincode must be 6 digits";
        return "";

      case "billingAddressLine1":
      case "billingCity":
      case "billingState":
        if (!formData.vendorType) return "";
        if (!flags.isSameAsAddress && !value.trim())
          return "Billing field is required";
        return "";

      case "shippingAddressLine1":
      case "shippingCity":
      case "shippingState":
        if (!formData.vendorType) return "";
        if (!flags.isSameAsBilling && !value.trim())
          return "Shipping field is required";
        return "";

      case "bankName":
        return value.trim() ? "" : "Bank name is required";

      case "accountNumber":
        return value.trim() ? "" : "Account number is required";

      case "branch":
        return value.trim() ? "" : "Branch is required";

      case "ifscCode":
        return value.trim() ? "" : "IFSC code is required";

      case "agreementAccepted":
        return value ? "" : "You must accept the agreement";

      case "companyEmail":
        if (formData.vendorType === "Manufacturer") {
          if (!value.trim()) return "Company Email is required";
          if (!validators.email(value)) return "Enter a valid email";
        }
        return "";

      case "companyPhone":
        if (formData.vendorType === "Manufacturer") {
          if (!value.trim()) return "Company Phone is required";
          if (!validators.phone(value)) return "Phone must be 10 digits";
        }
        return "";

      case "authorizationLetterFile":
        if (formData.vendorType === "Trader" && !value)
          return "Authorization letter is required";
        return "";

      default:
        return "";
    }
  };

  /* ================= FORM VALIDATION ================= */

  const validateForm = (formData: VendorOnboardingData) => {
    const newErrors: Record<string, string> = {};

    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value, formData, {
        isSameAsAddress,
        isSameAsBilling,
      });

      if (error) newErrors[key] = error;
    });

    return newErrors;
  };

  /* ================= FETCH STATUS ================= */
  useEffect(() => {
    const fetchVendorStatus = async () => {
      try {
        const res = await api.get("/vendor/my-details");

        if (res.data?.success) {
          setVendorStatus(res.data.vendor.status);
          setRejectionReason(res.data.vendor.rejection_reason || "");
        }
      } catch (err) {
        console.error("Failed to fetch vendor status", err);
        setVendorStatus(null);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchVendorStatus();
  }, []);

  /* ================= HANDLERS ================= */

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked, files } = e.target as HTMLInputElement;

    /* FILE */
    if (type === "file") {
      setFormData((p) => ({ ...p, [name]: files?.[0] || null }));
      return;
    }

    /* CHECKBOX */
    if (type === "checkbox") {
      setFormData((p) => ({ ...p, [name]: checked }));
      return;
    }

    /* ================= HARD BLOCK RULES ================= */

    // Alphabet-only fields
    const alphabetOnlyFields = [
      "fullName",
      "companyName",
      "city",
      "state",
      "billingCity",
      "billingState",
      "shippingCity",
      "shippingState",
      "bankName",
      "branch",
    ];

    if (alphabetOnlyFields.includes(name)) {
      if (!allowOnlyAlphabets(value)) return;
    }

    // Address fields (allow text + numbers, no special chars)
    const addressFields = [
      "addressLine1",
      "addressLine2",
      "addressLine3",
      "billingAddressLine1",
      "billingAddressLine2",
      "shippingAddressLine1",
      "shippingAddressLine2",
    ];

    if (addressFields.includes(name)) {
      if (!allowAddressChars(value)) return;
    }

    // Numbers-only fields
    const numberOnlyFields = [
      "pincode",
      "billingPincode",
      "shippingPincode",
      "accountNumber",
      "primaryContactNumber",
      "alternateContactNumber",
      "companyPhone",
    ];

    if (numberOnlyFields.includes(name)) {
      if (!allowOnlyNumbers(value)) return;

      // length limits
      if (
        [
          "primaryContactNumber",
          "alternateContactNumber",
          "companyPhone",
        ].includes(name) &&
        value.length > 10
      )
        return;

      if (
        ["pincode", "billingPincode", "shippingPincode"].includes(name) &&
        value.length > 6
      )
        return;
    }

    // PAN – uppercase + length control
    if (name === "panNumber") {
      if (!/^[A-Za-z0-9]*$/.test(value)) return;
      if (value.length > 10) return;
    }

    /* ================= SOFT VALIDATION ================= */

    let error = "";

    if (name === "fullName" && value && !allowOnlyAlphabets(value)) {
      error = "Only alphabets allowed";
    }

    if (name === "panNumber" && value && !panRegex.test(value.toUpperCase())) {
      error = "PAN must be in format ABCDE1234F";
    }

    if (
      ["pincode", "billingPincode", "shippingPincode"].includes(name) &&
      value.length === 6 &&
      !/^[0-9]{6}$/.test(value)
    ) {
      error = "Pincode must be 6 digits";
    }

    if (
      [
        "primaryContactNumber",
        "alternateContactNumber",
        "companyPhone",
      ].includes(name) &&
      value.length === 10 &&
      !/^[0-9]{10}$/.test(value)
    ) {
      error = "Contact number must be 10 digits";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));

    setFormData((prev) => ({
      ...prev,
      [name]: name === "panNumber" ? value.toUpperCase() : value,
    }));
  };

  const handleVendorTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as VendorOnboardingData["vendorType"];
    setFormData((p) => ({ ...p, vendorType: v }));
  };

  const handleCheckboxChange = (which: "billing" | "shipping") => {
    if (which === "billing") {
      const next = !isSameAsAddress;
      setIsSameAsAddress(next);
      if (next) {
        setFormData((p) => ({
          ...p,
          billingAddressLine1: p.addressLine1,
          billingAddressLine2: p.addressLine2,
          billingCity: p.city,
          billingState: p.state,
          billingPincode: p.pincode,
        }));
      } else {
        setFormData((p) => ({
          ...p,
          billingAddressLine1: "",
          billingAddressLine2: "",
          billingCity: "",
          billingState: "",
          billingPincode: "",
        }));
      }
    } else {
      const next = !isSameAsBilling;
      setIsSameAsBilling(next);
      if (next) {
        setFormData((p) => ({
          ...p,
          shippingAddressLine1: p.billingAddressLine1,
          shippingAddressLine2: p.billingAddressLine2,
          shippingCity: p.billingCity,
          shippingState: p.billingState,
          shippingPincode: p.billingPincode,
        }));
      } else {
        setFormData((p) => ({
          ...p,
          shippingAddressLine1: "",
          shippingAddressLine2: "",
          shippingCity: "",
          shippingState: "",
          shippingPincode: "",
        }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return alert("Not logged in");

    const form = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (v instanceof File) form.append(k, v);
      else if (v !== null) form.append(k, String(v));
    });

    const res = await api.post("/vendor/onboard", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (!res.data.success) {
      alert(res.data.message);
      return;
    }

    alert("Onboarding submitted successfully");
    navigate("/vendor/dashboard");
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      {/* Header Section */}
      <div className="mb-10 text-left ">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Complete Your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#852BAF] to-[#FC3F78]">
            Onboarding
          </span>
        </h1>
        <p className="text-gray-500 mt-2 font-medium">
          Verify your business details to start selling.
        </p>
      </div>

      {/* alerts */}
      {loadingStatus && (
        <div className="p-4 mb-6 text-sm text-blue-800 bg-blue-100 rounded-lg">
          Checking onboarding status...
        </div>
      )}

      {vendorStatus === "sent_for_approval" && (
        <div className="p-6 mb-6 text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-xl">
          <h3 className="text-lg font-semibold">Application Under Review</h3>
          <p className="mt-2">
            Your onboarding application has been submitted and is currently
            being reviewed by the manager.
          </p>
        </div>
      )}

      {vendorStatus === "approved" && (
        <div className="p-6 mb-6 text-green-800 bg-green-100 border border-green-300 rounded-xl">
          <h3 className="text-lg font-semibold">Onboarding Completed</h3>
          <p className="mt-2">
            Your vendor onboarding has already been approved successfully.
          </p>
        </div>
      )}

      {vendorStatus === "rejected" && (
        <div className="p-6 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-xl">
          <h3 className="text-lg font-semibold">Application Rejected</h3>
          <p className="mt-2">
            Your onboarding request was rejected.
            {rejectionReason && (
              <>
                <br />
                <span className="font-medium">Reason:</span> {rejectionReason}
              </>
            )}
          </p>
          <p className="mt-2">Please fix the issue and resubmit the form.</p>
        </div>
      )}

      {!loadingStatus && vendorStatus === null && (
        <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-lg">
          Unable to fetch onboarding status. Please refresh or contact support.
        </div>
      )}

      {!loadingStatus &&
        vendorStatus !== "sent_for_approval" &&
        vendorStatus !== "approved" && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* A. Business Information */}
            <section className="space-y-4">
              <SectionHeader
                icon={FaBuilding}
                title="Business Information & Documents"
                description="Upload only the common mandatory documents."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <FormInput
                  id="companyName"
                  label="Company Name"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="fullName"
                  label="Full Name (as per PAN Card)"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  error={errors.fullName}
                />

                {/* Vendor Type Dropdown */}
                <div className="flex flex-col space-y-1">
                  <label
                    htmlFor="vendorType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Vendor Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vendorType"
                    name="vendorType"
                    value={formData.vendorType}
                    onChange={handleVendorTypeChange}
                    required
                    className="p-3 transition duration-150 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-purple focus:border-brand-purple"
                  >
                    <option value="">Select vendor type</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Trader">Trader</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Service Provider">Service Provider</option>
                  </select>
                </div>

                <FormInput
                  id="gstin"
                  label="GSTIN"
                  value={formData.gstin}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="panNumber"
                  label="PAN Number"
                  value={formData.panNumber}
                  onChange={handleChange}
                  required
                  error={errors.panNumber}
                />
                <FormInput
                  id="ip_address"
                  label="IP Address"
                  value={formData.ip_address}
                  onChange={handleChange}
                />

                {/* File uploads: only the common docs */}
                <FileUploadInput
                  id="gstinFile"
                  label="GST Certificate"
                  file={formData.gstinFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  required
                  description="Upload your GST Registration Certificate (PDF/JPG/PNG)."
                />

                <FileUploadInput
                  id="panFile"
                  label="PAN Card"
                  file={formData.panFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  required
                  description="Upload company PAN (PDF/JPG/PNG)."
                />

                {/* Noc */}
                <FileUploadInput
                  id="nocFile"
                  label="NOC"
                  file={formData.nocFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  required
                  accept=".jpg, .jpeg, .png, .pdf"
                  description="Upload a No objection certificate."
                />

                {/* Trademark File */}
                <FileUploadInput
                  id="rightsAdvisoryFile"
                  label="Trademark Certificate"
                  file={formData.rightsAdvisoryFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  required
                  accept=".jpg, .jpeg, .png, .pdf"
                  description="Trademark."
                />

                {/* Signatory ID */}
                <FileUploadInput
                  id="signatoryIdFile"
                  label="Authorized Signatory ID Proof"
                  file={formData.signatoryIdFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  accept=".jpg, .jpeg, .png, .pdf"
                  description="Upload Aadhaar or PAN of authorized signatory."
                />

                {/* Business profile */}
                <FileUploadInput
                  id="businessProfileFile"
                  label="Business Profile"
                  file={formData.businessProfileFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  accept=".pdf, .doc, .docx"
                  description="Upload your Business Profile (PDF or DOC)."
                />

                {/* Brand logo - required for Manufacturer and Trader */}
                <FileUploadInput
                  id="brandLogoFile"
                  label="Brand Logo"
                  file={formData.brandLogoFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  accept=".jpg, .jpeg, .png, .svg"
                  description="Upload brand logo (PNG/JPG/SVG)."
                />

                {/* Bank proof - cancelled cheque or passbook image */}
                <FileUploadInput
                  id="bankProofFile"
                  label="Bank Cancelled Cheque"
                  file={formData.bankProofFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  accept=".jpg, .jpeg, .png, .pdf"
                  description="Upload a Cancelled Cheque with company name and account details."
                />

                {/* Electricity */}
                <FileUploadInput
                  id="electricityBillFile"
                  label="Electricity bill"
                  file={formData.electricityBillFile}
                  onChange={
                    handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                  }
                  accept=".jpg, .jpeg, .png, .pdf"
                  description="Upload Electricity bill."
                />

                {/* Vendor agreement - checkbox + optional upload */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center mb-3 space-x-3">
                    <input
                      type="checkbox"
                      id="agreementAccepted"
                      name="agreementAccepted"
                      checked={formData.agreementAccepted}
                      onChange={handleChange}
                      className="w-4 h-4 border-gray-300 rounded text-brand-purple"
                      style={{ accentColor: "#852BAF" }}
                    />
                    <label
                      htmlFor="agreementAccepted"
                      className="text-sm font-medium text-gray-700"
                    >
                      I accept the Vendor Agreement terms.
                    </label>
                  </div>

                  <FileUploadInput
                    id="vendorAgreementFile"
                    label="Upload Signed Agreement (optional)"
                    file={formData.vendorAgreementFile}
                    onChange={
                      handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                    }
                    accept=".pdf, .jpg, .jpeg, .png"
                    description="If you have a signed agreement, upload it here (optional)."
                  />
                </div>

                {/* Conditional: Manufacturer fields */}
                {formData.vendorType === "Manufacturer" && (
                  <>
                    <div className="flex flex-col space-y-1">
                      <label
                        htmlFor="companyEmail"
                        className="flex items-center text-sm font-medium text-gray-700"
                      >
                        <FaEnvelope
                          className="mr-2 text-brand-purple"
                          style={{ color: "#852BAF" }}
                        />
                        Company Email <span className="text-red-500">*</span>
                      </label>

                      <FormInput
                        type="email"
                        id="companyEmail"
                        label="Company Email"
                        value={formData.companyEmail}
                        onChange={handleChange}
                        placeholder="Enter official company email"
                        required
                        error={errors.companyEmail}
                      />
                    </div>

                    <FormInput
                      id="companyPhone"
                      label="Company Phone"
                      value={formData.companyPhone}
                      onChange={handleChange}
                      type="tel"
                      required
                      placeholder="Enter official company phone"
                    />
                  </>
                )}

                {/* Conditional: Authorization letter (Trader only) */}
                {formData.vendorType === "Trader" && (
                  <FileUploadInput
                    id="authorizationLetterFile"
                    label="Authorization / Dealership Letter"
                    file={formData.authorizationLetterFile}
                    onChange={
                      handleChange as (e: ChangeEvent<HTMLInputElement>) => void
                    }
                    required
                    accept=".pdf, .jpg, .jpeg, .png"
                    description="Traders must upload an authorization/dealership agreement."
                  />
                )}
              </div>
            </section>

            {/* Address Sections */}
            <section className="space-y-4">
              <SectionHeader
                icon={FaAddressBook}
                title="Registered Address"
                description="The official registered address of your business."
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <FormInput
                  id="addressLine1"
                  label="Address Line 1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="addressLine2"
                  label="Address Line 2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                />
                <FormInput
                  id="addressLine3"
                  label="Address Line 3"
                  value={formData.addressLine3}
                  onChange={handleChange}
                />

                <FormInput
                  id="city"
                  label="City"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="state"
                  label="State"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="pincode"
                  label="Pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  error={errors.pincode}
                />
              </div>
            </section>

            {/* Billing Address */}
            <section className="space-y-4">
              <SectionHeader
                icon={FaCreditCard}
                title="Billing Address"
                description="Address for invoices and official correspondence."
              />

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="sameAsAddress"
                  checked={isSameAsAddress}
                  onChange={() => handleCheckboxChange("billing")}
                  className="w-4 h-4 border-gray-300 rounded text-brand-purple focus:ring-brand-purple"
                  style={{ accentColor: "#852BAF" }}
                />
                <label
                  htmlFor="sameAsAddress"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  Same as Registered Address
                </label>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${
                  isSameAsAddress ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <FormInput
                  id="billingAddressLine1"
                  label="Billing Address Line 1"
                  value={formData.billingAddressLine1}
                  onChange={handleChange}
                  required={!isSameAsAddress}
                />
                <FormInput
                  id="billingAddressLine2"
                  label="Billing Address Line 2"
                  value={formData.billingAddressLine2}
                  onChange={handleChange}
                />

                <FormInput
                  id="billingCity"
                  label="Billing City"
                  value={formData.billingCity}
                  onChange={handleChange}
                  required={!isSameAsAddress}
                />
                <FormInput
                  id="billingState"
                  label="Billing State"
                  value={formData.billingState}
                  onChange={handleChange}
                  required={!isSameAsAddress}
                />
                <FormInput
                  id="billingPincode"
                  label="Billing Pincode"
                  value={formData.billingPincode}
                  onChange={handleChange}
                  required={!isSameAsAddress}
                  error={errors.billingPincode}
                />
              </div>
            </section>

            {/* Shipping Address */}
            <section className="space-y-4">
              <SectionHeader
                icon={FaShippingFast}
                title="Shipping Address"
                description="Where products will be picked up from."
              />

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  checked={isSameAsBilling}
                  onChange={() => handleCheckboxChange("shipping")}
                  className="w-4 h-4 border-gray-300 rounded text-brand-pink focus:ring-brand-pink"
                  style={{ accentColor: "#FC3F78" }}
                />
                <label
                  htmlFor="sameAsBilling"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  Same as Billing Address
                </label>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${
                  isSameAsBilling ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <FormInput
                  id="shippingAddressLine1"
                  label="Shipping Address Line 1"
                  value={formData.shippingAddressLine1}
                  onChange={handleChange}
                  required={!isSameAsBilling}
                />
                <FormInput
                  id="shippingAddressLine2"
                  label="Shipping Address Line 2"
                  value={formData.shippingAddressLine2}
                  onChange={handleChange}
                />

                <FormInput
                  id="shippingCity"
                  label="Shipping City"
                  value={formData.shippingCity}
                  onChange={handleChange}
                  required={!isSameAsBilling}
                />
                <FormInput
                  id="shippingState"
                  label="Shipping State"
                  value={formData.shippingState}
                  onChange={handleChange}
                  required={!isSameAsBilling}
                />
                <FormInput
                  id="shippingPincode"
                  label="Shipping Pincode"
                  value={formData.shippingPincode}
                  onChange={handleChange}
                  required={!isSameAsBilling}
                  error={errors.shippingPincode}
                />
              </div>
            </section>

            {/* Bank Details */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100">
              <SectionHeader
                icon={FaUniversity}
                title="Bank Details & Proof"
                description="Account details for receiving payments and required proof."
              />
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <FormInput
                  id="bankName"
                  label="Bank Name"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="accountNumber"
                  label="Account Number"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  type="text"
                  required
                />
                <div className="hidden lg:block" />

                <FormInput
                  id="branch"
                  label="Branch"
                  value={formData.branch}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  id="ifscCode"
                  label="IFSC Code"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  required
                />
              </div>
            </section>

            {/* Contact Details */}
            <section className="space-y-4">
              <SectionHeader
                icon={FaAddressBook}
                title="Registered Address"
                description="Official business location"
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <FormInput
                  id="primaryContactNumber"
                  label="Primary Contact Number"
                  value={formData.primaryContactNumber}
                  onChange={handleChange}
                  type="tel"
                  required
                  error={errors.primaryContactNumber}
                />
                <FormInput
                  id="alternateContactNumber"
                  label="Alternate Contact Number"
                  value={formData.alternateContactNumber}
                  onChange={handleChange}
                  type="tel"
                  error={errors.alternateContactNumber}
                />
                <FormInput
                  id="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  required
                  error={errors.email}
                />
              </div>
            </section>

            {/* Payment Terms */}
            <section className="space-y-4">
              <SectionHeader
                icon={FaFileContract}
                title="Payment & Comments"
                description="Custom terms and vendor notes."
              />

              <div className="flex flex-col space-y-1">
                <label
                  htmlFor="paymentTerms"
                  className="text-sm font-medium text-gray-700"
                >
                  Payment Terms
                </label>

                <select
                  id="paymentTerms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="p-3 transition duration-150 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-purple focus:border-brand-purple"
                >
                  <option value="">Select payment terms</option>
                  <option value="NET 15">NET 15</option>
                  <option value="NET 30">NET 30</option>
                  <option value="NET 45">NET 45</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label
                  htmlFor="comments"
                  className="text-sm font-medium text-gray-700"
                >
                  Comments (Vendor notes)
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  rows={3}
                  value={formData.comments}
                  onChange={
                    handleChange as (
                      e: ChangeEvent<HTMLTextAreaElement>
                    ) => void
                  }
                  placeholder="Add any specific notes or requirements here..."
                  className="p-3 transition duration-150 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-purple focus:border-brand-purple"
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-12 py-4 bg-gradient-to-r from-[#852BAF] to-[#FC3F78] text-white font-bold rounded-2xl shadow-xl shadow-[#852BAF]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-3 text-lg"
              >
                Submit Application
              </button>
            </div>
          </form>
        )}
    </div>
  );
}
