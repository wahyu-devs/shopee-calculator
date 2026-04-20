const DEFAULT_FEES = {
  adminRate: 0.0825,
  serviceRate: 0.055,
  processFee: 1250,
};

const STORAGE_KEY = "shopeeCalculatorFees";

const elements = {
  form: document.getElementById("calculator-form"),
  aboutModal: document.getElementById("about-modal"),
  aboutModalClose: document.getElementById("about-modal-close"),
  mobileMenu: document.getElementById("mobile-menu"),
  mobileMenuBackdrop: document.getElementById("mobile-menu-backdrop"),
  mobileMenuClose: document.getElementById("mobile-menu-close"),
  mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
  openAbout: document.getElementById("open-about"),
  resetForm: document.getElementById("reset-form"),
  amountInput: document.getElementById("bersih"),
  amountField: document.getElementById("amount-field"),
  amountError: document.getElementById("bersih-error"),
  adminInput: document.getElementById("admin-rate"),
  serviceInput: document.getElementById("service-rate"),
  processInput: document.getElementById("process-fee"),
  feeError: document.getElementById("fee-error"),
  feeEditor: document.getElementById("fee-editor"),
  feeToggle: document.getElementById("toggle-fees"),
  saveFees: document.getElementById("save-fees"),
  adminChip: document.getElementById("admin-chip"),
  serviceChip: document.getElementById("service-chip"),
  processChip: document.getElementById("process-chip"),
  primaryButton: document.getElementById("primary-action"),
  copyStatus: document.getElementById("copy-status"),
  toast: document.getElementById("toast"),
  toastMessage: document.querySelector("#toast .toast-message"),
  toastClose: document.querySelector("#toast .toast-close"),
  output: document.getElementById("output"),
  emptyState: document.getElementById("empty-state"),
  sellingPrice: document.getElementById("selling-price"),
  adminFee: document.getElementById("admin-fee"),
  serviceFee: document.getElementById("service-fee"),
  processCost: document.getElementById("process-cost"),
  netReceived: document.getElementById("net-received"),
};

let savedFees = { ...DEFAULT_FEES };
let lastResult = null;
let copyResetTimer = 0;
let toastTimer = 0;
let toastHideTimer = 0;
let lastToastMessage = "";
let mobileMenuCloseTimer = 0;

function setMobileMenuOpen(isOpen) {
  const shouldOpen = isOpen && window.matchMedia("(max-width: 700px)").matches;

  window.clearTimeout(mobileMenuCloseTimer);
  elements.mobileMenuToggle.setAttribute("aria-expanded", String(shouldOpen));
  elements.mobileMenuToggle.setAttribute("aria-label", shouldOpen ? "Tutup menu" : "Buka menu");

  if (shouldOpen) {
    elements.mobileMenu.hidden = false;
    elements.mobileMenuBackdrop.hidden = false;
    document.body.classList.add("is-mobile-menu-open");

    window.requestAnimationFrame(() => {
      if (elements.mobileMenuToggle.getAttribute("aria-expanded") === "true") {
        elements.mobileMenu.classList.add("is-open");
        elements.mobileMenuBackdrop.classList.add("is-open");
      }
    });
    return;
  }

  elements.mobileMenu.classList.remove("is-open");
  elements.mobileMenuBackdrop.classList.remove("is-open");
  document.body.classList.remove("is-mobile-menu-open");

  mobileMenuCloseTimer = window.setTimeout(() => {
    if (elements.mobileMenuToggle.getAttribute("aria-expanded") === "false") {
      elements.mobileMenu.hidden = true;
      elements.mobileMenuBackdrop.hidden = true;
    }
  }, 180);
}

function setAboutModalOpen(isOpen) {
  elements.aboutModal.hidden = !isOpen;
}

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

function isValidFeeSet(fees) {
  return (
    fees &&
    Number.isFinite(fees.adminRate) &&
    Number.isFinite(fees.serviceRate) &&
    Number.isFinite(fees.processFee) &&
    fees.adminRate >= 0 &&
    fees.serviceRate >= 0 &&
    fees.processFee >= 0 &&
    fees.adminRate + fees.serviceRate < 1
  );
}

function loadStoredFees() {
  try {
    const storedFees = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isValidFeeSet(storedFees) ? storedFees : { ...DEFAULT_FEES };
  } catch (error) {
    return { ...DEFAULT_FEES };
  }
}

function saveStoredFees(fees) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fees));
  } catch (error) {
    showToast("Biaya tersimpan untuk sesi ini.", "info");
  }
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

function syncFeeInputs(fees = savedFees) {
  elements.adminInput.value = formatPercent(fees.adminRate);
  elements.serviceInput.value = formatPercent(fees.serviceRate);
  elements.processInput.value = fees.processFee.toLocaleString("id-ID");
  setFeeError("");
}

