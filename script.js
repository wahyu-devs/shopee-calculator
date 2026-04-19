const DEFAULT_FEES = {
  adminRate: 0.0825,
  serviceRate: 0.055,
  processFee: 1250,
};

const elements = {
  form: document.getElementById("calculator-form"),
  amountInput: document.getElementById("bersih"),
  amountField: document.getElementById("amount-field"),
  amountError: document.getElementById("bersih-error"),
  adminInput: document.getElementById("admin-rate"),
  serviceInput: document.getElementById("service-rate"),
  processInput: document.getElementById("process-fee"),
  feeError: document.getElementById("fee-error"),
  feeEditor: document.getElementById("fee-editor"),
  feeToggle: document.getElementById("toggle-fees"),
  adminChip: document.getElementById("admin-chip"),
  serviceChip: document.getElementById("service-chip"),
  processChip: document.getElementById("process-chip"),
  primaryButton: document.getElementById("primary-action"),
  copyStatus: document.getElementById("copy-status"),
  toast: document.getElementById("toast"),
  toastMessage: document.querySelector("#toast .toast-message"),
  toastClose: document.querySelector("#toast .toast-close"),
  output: document.getElementById("output"),
  sellingPrice: document.getElementById("selling-price"),
  adminFee: document.getElementById("admin-fee"),
  serviceFee: document.getElementById("service-fee"),
  processCost: document.getElementById("process-cost"),
  netReceived: document.getElementById("net-received"),
};

let lastResult = null;
let copyResetTimer = 0;
let toastTimer = 0;
let toastHideTimer = 0;
let lastToastMessage = "";

function formatRupiah(value) {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

function formatPercent(rate) {
  return (rate * 100).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });
}

function parseRupiah(value) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : NaN;
}

function parseDecimal(value) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  return normalized ? Number(normalized) : NaN;
}

function formatCurrencyInput(input) {
  const value = input.value.replace(/\D/g, "");
  input.value = value ? Number(value).toLocaleString("id-ID") : "";
}

function setPrimaryMode(canCopy) {
  window.clearTimeout(copyResetTimer);
  elements.primaryButton.dataset.action = canCopy ? "copy" : "calculate";
  elements.primaryButton.textContent = canCopy ? "Salin Harga Jual" : "Hitung Harga Jual";
}

function hideToast() {
  window.clearTimeout(toastTimer);
  window.clearTimeout(toastHideTimer);
  elements.toast.classList.remove("is-visible");

  toastHideTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
    lastToastMessage = "";
  }, 220);
}

function showToast(message, type = "info") {
  if (!message) {
    return;
  }

  window.clearTimeout(toastTimer);
  window.clearTimeout(toastHideTimer);

  if (message !== lastToastMessage || elements.toast.hidden) {
    elements.toastMessage.textContent = message;
  }

  lastToastMessage = message;
  elements.toast.hidden = false;
  elements.toast.className = `toast is-${type}`;
  elements.toast.setAttribute("role", type === "success" ? "status" : "alert");

  window.requestAnimationFrame(() => {
    elements.toast.classList.add("is-visible");
  });

  toastTimer = window.setTimeout(() => {
    hideToast();
  }, 2400);
}

function setAmountError(message, shouldToast = false) {
  const hasError = Boolean(message);
  elements.amountError.textContent = "";
  elements.amountField.classList.toggle("is-invalid", hasError);
  elements.amountInput.setAttribute("aria-invalid", String(hasError));

  if (hasError && shouldToast) {
    showToast(message, "warning");
  }
}

function setFeeError(message, shouldToast = false) {
  elements.feeError.textContent = "";

  if (message && shouldToast) {
    showToast(message, "warning");
  }
}

function setCopyStatus(message, type = "success") {
  elements.copyStatus.textContent = "";

  if (message) {
    showToast(message, type);
  }
}

function updateFeeChips(fees) {
  elements.adminChip.textContent = `${formatPercent(fees.adminRate)}%`;
  elements.serviceChip.textContent = `${formatPercent(fees.serviceRate)}%`;
  elements.processChip.textContent = formatRupiah(fees.processFee);
}

