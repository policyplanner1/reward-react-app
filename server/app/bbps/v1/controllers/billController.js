const ekoService = require("../services/eko_service");

/**
 * @typedef {Object} FrontendFetchBillPayload
 * @property {string} operator_id
 * @property {string=} consumer_number
 * @property {string=} mobile_number
 */

/**
 * @typedef {Object} EkoFetchBillError
 * @property {number=} status
 * @property {number=} response_type_id
 * @property {string=} message
 * @property {Record<string, string>=} invalid_params
 */

const pickFirstValue = (sources, keys) => {
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    for (const key of keys) {
      const value = source[key];

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return null;
};

const normalizeFetchBillResponse = (providerResponse, requestPayload) => {
  const root =
    providerResponse && typeof providerResponse === "object"
      ? providerResponse
      : {};
  const levelOneData =
    root.data && typeof root.data === "object" ? root.data : null;
  const levelTwoData =
    levelOneData?.data && typeof levelOneData.data === "object"
      ? levelOneData.data
      : null;
  const bill =
    levelOneData?.bill && typeof levelOneData.bill === "object"
      ? levelOneData.bill
      : null;

  const sources = [levelTwoData, bill, levelOneData, root];

  const customerName = pickFirstValue(sources, [
    "customer_name",
    "customerName",
    "name",
    "consumer_name",
    "biller_name",
  ]);
  const amount = pickFirstValue(sources, [
    "amount",
    "bill_amount",
    "billAmount",
    "due_amount",
    "total_amount",
  ]);
  const dueDate = pickFirstValue(sources, [
    "due_date",
    "dueDate",
    "bill_due_date",
  ]);
  const billNumber = pickFirstValue(sources, [
    "bill_number",
    "billNumber",
    "bill_no",
    "reference_id",
    "referenceId",
  ]);
  const billDate = pickFirstValue(sources, [
    "bill_date",
    "billDate",
    "billing_date",
  ]);

  return {
    customer: {
      consumerNumber:
        requestPayload.consumer_number || requestPayload.utility_acc_no,
      operatorId: requestPayload.operator_id,
      customerName,
    },
    bill: {
      amount,
      dueDate,
      billNumber,
      billDate,
    },
    raw: providerResponse,
  };
};

const extractOperatorRecord = (operatorData) => {
  const candidates = [
    operatorData?.data?.data,
    operatorData?.data,
    operatorData,
  ];

  for (const item of candidates) {
    if (!item) {
      continue;
    }

    if (Array.isArray(item)) {
      if (item.length > 0 && item[0] && typeof item[0] === "object") {
        return item[0];
      }
      continue;
    }

    if (typeof item === "object") {
      return item;
    }
  }

  return null;
};

const isFetchBillSupported = (operatorRecord) => {
  const rawFlag =
    operatorRecord?.fetchBill ??
    operatorRecord?.fetch_bill ??
    operatorRecord?.fetchbill ??
    operatorRecord?.is_fetch_bill ??
    operatorRecord?.supports_fetch_bill;

  if (rawFlag === undefined || rawFlag === null || rawFlag === "") {
    return true;
  }

  const normalized = String(rawFlag).trim().toLowerCase();

  return ["1", "true", "yes", "y"].includes(normalized);
};

const toArray = (value) => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const normalizeParamName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const getFirstFromKeys = (payload, keys) => {
  for (const key of keys) {
    if (hasValue(payload?.[key])) {
      return String(payload[key]).trim();
    }
  }

  return "";
};

const parseInputParams = (operatorRecord) => {
  const rawInputParams =
    operatorRecord?.input_params ??
    operatorRecord?.inputParams ??
    operatorRecord?.operator_input_params ??
    operatorRecord?.params;

  if (!rawInputParams) {
    return [];
  }

  let paramsList = rawInputParams;

  if (typeof paramsList === "string") {
    try {
      paramsList = JSON.parse(paramsList);
    } catch (error) {
      paramsList = [];
    }
  }

  return toArray(paramsList)
    .map((item) => {
      if (!item) {
        return null;
      }

      if (typeof item === "string") {
        return { name: normalizeParamName(item), required: true };
      }

      const name = normalizeParamName(
        item.param_name || item.name || item.key || item.field || item.label,
      );

      if (!name) {
        return null;
      }

      const rawRequired =
        item.is_mandatory ??
        item.mandatory ??
        item.required ??
        item.is_required ??
        item.isRequired;

      const required =
        rawRequired === undefined
          ? true
          : ["1", "true", "yes", "y"].includes(
              String(rawRequired).trim().toLowerCase(),
            );

      return { name, required };
    })
    .filter(Boolean);
};

const getFieldAliases = (name) => {
  const normalized = normalizeParamName(name);

  if (normalized === "utility_acc_no") {
    return ["utility_acc_no", "consumer_number", "consumerNumber"];
  }

  if (normalized === "confirmation_mobile_no") {
    return [
      "confirmation_mobile_no",
      "mobile_number",
      "mobileNo",
      "mobile_no",
      "mobile",
    ];
  }

  return [name];
};

/**
 * Converts frontend payload into EKO payload using operator input parameters.
 * @param {FrontendFetchBillPayload & Record<string, any>} requestBody
 * @param {Record<string, any>} operatorRecord
 */
const normalizeFetchBillRequest = (requestBody, operatorRecord) => {
  const normalizedOperatorId = String(requestBody?.operator_id || "").trim();
  const inputParams = parseInputParams(operatorRecord);
  const requiredParams = inputParams.filter((param) => param.required);

  const providerPayload = {
    operator_id: normalizedOperatorId,
  };

  for (const param of requiredParams) {
    const value = getFirstFromKeys(requestBody, getFieldAliases(param.name));

    if (value) {
      providerPayload[param.name] = value;
    }
  }

  Object.entries(requestBody || {}).forEach(([key, value]) => {
    if (!hasValue(value) || key === "operator_id") {
      return;
    }

    if (providerPayload[key] === undefined) {
      providerPayload[key] = String(value).trim();
    }
  });

  if (!providerPayload.utility_acc_no) {
    const accountNo = getFirstFromKeys(requestBody, [
      "utility_acc_no",
      "consumer_number",
      "consumerNumber",
    ]);

    if (accountNo) {
      providerPayload.utility_acc_no = accountNo;
    }
  }

  if (!providerPayload.confirmation_mobile_no) {
    const mobileNo = getFirstFromKeys(requestBody, [
      "confirmation_mobile_no",
      "mobile_number",
      "mobileNo",
      "mobile_no",
      "mobile",
    ]);

    if (mobileNo) {
      providerPayload.confirmation_mobile_no = mobileNo;
    }
  }

  const missingRequired = requiredParams
    .map((param) => param.name)
    .filter((name) => !hasValue(providerPayload[name]));

  if (!hasValue(providerPayload.utility_acc_no)) {
    missingRequired.push("utility_acc_no");
  }

  return {
    providerPayload,
    inputParams,
    missingRequired: Array.from(new Set(missingRequired)),
    frontendPayload: {
      operator_id: normalizedOperatorId,
      consumer_number: providerPayload.utility_acc_no || "",
      mobile_number: providerPayload.confirmation_mobile_no || "",
    },
  };
};

/**
 * @param {EkoFetchBillError | Record<string, any>} providerResponse
 */
const isProviderValidationError = (providerResponse) => {
  if (!providerResponse || typeof providerResponse !== "object") {
    return false;
  }

  return (
    providerResponse.response_type_id === -1 ||
    providerResponse.status === 97 ||
    Boolean(providerResponse.invalid_params) ||
    /no key for response/i.test(String(providerResponse.message || ""))
  );
};

const hasProviderBillData = (providerResponse) => {
  const root =
    providerResponse && typeof providerResponse === "object"
      ? providerResponse
      : {};
  const levelOneData =
    root.data && typeof root.data === "object" ? root.data : null;
  const levelTwoData =
    levelOneData?.data && typeof levelOneData.data === "object"
      ? levelOneData.data
      : null;
  const bill =
    levelOneData?.bill && typeof levelOneData.bill === "object"
      ? levelOneData.bill
      : null;

  const sources = [levelTwoData, bill, levelOneData, root];
  const billKeys = [
    "customer_name",
    "consumer_name",
    "name",
    "amount",
    "bill_amount",
    "due_date",
    "bill_due_date",
    "bill_number",
    "bill_no",
    "reference_id",
  ];

  return sources.some((source) =>
    source && typeof source === "object"
      ? billKeys.some((key) => hasValue(source[key]))
      : false,
  );
};

class BillController {
  constructor() {
    this.fetchBill = this.fetchBill.bind(this);
    this.checkCustomerNumber = this.checkCustomerNumber.bind(this);
  }

  async getFetchBillReadiness(req, res) {
    try {
      const { operator_id } = req.query;
      const data = await ekoService.getFetchBillReadiness(req, operator_id);

      return res.status(200).json({
        success: true,
        message: "BBPS fetch bill readiness fetched successfully",
        data,
      });
    } catch (error) {
      console.error("[BBPS][fetch-bill][readiness] error", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch BBPS readiness",
      });
    }
  }

  async getCategories(req, res) {
    try {
      const data = await ekoService.getCategories();
      res.json(data);
    } catch (e) {
      console.error("EKO ERROR:", e.response?.data || e.message);
      if (e.response?.status === 500) {
        return res.status(503).json({
          success: false,
          message: "Service temporarily unavailable. Please try again.",
        });
      }
    }
  }

  async getOperators(req, res) {
    try {
      const { category_id } = req.query;

      const data = await ekoService.getOperators(category_id);

      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // Get Grouped operators
  async getGroupedOperators(req, res) {
    try {
      const { category_id, search } = req.query;

      if (!category_id) {
        return res.status(400).json({
          success: false,
          message: "category_id is required",
        });
      }

      const data = await ekoService.getOperatorsGrouped(category_id, search);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("EKO ERROR:", error.response?.data || error.message);

      res.status(500).json({
        success: false,
        message: "Failed to fetch grouped operators",
        error: error.message,
      });
    }
  }

  async getOperatorDetails(req, res) {
    try {
      const data = await ekoService.getOperatorDetails(req.params.id);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async checkCustomerNumber(req, res) {
    try {
      const operatorId = String(req.body?.operator_id || "").trim();

      if (!operatorId) {
        return res.status(400).json({
          success: false,
          message: "operator_id is required",
        });
      }

      const operatorData = await ekoService.getOperatorDetails(operatorId);
      const operatorRecord = extractOperatorRecord(operatorData);

      console.info("[BBPS][check-customer-number][operator-details]", {
        operator_id: operatorId,
        hasData: Boolean(operatorData),
        hasOperatorRecord: Boolean(operatorRecord),
        fetchBillFlag:
          operatorRecord?.fetchBill ??
          operatorRecord?.fetch_bill ??
          operatorRecord?.fetchbill ??
          operatorRecord?.is_fetch_bill ??
          operatorRecord?.supports_fetch_bill ??
          null,
      });

      if (!operatorRecord) {
        return res.status(400).json({
          success: false,
          message: "Invalid operator_id or operator not found",
        });
      }

      if (!isFetchBillSupported(operatorRecord)) {
        return res.status(400).json({
          success: false,
          message: "Fetch bill is not supported for this operator",
        });
      }

      req.bbpsOperatorRecord = operatorRecord;

      return this.fetchBill(req, res);
    } catch (error) {
      console.error("[BBPS][check-customer-number] error", {
        message: error.message,
        statusCode: error.response?.status || 500,
        provider: error.response?.data || null,
      });

      return res.status(500).json({
        success: false,
        message: "Failed to validate operator for fetch bill",
      });
    }
  }

  async fetchBill(req, res) {
    try {
      const { operator_id } = req.body || {};
      const userId = req.user?.user_id;
      // const userId = 1;
      const operatorId = String(operator_id || "").trim();

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      if (!operatorId) {
        return res.status(400).json({
          success: false,
          message: "operator_id is required",
        });
      }

      let operatorRecord = req.bbpsOperatorRecord || null;

      if (!operatorRecord) {
        const operatorData = await ekoService.getOperatorDetails(operatorId);
        operatorRecord = extractOperatorRecord(operatorData);
      }

      if (!operatorRecord) {
        return res.status(400).json({
          success: false,
          message: "Invalid operator_id or operator not found",
        });
      }

      if (!isFetchBillSupported(operatorRecord)) {
        return res.status(400).json({
          success: false,
          message: "Fetch bill is not supported for this operator",
        });
      }

      const normalizedRequest = normalizeFetchBillRequest(
        req.body || {},
        operatorRecord,
      );

      if (normalizedRequest.missingRequired.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields for selected operator",
          data: {
            missing: normalizedRequest.missingRequired,
            expected: normalizedRequest.inputParams.map((param) => ({
              name: param.name,
              required: param.required,
            })),
          },
        });
      }

      console.info("[BBPS][fetch-bill] request", {
        operator_id: operatorId,
        frontendPayload: normalizedRequest.frontendPayload,
        providerPayload: normalizedRequest.providerPayload,
        operatorInputParams: normalizedRequest.inputParams,
        user_id: userId,
      });

      const data = await ekoService.fetchBill(
        normalizedRequest.providerPayload,
        req,
      );

      console.info("[BBPS][fetch-bill] provider-response", {
        operator_id: operatorId,
        response: data,
      });

      if (isProviderValidationError(data)) {
        const providerMessage = /no key for response/i.test(
          String(data?.message || ""),
        )
          ? "Provider returned an invalid fetch bill response. Please verify operator input mapping and EKO configuration."
          : data?.message || "Provider validation failed";

        return res.status(400).json({
          success: false,
          message: providerMessage,
          data,
        });
      }

      if (!hasProviderBillData(data)) {
        return res.status(502).json({
          success: false,
          message:
            "Provider response did not contain bill data. Please verify operator required fields and EKO mapping.",
          data,
        });
      }

      const normalized = normalizeFetchBillResponse(data, {
        operator_id: operatorId,
        consumer_number: normalizedRequest.frontendPayload.consumer_number,
        utility_acc_no: normalizedRequest.providerPayload.utility_acc_no,
      });

      return res.status(200).json({
        success: true,
        message: "Bill details fetched successfully",
        data: normalized,
      });
    } catch (e) {
      const statusCode = e.statusCode || e.response?.status || 500;
      const safeDetails =
        e.details && typeof e.details === "object" ? e.details : undefined;
      const message =
        statusCode === 403
          ? "Provider access is forbidden. Please verify BBPS credentials and allowlist settings."
          : e.message || "Failed to fetch bill details";

      console.error("[BBPS][fetch-bill] error", {
        statusCode,
        message,
        provider: safeDetails || e.response?.data || e.response?.status,
      });

      return res.status(statusCode).json({
        success: false,
        message,
        ...(safeDetails ? { data: safeDetails } : {}),
      });
    }
  }
}

module.exports = new BillController();
