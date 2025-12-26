"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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

const API_BASE_URL = "http://localhost:5000/api";

// 1. Define the structure for the form data (cleaned to include only requested docs + conditional fields)
interface VendorOnboardingData {
  // A. Business Information
  companyName: string;
  fullName: string; // As per PAN Card
  vendorType:
    | "Manufacturer"
    | "Trader"
    | "Distributor"
    | "Service Provider"
    | "";
  gstin: string;
  panNumber: string;
  ip_address: string;

  // Documents (common)
  gstinFile: File | null; // GST certificate
  panFile: File | null; // PAN card
  bankProofFile: File | null; // Cancelled cheque / passbook image
  signatoryIdFile: File | null; // Authorized signatory ID proof (Aadhaar/PAN)
  businessProfileFile: File | null; // Business profile (PDF/doc)
  vendorAgreementFile: File | null; // Optional: signed agreement (we'll also include checkbox)
  brandLogoFile: File | null; // Brand logo (PNG/JPG)
  authorizationLetterFile: File | null; // Conditional: for Trader only
  electricityBillFile: File | null;
  rightsAdvisoryFile: File | null;
  nocFile: File | null;

  // A boolean for agreement acceptance
  agreementAccepted: boolean;

  // Manufacturer-specific contact (conditional)
  companyEmail: string;
  companyPhone: string;

  // Address Details
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  pincode: string;

  // Billing Address
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPincode: string;

  // Shipping Address
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;

  // Bank Details (kept as text for simplicity)
  bankName: string;
  accountNumber: string;
  branch: string;
  ifscCode: string;

  // Contact Details
  primaryContactNumber: string;
  email: string;
  alternateContactNumber: string;

  // Payment Terms & Comments
  paymentTerms: string;
  comments: string;
}

// 2. Initial state for the form
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
  nocFile: null,
  rightsAdvisoryFile: null,
  electricityBillFile: null,

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

// --- Reusable Form Input Component ---
interface FormInputProps {
  id: keyof VendorOnboardingData;
  label: string;
  type?: "text" | "number" | "email" | "tel";
  value: string | number | boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const validators = {
  fullName: (value: string) => /^[A-Za-z ]+$/.test(value),

  panNumber: (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value),

  pincode: (value: string) => /^[0-9]{6}$/.test(value),

  phone: (value: string) => /^[0-9]{10}$/.test(value),

  state: (value: string) => /^[A-Za-z ]+$/.test(value),

  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
};

const allowOnlyAlphabets = (value: string) => /^[A-Za-z ]*$/.test(value);

const allowOnlyNumbers = (value: string) => /^[0-9]*$/.test(value);

const panValidator = (value: string) => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
};

const FormInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
}: FormInputProps) => (
  <div className="flex flex-col space-y-1">
    <label htmlFor={id as string} className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <input
      type={type}
      id={id as string}
      name={id as string}
      value={value as string}
      onChange={onChange}
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      required={required}
      className={`p-3 transition duration-150 border rounded-lg focus:ring-1 focus:ring-brand-purple
        ${error ? "border-red-500" : "border-gray-300"}
      `}
    />

    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// --- Reusable File Upload Component ---
interface FileUploadInputProps {
  id: keyof VendorOnboardingData;
  label: string;
  file: File | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  accept?: string;
  description?: string;
}

const FileUploadInput = ({
  id,
  label,
  file,
  onChange,
  required = false,
  accept = ".jpg, .jpeg, .png, .pdf",
  description = "",
}: FileUploadInputProps) => {
  const fileText = file ? file.name : "No file selected";

  return (
    <div className="flex flex-col col-span-1 space-y-1">
      <label
        htmlFor={id as string}
        className="flex items-center text-sm font-medium text-gray-700"
      >
        <FaFileUpload
          className="mr-2 text-brand-purple"
          style={{ color: "#852BAF" }}
        />
        Upload {label}{" "}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description ? (
        <p className="mb-1 text-xs text-gray-500">{description}</p>
      ) : null}
      <div className="flex items-center p-3 space-x-2 transition duration-150 border border-gray-400 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100">
        <span
          className={`flex-1 text-sm truncate ${
            file ? "text-gray-900" : "text-gray-500"
          }`}
        >
          {fileText}
        </span>
        <label
          htmlFor={id as string}
          className="px-3 py-1 text-xs font-medium text-white transition duration-150 rounded-full cursor-pointer bg-brand-purple hover:opacity-90"
          style={{ backgroundColor: "#852BAF" }}
        >
          Choose File
        </label>
        <input
          type="file"
          id={id as string}
          name={id as string}
          onChange={onChange}
          required={required}
          accept={accept}
          className="hidden"
        />
      </div>
      <p className="text-xs text-gray-400">Accepted formats: {accept}</p>
    </div>
  );
};

