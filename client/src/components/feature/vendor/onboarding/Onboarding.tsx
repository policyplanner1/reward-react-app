// ...existing code...
import { useState, ChangeEvent, FormEvent, useEffect, ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaBuilding,
  FaAddressBook,
  FaCreditCard,
  FaShippingFast,
  FaUniversity,
  FaPhoneAlt,
  FaFileContract,
  FaFileUpload,
  FaEnvelope,
} from "react-icons/fa";

import { API_BASE_URL } from "@/config/api";

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

function SectionHeader({ icon: Icon, title, description }: { icon: IconComp; title: string; description?: string; }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="p-3 text-white rounded-md" style={{ background: "linear-gradient(to right, #852BAF, #FC3F78)" }}>
        <Icon />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

function FormInput(props: {
  id: string;
  label: string;
  value?: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const { id, label, value = "", onChange, type = "text", required, placeholder, error } = props;
  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        className="p-3 transition duration-150 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-purple focus:border-brand-purple"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
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
    <div className="flex flex-col space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type="file"
        accept={accept}
        onChange={onChange as (e: ChangeEvent<HTMLInputElement>) => void}
        className="text-sm"
      />
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {file && <p className="text-xs text-gray-600">Selected: {file.name}</p>}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function Onboarding() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] =
    useState<VendorOnboardingData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [vendorStatus, setVendorStatus] = useState<
    "pending" | "sent_for_approval" | "approved" | "rejected" | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // NEW local UI checkbox states & handlers
  const [isSameAsAddress, setIsSameAsAddress] = useState(false);
  const [isSameAsBilling, setIsSameAsBilling] = useState(false);

  /* ================= FETCH STATUS ================= */

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/vendor/my-details`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVendorStatus(data.vendor.status);
          setRejectionReason(data.vendor.rejection_reason || "");
        }
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  /* ================= HANDLERS ================= */

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked, files } = target;

    if (type === "file") {
      setFormData((p) => ({ ...p, [name]: files?.[0] || null }));
      return;
    }

    if (type === "checkbox") {
      setFormData((p) => ({ ...p, [name]: checked }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
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

    const token = localStorage.getItem("token");
    if (!token) return alert("Not logged in");

    const form = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (v instanceof File) form.append(k, v);
      else if (v !== null) form.append(k, String(v));
    });

    const res = await fetch(`${API_BASE_URL}/vendor/onboard`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();
    if (!data.success) return alert(data.message);

    alert("Onboarding submitted successfully");
    navigate("/vendor/dashboard");
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 bg-white rounded-xl shadow-xl">
      <h1 className="mb-6 text-3xl font-bold">Vendor Onboarding</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    required
                    description="Upload your GST Registration Certificate (PDF/JPG/PNG)."
                  />

                  <FileUploadInput
                    id="panFile"
                    label="PAN Card"
                    file={formData.panFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    required
                    description="Upload company PAN (PDF/JPG/PNG)."
                  />

                  {/* Noc */}
                  <FileUploadInput
                    id="nocFile"
                    label="NOC"
                    file={formData.nocFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    required
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Upload a No objection certificate."
                  />

                  {/* Trademark File */}
                  <FileUploadInput
                    id="rightsAdvisoryFile"
                    label="Trademark Certificate"
                    file={formData.rightsAdvisoryFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    required
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Trademark."
                  />

                  {/* Signatory ID */}
                  <FileUploadInput
                    id="signatoryIdFile"
                    label="Authorized Signatory ID Proof"
                    file={formData.signatoryIdFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Upload Aadhaar or PAN of authorized signatory."
                  />

                  {/* Business profile */}
                  <FileUploadInput
                    id="businessProfileFile"
                    label="Business Profile"
                    file={formData.businessProfileFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    accept=".pdf, .doc, .docx"
                    description="Upload your Business Profile (PDF or DOC)."
                  />

                  {/* Brand logo - required for Manufacturer and Trader */}
                  <FileUploadInput
                    id="brandLogoFile"
                    label="Brand Logo"
                    file={formData.brandLogoFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    accept=".jpg, .jpeg, .png, .svg"
                    description="Upload brand logo (PNG/JPG/SVG)."
                  />

                  {/* Bank proof - cancelled cheque or passbook image */}
                  <FileUploadInput
                    id="bankProofFile"
                    label="Bank Cancelled Cheque"
                    file={formData.bankProofFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Upload a Cancelled Cheque with company name and account details."
                  />

                  {/* Electricity */}
                  <FileUploadInput
                    id="electricityBillFile"
                    label="Electricity bill"
                    file={formData.electricityBillFile}
                    onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
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
                      onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
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
                      onChange={handleChange as (e: ChangeEvent<HTMLInputElement>) => void}
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
              <section className="space-y-4">
                <SectionHeader
                  icon={FaUniversity}
                  title="Bank Details & Proof"
                  description="Account details for receiving payments and required proof."
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                  icon={FaPhoneAlt}
                  title="Contact Details"
                  description="Primary and secondary contact information."
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
              <div className="pt-4 border-t">
                <button
                  type="submit"
                  disabled={Object.values(errors).some(Boolean)}
                  className="w-full px-6 py-3 text-lg font-semibold text-white transition duration-300 rounded-full  md:w-auto hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  style={{
                    background: "linear-gradient(to right, #852BAF, #FC3F78)",
                  }}
                >
                  Submit Onboarding Application
                </button>
              </div>
      </form>
    </div>
  );
}
