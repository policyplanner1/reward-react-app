import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaBuilding,
  FaAddressBook,
  FaCreditCard,
  FaShippingFast,
  FaUniversity,
  FaPhoneAlt,
  FaFileContract,
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaSpinner,
  FaCommentAlt,
  FaEye,
  FaFilePdf,
} from "react-icons/fa";

/* ================= CONFIG ================= */

const API_BASE: string = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */

const resolveImageUrl = (path: string): string =>
  path.startsWith("http") ? path : `${API_BASE}/uploads/${path}`;

const downloadFile = (url: string, filename?: string): void => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? url.split("/").pop() ?? "file";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* ================= BACKEND TYPES ================= */

interface BackendVendor {
  company_name: string;
  full_name: string;
  vendor_type: string;
  gstin: string;
  pan_number: string;
  ipaddress?: string;
  email?: string;
}

interface BackendAddress {
  type: "business" | "billing" | "shipping";
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface BackendBank {
  bank_name?: string;
  account_number?: string;
  branch?: string;
  ifsc_code?: string;
}

interface BackendContacts {
  email?: string;
  primary_contact?: string;
  alternate_contact?: string;
  payment_terms?: string;
  comments?: string;
}

interface BackendDocument {
  document_key: string;
  document_type: string;
  file_path: string;
  mime_type?: string;
}

interface BackendVendorData {
  vendor: BackendVendor;
  addresses: BackendAddress[];
  bank: BackendBank;
  contacts: BackendContacts;
  documents: BackendDocument[];
}

/* ================= FRONTEND MODEL ================= */

interface VendorOnboardingData {
  companyName: string;
  fullName: string;
  vendorType: string;
  gstin: string;
  panNumber: string;
  ipaddress: string;

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

  email: string;
  primaryContactNumber: string;
  alternateContactNumber: string;

  paymentTerms: string;
  comments: string;
}

/* ================= DOCUMENT CONFIG ================= */

const DOCUMENT_CONFIG: Record<string, { label: string }> = {
  gstinFile: { label: "GST Document" },
  panFile: { label: "PAN Card" },
  bankProofFile: { label: "Bank Cancelled Cheque" },
  signatoryIdFile: { label: "Authorized Signatory ID Proof" },
  businessProfileFile: { label: "Business Profile" },
  brandLogoFile: { label: "Brand Logo" },
  nocFile: { label: "NOC" },
  electricityBillFile: { label: "Electricity Bill" },
  rightsAdvisoryFile: { label: "Advisory / Disclaimer" },
  signedAgreementFile: { label: "Signed Agreement (Optional)" },
};

/* ================= DATA MAPPERS ================= */

const restructureData = (
  data: BackendVendorData
): VendorOnboardingData => {
  const { vendor, addresses, bank, contacts } = data;

  const getAddress = (type: BackendAddress["type"], key: keyof BackendAddress) =>
    addresses.find((a) => a.type === type)?.[key] ?? "";

  return {
    companyName: vendor.company_name,
    fullName: vendor.full_name,
    vendorType: vendor.vendor_type,
    gstin: vendor.gstin,
    panNumber: vendor.pan_number,
    ipaddress: vendor.ipaddress ?? "N/A",

    addressLine1: getAddress("business", "line1"),
    addressLine2: getAddress("business", "line2"),
    addressLine3: getAddress("business", "line3"),
    city: getAddress("business", "city"),
    state: getAddress("business", "state"),
    pincode: getAddress("business", "pincode"),

    billingAddressLine1: getAddress("billing", "line1"),
    billingAddressLine2: getAddress("billing", "line2"),
    billingCity: getAddress("billing", "city"),
    billingState: getAddress("billing", "state"),
    billingPincode: getAddress("billing", "pincode"),

    shippingAddressLine1: getAddress("shipping", "line1"),
    shippingAddressLine2: getAddress("shipping", "line2"),
    shippingCity: getAddress("shipping", "city"),
    shippingState: getAddress("shipping", "state"),
    shippingPincode: getAddress("shipping", "pincode"),

    bankName: bank.bank_name ?? "",
    accountNumber: bank.account_number ?? "",
    branch: bank.branch ?? "",
    ifscCode: bank.ifsc_code ?? "",

    email: contacts.email ?? vendor.email ?? "",
    primaryContactNumber: contacts.primary_contact ?? "",
    alternateContactNumber: contacts.alternate_contact ?? "",

    paymentTerms: contacts.payment_terms ?? "",
    comments: contacts.comments ?? "",
  };
};

const mapDocumentsByKey = (
  documents: BackendDocument[]
): Record<string, BackendDocument> => {
  const map: Record<string, BackendDocument> = {};
  documents.forEach((doc) => {
    map[doc.document_key] = doc;
  });
  return map;
};

/* ================= UI COMPONENTS ================= */

const ReviewField = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="p-4 bg-white border shadow-sm rounded-xl">
    <label className="text-sm text-gray-500">{label}</label>
    <div className="font-semibold text-gray-900">{value || "N/A"}</div>
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex items-center pb-3 mb-6 space-x-3 border-b">
    <Icon className="text-3xl text-[#852BAF]" />
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

/* ================= MAIN ================= */

const VendorApprovalForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get("vendor_id");
  const navigate = useNavigate();

  const [formData, setFormData] = useState<VendorOnboardingData | null>(null);
  const [documentMap, setDocumentMap] = useState<
    Record<string, BackendDocument>
  >({});
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      setError("Vendor ID missing");
      setLoading(false);
      return;
    }

    const fetchVendor = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication missing");

        const res = await fetch(`${API_BASE}/api/vendor/${vendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load vendor");

        const json: { data: BackendVendorData } = await res.json();
        setFormData(restructureData(json.data));
        setDocumentMap(mapDocumentsByKey(json.data.documents));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [vendorId]);

  const handleFinalDecision = async (
    status: "approved" | "rejected"
  ): Promise<void> => {
    if (status === "rejected" && !rejectionReason.trim()) {
      alert("Rejection reason required");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/vendor/status/${vendorId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            rejectionReason:
              status === "rejected" ? rejectionReason : null,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update status");

      alert(`Vendor ${status} successfully`);
      navigate("/manager/vendors");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="mr-2 animate-spin" />
        Loading vendor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-red-600 border rounded bg-red-50">
        {error}
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="p-8 bg-[#F9F9FB] min-h-screen">
      <div className="p-8 mx-auto bg-white shadow-2xl max-w-7xl rounded-3xl">
        <h1 className="mb-6 text-3xl font-bold">
          Vendor Review: {formData.companyName}
        </h1>

        <SectionHeader
          icon={FaBuilding}
          title="Business Information"
          description="Core vendor details"
        />

        <div className="grid gap-6 md:grid-cols-3">
          <ReviewField label="Company Name" value={formData.companyName} />
          <ReviewField label="Vendor Type" value={formData.vendorType} />
          <ReviewField label="GSTIN" value={formData.gstin} />
        </div>

        <div className="flex justify-end gap-4 mt-10">
          <button
            onClick={() => handleFinalDecision("rejected")}
            disabled={isSubmitting}
            className="px-8 py-3 text-red-600 border border-red-500 rounded-full"
          >
            <FaTimesCircle className="inline mr-2" />
            Reject
          </button>

          <button
            onClick={() => handleFinalDecision("approved")}
            disabled={isSubmitting}
            className="px-8 py-3 text-white bg-green-600 rounded-full"
          >
            <FaCheckCircle className="inline mr-2" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorApprovalForm;