function readFees(showError) {
  const adminPercent = parseDecimal(elements.adminInput.value);
  const servicePercent = parseDecimal(elements.serviceInput.value);
  const processFee = parseRupiah(elements.processInput.value);
  const hasInvalidValue =
    Number.isNaN(adminPercent) ||
    Number.isNaN(servicePercent) ||
    Number.isNaN(processFee) ||
    adminPercent < 0 ||
    servicePercent < 0 ||
    processFee < 0;

  if (hasInvalidValue) {
    if (showError) {
      setFeeError("Format biaya belum valid.", true);
    }
    return null;
  }

  if (adminPercent + servicePercent >= 100) {
    if (showError) {
      setFeeError("Total persen biaya harus di bawah 100%.", true);
    }
    return null;
  }

  const fees = {
    adminRate: adminPercent / 100,
    serviceRate: servicePercent / 100,
    processFee,
  };

  setFeeError("");
  updateFeeChips(fees);
  return fees;
}

function hideResult() {
  lastResult = null;
  elements.output.hidden = true;
  setPrimaryMode(false);
}

function renderResult(result) {
  lastResult = result;
  elements.output.hidden = false;
  elements.sellingPrice.textContent = formatRupiah(result.sellingPrice);
  elements.adminFee.textContent = `-${formatRupiah(result.adminFee)}`;
  elements.serviceFee.textContent = `-${formatRupiah(result.serviceFee)}`;
  elements.processCost.textContent = `-${formatRupiah(result.processFee)}`;
  elements.netReceived.textContent = formatRupiah(result.netReceived);
  setPrimaryMode(true);
}

function calculate(options = {}) {
  const amount = parseRupiah(elements.amountInput.value);
  const fees = readFees(Boolean(options.showFeeError));
  setCopyStatus("");

  if (Number.isNaN(amount) || amount <= 0) {
    hideResult();
    setAmountError(
      options.showAmountError ? "Isi target di atas Rp0." : "",
      Boolean(options.showAmountError),
    );
    return false;
  }

  if (!fees) {
    hideResult();
    setAmountError("");
    return false;
  }

  const sellingPrice = Math.ceil((amount + fees.processFee) / (1 - fees.adminRate - fees.serviceRate) / 100) * 100;
  const adminFee = sellingPrice * fees.adminRate;
  const serviceFee = sellingPrice * fees.serviceRate;
  const netReceived = sellingPrice - adminFee - serviceFee - fees.processFee;

  setAmountError("");
  renderResult({
    sellingPrice,
    adminFee,
    serviceFee,
    processFee: fees.processFee,
    netReceived,
  });

  return true;
}

function copyWithFallback(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Fallback copy failed");
  }
}

async function copySellingPrice() {
  if (!calculate({ showAmountError: true, showFeeError: true })) {
    return;
  }

  const valueToCopy = String(lastResult.sellingPrice);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(valueToCopy);
    } else {
      copyWithFallback(valueToCopy);
    }

    setCopyStatus("Harga jual disalin.", "success");
    elements.primaryButton.textContent = "Tersalin";
    copyResetTimer = window.setTimeout(() => {
      if (lastResult) {
        elements.primaryButton.textContent = "Salin Harga Jual";
      }
    }, 1400);
  } catch (error) {
    setCopyStatus("Gagal menyalin harga.", "error");
  }
}

elements.amountInput.addEventListener("input", () => {
  formatCurrencyInput(elements.amountInput);
  setAmountError("");
  hideResult();
});

elements.processInput.addEventListener("input", () => {
  formatCurrencyInput(elements.processInput);
  setFeeError("");
  readFees(false);
  hideResult();
});

[elements.adminInput, elements.serviceInput].forEach((input) => {
  input.addEventListener("input", () => {
    setFeeError("");
    readFees(false);
    hideResult();
  });
});

elements.feeToggle.addEventListener("click", () => {
  const isOpen = elements.feeToggle.getAttribute("aria-expanded") === "true";
  elements.feeToggle.setAttribute("aria-expanded", String(!isOpen));
  elements.feeToggle.setAttribute("aria-label", isOpen ? "Ubah biaya" : "Tutup biaya");
  elements.feeEditor.hidden = isOpen;
});

elements.toastClose.addEventListener("click", hideToast);

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (elements.primaryButton.dataset.action === "copy" && lastResult) {
    copySellingPrice();
    return;
  }

  calculate({ showAmountError: true, showFeeError: true });
});

updateFeeChips(DEFAULT_FEES);
setPrimaryMode(false);