function setFeeEditorOpen(isOpen) {
  elements.feeToggle.setAttribute("aria-expanded", String(isOpen));
  elements.feeToggle.setAttribute("aria-label", isOpen ? "Tutup biaya" : "Ubah biaya");
  elements.feeEditor.hidden = !isOpen;

  if (isOpen) {
    syncFeeInputs();
  } else {
    setFeeError("");
  }
}

function readFeeInputs(showError) {
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
  return fees;
}

function hideResult() {
  lastResult = null;
  elements.output.hidden = true;
  elements.emptyState.hidden = false;
  setPrimaryMode(false);
}

function resetCalculatorForm() {
  elements.amountInput.value = "";
  setAmountError("");
  setFeeError("");
  setCopyStatus("");
  syncFeeInputs(savedFees);
  setFeeEditorOpen(false);
  hideResult();
  showToast("Form berhasil dikosongkan.", "success");
}

function renderResult(result) {
  lastResult = result;
  elements.output.hidden = false;
  elements.emptyState.hidden = true;
  elements.sellingPrice.textContent = formatRupiah(result.sellingPrice);
  elements.adminFee.textContent = `-${formatRupiah(result.adminFee)}`;
  elements.serviceFee.textContent = `-${formatRupiah(result.serviceFee)}`;
  elements.processCost.textContent = `-${formatRupiah(result.processFee)}`;
  elements.netReceived.textContent = formatRupiah(result.netReceived);
  setPrimaryMode(true);
}

function calculate(options = {}) {
  const amount = parseRupiah(elements.amountInput.value);
  const fees = savedFees;
  setCopyStatus("");

  if (Number.isNaN(amount) || amount <= 0) {
    hideResult();
    setAmountError(
      options.showAmountError ? "Isi target di atas Rp0." : "",
      Boolean(options.showAmountError),
    );
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
});

[elements.adminInput, elements.serviceInput].forEach((input) => {
  input.addEventListener("input", () => {
    setFeeError("");
  });
});

elements.feeToggle.addEventListener("click", () => {
  const isOpen = elements.feeToggle.getAttribute("aria-expanded") === "true";
  setFeeEditorOpen(!isOpen);
});

elements.saveFees.addEventListener("click", () => {
  const fees = readFeeInputs(true);

  if (!fees) {
    return;
  }

  savedFees = fees;
  saveStoredFees(savedFees);
  updateFeeChips(savedFees);
  hideResult();
  setFeeEditorOpen(false);
  showToast("Biaya disimpan.", "success");
});

elements.toastClose.addEventListener("click", hideToast);

elements.mobileMenuToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = elements.mobileMenuToggle.getAttribute("aria-expanded") === "true";
  setMobileMenuOpen(!isOpen);
});

elements.mobileMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

elements.mobileMenuBackdrop.addEventListener("click", () => {
  setMobileMenuOpen(false);
});

elements.mobileMenuClose.addEventListener("click", () => {
  setMobileMenuOpen(false);
  elements.mobileMenuToggle.focus();
});

elements.openAbout.addEventListener("click", () => {
  setMobileMenuOpen(false);
  setAboutModalOpen(true);
});

elements.resetForm.addEventListener("click", () => {
  setMobileMenuOpen(false);
  resetCalculatorForm();
});

elements.aboutModalClose.addEventListener("click", () => {
  setAboutModalOpen(false);
  elements.mobileMenuToggle.focus();
});

elements.aboutModal.addEventListener("click", (event) => {
  if (event.target === elements.aboutModal) {
    setAboutModalOpen(false);
  }
});

elements.aboutModal.querySelector(".about-modal-panel").addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.aboutModal.hidden) {
    setAboutModalOpen(false);
    elements.mobileMenuToggle.focus();
    return;
  }

  if (event.key === "Escape" && elements.mobileMenuToggle.getAttribute("aria-expanded") === "true") {
    setMobileMenuOpen(false);
    elements.mobileMenuToggle.focus();
  }
});

document.addEventListener("click", () => {
  if (elements.mobileMenuToggle.getAttribute("aria-expanded") === "true") {
    setMobileMenuOpen(false);
  }
});

window.addEventListener("resize", () => {
  const isMenuOpen = elements.mobileMenuToggle.getAttribute("aria-expanded") === "true";

  if (isMenuOpen && !window.matchMedia("(max-width: 700px)").matches) {
    setMobileMenuOpen(false);
  }
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (elements.primaryButton.dataset.action === "copy" && lastResult) {
    copySellingPrice();
    return;
  }

  calculate({ showAmountError: true, showFeeError: true });
});

savedFees = loadStoredFees();
syncFeeInputs(savedFees);
updateFeeChips(savedFees);
setPrimaryMode(false);