// --- Reusable Section Header ---
const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="flex items-center pb-2 mb-4 space-x-3 border-b">
    <Icon className="text-2xl" style={{ color: "#852BAF" }} />
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    <p className="hidden text-sm text-gray-500 md:block">{description}</p>
  </div>
);

// --- MAIN COMPONENT ---
export default function Onboarding() {
  const router = useRouter();
  const [formData, setFormData] =
    useState<VendorOnboardingData>(initialFormData);
  const [isSameAsAddress, setIsSameAsAddress] = useState(true);
  const [isSameAsBilling, setIsSameAsBilling] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendorStatus, setVendorStatus] = useState<
    "pending" | "sent_for_approval" | "approved" | "rejected" | null
  >(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Generic change handler (handles text/select/file/checkbox)
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    // FILE HANDLING (unchanged)
    if (type === "file") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setFormData((prev) => ({ ...prev, [name]: file }));
      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    /* ================= HARD BLOCK ================= */
    const alphabetOnlyFields = [
      "companyName",
      "fullName",
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

    // Bank Number
    const bankNumberFields = ["accountNumber"];

    if (bankNumberFields.includes(name)) {
      if (!allowOnlyNumbers(value)) return;
    }

    // Contact number
    const contactNumberFields = [
      "primaryContactNumber",
      "alternateContactNumber",
    ];

    if (contactNumberFields.includes(name)) {
      // numbers only
      if (!allowOnlyNumbers(value)) return;

      // restrict to 10 digits
      if (value.length > 10) return;
    }
    // pin code validation
    const pincodeFields = ["pincode", "billingPincode", "shippingPincode"];

    if (pincodeFields.includes(name)) {
      if (!allowOnlyNumbers(value)) return;

      if (value.length > 6) return;
    }

    // pan
    /* ================= HARD BLOCK: PAN ================= */

    if (name === "panNumber") {
      // allow only alphabets & numbers
      if (!/^[A-Za-z0-9]*$/.test(value)) return;

      // restrict length to 10
      if (value.length > 10) return;
    }

    /* ================= SOFT VALIDATION ================= */

    let error = "";

    switch (name) {
      case "fullName":
        if (value && !validators.fullName(value)) {
          error = "Full name should contain alphabets only";
        }
        break;

      case "panNumber":
        if (value && !panValidator(value.toUpperCase())) {
          error = "PAN must be in format ABCDE1234F";
        }
        break;

      case "pincode":
      case "billingPincode":
      case "shippingPincode":
        if (value && !validators.pincode(value)) {
          error = "Pincode must be 6 digits";
        }
        break;

      case "primaryContactNumber":
      case "alternateContactNumber":
      case "companyPhone":
        if (value && !validators.phone(value)) {
          error = "Contact number must be 10 digits";
        }
        break;

      case "email":
      case "companyEmail":
        if (value && !validators.email(value)) {
          error = "Enter a valid email address";
        }
        break;

      case "state":
      case "billingState":
      case "shippingState":
        if (value && !validators.state(value)) {
          error = "State should contain alphabets only";
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));

    setFormData((prev) => ({
      ...prev,
      [name]: name === "panNumber" ? value.toUpperCase() : value,
    }));
  };

  const handleVendorTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as VendorOnboardingData["vendorType"];
    setFormData((prev) => ({
      ...prev,
      vendorType: value,
      // reset conditional fields when switching type
      authorizationLetterFile:
        value === "Trader" ? prev.authorizationLetterFile : null,
      companyEmail: value === "Manufacturer" ? prev.companyEmail : "",
      companyPhone: value === "Manufacturer" ? prev.companyPhone : "",
    }));
  };

  const handleCheckboxChange = (type: "billing" | "shipping") => {
    if (type === "billing") {
      const newState = !isSameAsAddress;
      setIsSameAsAddress(newState);
      if (newState) {
        setFormData((prev) => ({
          ...prev,
          billingAddressLine1: prev.addressLine1,
          billingAddressLine2: prev.addressLine2,
          billingCity: prev.city,
          billingState: prev.state,
          billingPincode: prev.pincode,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          billingAddressLine1: "",
          billingAddressLine2: "",
          billingCity: "",
          billingState: "",
          billingPincode: "",
        }));
      }
    } else if (type === "shipping") {
      const newState = !isSameAsBilling;
      setIsSameAsBilling(newState);
      if (newState) {
        setFormData((prev) => ({
          ...prev,
          shippingAddressLine1: prev.billingAddressLine1,
          shippingAddressLine2: prev.billingAddressLine2,
          shippingCity: prev.billingCity,
          shippingState: prev.billingState,
          shippingPincode: prev.billingPincode,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          shippingAddressLine1: "",
          shippingAddressLine2: "",
          shippingCity: "",
          shippingState: "",
          shippingPincode: "",
        }));
      }
    }
  };

  // fetch vendor Details
  useEffect(() => {
    const fetchVendorStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/vendor/my-details`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setVendorStatus(data.vendor.status);
          setRejectionReason(data.vendor.rejection_reason || "");
        }
      } catch (err) {
        console.error("Failed to fetch vendor status", err);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchVendorStatus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const hasErrors = Object.values(errors).some((error) => error);

    if (hasErrors) {
      alert("Please fix validation errors before submitting the form.");
      return;
    }

    // Validate required fields
    if (
      !formData.companyName ||
      !formData.fullName ||
      !formData.vendorType ||
      !formData.gstin ||
      !formData.panNumber
    ) {
      alert("Please fill all required business information fields.");
      return;
    }

    // Validate required files
    const requiredFilesMissing =
      !formData.gstinFile ||
      !formData.panFile ||
      !formData.nocFile ||
      !formData.rightsAdvisoryFile;
    if (requiredFilesMissing) {
      alert(
        "Please upload all mandatory documents: GST Certificate, PAN Card, NOC and Trademark."
      );
      return;
    }

    // Brand logo is required for Manufacturer and Trader, optional for Service Provider
    if (
      (formData.vendorType === "Manufacturer" ||
        formData.vendorType === "Trader") &&
      !formData.brandLogoFile
    ) {
      alert("Manufacturers and Traders must upload a Brand Logo.");
      return;
    }

    // Vendor agreement - show warning if not accepted and no file uploaded
    if (!formData.agreementAccepted && !formData.vendorAgreementFile) {
      const confirmUpload = confirm(
        'You have not checked "Agreement Accepted" and no signed agreement is uploaded. Do you still want to submit?'
      );
      if (!confirmUpload) return;
    }

    // Trader must upload authorization letter
    if (formData.vendorType === "Trader" && !formData.authorizationLetterFile) {
      alert("Traders must upload an Authorization/Dealership letter.");
      return;
    }

    // Manufacturer must provide company email & phone
    if (
      formData.vendorType === "Manufacturer" &&
      (!formData.companyEmail || !formData.companyPhone)
    ) {
      alert("Manufacturers must provide Company Email and Company Phone.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("You are not logged in!");
      return;
    }

    const form = new FormData();

    // Append text fields (only string/boolean types)
    const textFields: Array<keyof VendorOnboardingData> = [
      "companyName",
      "fullName",
      "vendorType",
      "gstin",
      "panNumber",
      "ip_address",
      "agreementAccepted",
      "companyEmail",
      "companyPhone",
      "addressLine1",
      "addressLine2",
      "addressLine3",
      "city",
      "state",
      "pincode",
      "billingAddressLine1",
      "billingAddressLine2",
      "billingCity",
      "billingState",
      "billingPincode",
      "shippingAddressLine1",
      "shippingAddressLine2",
      "shippingCity",
      "shippingState",
      "shippingPincode",
      "bankName",
      "accountNumber",
      "branch",
      "ifscCode",
      "primaryContactNumber",
      "email",
      "alternateContactNumber",
      "paymentTerms",
      "comments",
    ];

    textFields.forEach((key) => {
      // @ts-ignore - safe cast for appending
      const val = formData[key];
      if (typeof val === "boolean") {
        form.append(String(key), val ? "true" : "false");
      } else if (val !== undefined && val !== null) {
        form.append(String(key), String(val));
      }
    });

    // Append file fields
    const fileFields: Array<keyof VendorOnboardingData> = [
      "gstinFile",
      "panFile",
      "bankProofFile",
      "signatoryIdFile",
      "businessProfileFile",
      "vendorAgreementFile",
      "brandLogoFile",
      "authorizationLetterFile",
      "nocFile",
      "electricityBillFile",
      "rightsAdvisoryFile",
    ];

    fileFields.forEach((field) => {
      const file = formData[field];
      if (file instanceof File) {
        form.append(field as string, file);
      }
    });

    try {
      const response = await fetch(`${API_BASE_URL}/vendor/onboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = await response.json();
      if (!data.success) {
        alert("Failed: " + data.message);
        return;
      }

      alert("Vendor Onboarding Submitted Successfully!");
      router.push("/src/vendor/dashboard");
      // optionally reset or navigate
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Error submitting form");
    }
  };

  return (
    <div className="p-6" style={{ backgroundColor: "#FFFAFB" }}>
      <div className="p-6 bg-white border border-gray-100 shadow-2xl rounded-2xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Vendor Onboarding Form
        </h1>
        <p className="pb-4 mb-6 text-gray-600 border-b">
          Please fill in your complete KYC and business profile details.
        </p>

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
              being reviewed by the manager. Please wait until the process is
              completed.
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
          <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-lg">
            <strong>Application Rejected</strong>
            <p className="mt-1">
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
            Unable to fetch onboarding status. Please refresh or contact
            support.
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
                    onChange={handleChange}
                    required
                    description="Upload your GST Registration Certificate (PDF/JPG/PNG)."
                  />

                  <FileUploadInput
                    id="panFile"
                    label="PAN Card"
                    file={formData.panFile}
                    onChange={handleChange}
                    required
                    description="Upload company PAN (PDF/JPG/PNG)."
                  />

                  {/* Noc */}
                  <FileUploadInput
                    id="nocFile"
                    label="NOC"
                    file={formData.nocFile}
                    onChange={handleChange}
                    required
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Upload a No objection certificate."
                  />

                  {/* Trademark File */}
                  <FileUploadInput
                    id="rightsAdvisoryFile"
                    label="Trademark Certificate"
                    file={formData.rightsAdvisoryFile}
                    onChange={handleChange}
                    required
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Trademark."
                  />

                  {/* Signatory ID */}
                  <FileUploadInput
                    id="signatoryIdFile"
                    label="Authorized Signatory ID Proof"
                    file={formData.signatoryIdFile}
                    onChange={handleChange}
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Upload Aadhaar or PAN of authorized signatory."
                  />

                  {/* Business profile */}
                  <FileUploadInput
                    id="businessProfileFile"
                    label="Business Profile"
                    file={formData.businessProfileFile}
                    onChange={handleChange}
                    accept=".pdf, .doc, .docx"
                    description="Upload your Business Profile (PDF or DOC)."
                  />

                  {/* Brand logo - required for Manufacturer and Trader */}
                  <FileUploadInput
                    id="brandLogoFile"
                    label="Brand Logo"
                    file={formData.brandLogoFile}
                    onChange={handleChange}
                    accept=".jpg, .jpeg, .png, .svg"
                    description="Upload brand logo (PNG/JPG/SVG)."
                  />

                  {/* Bank proof - cancelled cheque or passbook image */}
                  <FileUploadInput
                    id="bankProofFile"
                    label="Bank Cancelled Cheque"
                    file={formData.bankProofFile}
                    onChange={handleChange}
                    accept=".jpg, .jpeg, .png, .pdf"
                    description="Upload a Cancelled Cheque with company name and account details."
                  />

                  {/* Electricity */}
                  <FileUploadInput
                    id="electricityBillFile"
                    label="Electricity bill"
                    file={formData.electricityBillFile}
                    onChange={handleChange}
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
                      onChange={handleChange}
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
                        {/* <input
                      type="email"
                      id="companyEmail"
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleChange}
                      required
                      className="p-3 transition duration-150 border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand-purple focus:border-brand-purple"
                    /> */}

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
                      onChange={handleChange}
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

                  {/* <FileUploadInput 
                  id="bankProofFile" 
                  label="Cancelled Cheque" 
                  file={formData.bankProofFile} 
                  onChange={handleChange} 
                  required
                  description="Upload a Cancelled Cheque with company name and account details."
              /> */}
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
          )}
      </div>
    </div>
  );
}
