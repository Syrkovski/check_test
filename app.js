(() => {
  const STORAGE_KEY = 'bso-records';
  const VENDOR_STORAGE_KEY = 'bso-vendor-overrides';
  const CUSTOM_NUMBER_KEY = 'bso-custom-number';
  let ipDetails = {
    name: 'ИП Иванов Иван Иванович',
    inn: 'ИНН 123456789012',
    ogrnip: 'ОГРНИП 123456789012345',
    location: 'Онлайн',
    taxRegime: 'Патентная система налогообложения (ПСН)',
    activity: 'Услуги репетиторства по информатике (онлайн)',
    okved: '85.41',
    bank: 'Тинькофф Банк',
    account: 'Р/с 40802810900000000001',
    bik: 'БИК 044525974'
  };
  let vendorBase = { ...ipDetails };

  const form = document.getElementById('bso-form');
  const registryBody = document.querySelector('#registry tbody');
  const currentNumberEl = document.getElementById('current-number');
  const toggleButtons = document.querySelectorAll('.toggle-edit');
  const manualNumberDayInput = document.getElementById('manualNumberDay');
  const manualSequenceInput = document.getElementById('manualSequence');
  const saveManualNumberBtn = document.getElementById('saveManualNumber');
  const clearManualNumberBtn = document.getElementById('clearManualNumber');
  const manualDateInput = document.getElementById('manualDate');
  const manualTimeInput = document.getElementById('manualTime');
  const exportJsonBtn = document.getElementById('exportJson');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const vendorForm = document.getElementById('vendor-form');
  const vendorToggleBtn = document.getElementById('toggleVendorForm');
  const vendorResetBtn = document.getElementById('resetVendor');
  const vendorFields = ['name', 'inn', 'ogrnip', 'location', 'taxRegime', 'activity', 'okved', 'bank', 'account', 'bik'];

  const pdfGenerator = window.PdfGenerator || {};
  const formatAmountDisplay = pdfGenerator.formatAmountDisplay || ((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  });
  const downloadPdf = typeof pdfGenerator.downloadPdf === 'function'
    ? (record) => pdfGenerator.downloadPdf(record, ipDetails)
    : null;

  function loadVendorOverrides() {
    try {
      return JSON.parse(localStorage.getItem(VENDOR_STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveVendorOverrides(overrides) {
    localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(overrides));
  }

  function populateVendorForm() {
    vendorFields.forEach(field => {
      const control = document.getElementById(`vendor-${field}`);
      if (control) {
        control.value = ipDetails[field] || '';
        control.defaultValue = ipDetails[field] || '';
      }
    });
  }

  async function loadVendorDetails() {
    try {
      const response = await fetch('vendor.json');
      if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
      const data = await response.json();
      vendorBase = { ...ipDetails, ...data };
    } catch (error) {
      console.warn('Не удалось загрузить данные продавца из vendor.json', error);
      vendorBase = { ...ipDetails };
    }

    const overrides = loadVendorOverrides();
    ipDetails = { ...vendorBase, ...overrides };
    populateVendorForm();
  }

  function setReadonlyState(button, isReadonly) {
    const input = document.getElementById(button.dataset.target);
    if (!input) return;
    if (isReadonly) {
      input.setAttribute('readonly', 'readonly');
      button.textContent = 'Изменить';
    } else {
      input.removeAttribute('readonly');
      button.textContent = 'Зафиксировать';
      input.focus();
    }
  }

  function toggleReadonly(button) {
    const input = document.getElementById(button.dataset.target);
    if (!input) return;
    const isReadonly = input.hasAttribute('readonly');
    setReadonlyState(button, !isReadonly);
  }

  function resetEditableFields() {
    toggleButtons.forEach(button => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      input.value = input.defaultValue;
      setReadonlyState(button, true);
    });
  }

  function loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function formatDate(date) {
    const d = date || new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function formatTime(date) {
    const d = date || new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function formatDateInputValue(date) {
    const d = date || new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  function setDefaultPaymentDateTime(date) {
    const current = date || new Date();
    if (manualDateInput) {
      const value = formatDateInputValue(current);
      manualDateInput.value = value;
      manualDateInput.defaultValue = value;
    }
    if (manualTimeInput) {
      const timeValue = formatTime(current);
      manualTimeInput.value = timeValue;
      manualTimeInput.defaultValue = timeValue;
    }
  }

  function normalizeDateInput(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return null;
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }

  function normalizeTimeInput(value) {
    if (!value) return null;
    const [hours, minutes] = value.split(':');
    if (hours === undefined || minutes === undefined) return null;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function todayNumberPrefix(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  function parseDateValue(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function nextSequenceForDay(records, date) {
    const prefix = todayNumberPrefix(date);
    return records.filter(r => typeof r.number === 'string' && r.number.startsWith(prefix)).length + 1;
  }

  function nextNumber(records, date, sequenceOverride) {
    const prefixDate = date || new Date();
    const sequence = Number.isFinite(sequenceOverride) && sequenceOverride > 0
      ? sequenceOverride
      : nextSequenceForDay(records, prefixDate);
    return `${todayNumberPrefix(prefixDate)}-${String(sequence).padStart(3, '0')}`;
  }

  function getStoredCustomNumberParts() {
    try {
      const raw = localStorage.getItem(CUSTOM_NUMBER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      localStorage.removeItem(CUSTOM_NUMBER_KEY);
      return null;
    }
  }

  function setCustomNumberParts(value) {
    if (value && value.day && Number.isFinite(Number(value.sequence)) && Number(value.sequence) > 0) {
      localStorage.setItem(CUSTOM_NUMBER_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(CUSTOM_NUMBER_KEY);
    }

    if (manualNumberDayInput) {
      manualNumberDayInput.value = value?.day || manualNumberDayInput.value || formatDateInputValue(new Date());
    }
    if (manualSequenceInput) {
      manualSequenceInput.value = value?.sequence ? String(value.sequence) : manualSequenceInput.value;
    }
    renderCurrentNumber();
  }

  function renderManualNumber() {
    const records = loadRecords();
    const custom = getStoredCustomNumberParts();
    const defaultDayValue = formatDateInputValue(new Date());
    if (manualNumberDayInput) {
      manualNumberDayInput.value = custom?.day || manualNumberDayInput.value || defaultDayValue;
      manualNumberDayInput.defaultValue = manualNumberDayInput.value || defaultDayValue;
    }
    const dayDate = parseDateValue(manualNumberDayInput ? manualNumberDayInput.value : '') || new Date();
    const nextSeq = nextSequenceForDay(records, dayDate);
    if (manualSequenceInput) {
      const sequenceValue = custom?.sequence || Number(manualSequenceInput.value) || nextSeq;
      manualSequenceInput.value = sequenceValue ? String(sequenceValue) : '';
      manualSequenceInput.placeholder = String(nextSeq);
      manualSequenceInput.defaultValue = manualSequenceInput.value;
    }
  }

  function renderCurrentNumber() {
    const records = loadRecords();
    const custom = getStoredCustomNumberParts();
    const defaultDayValue = formatDateInputValue(new Date());
    const dayValue = custom?.day || (manualNumberDayInput ? manualNumberDayInput.value : '') || defaultDayValue;
    const dayDate = parseDateValue(dayValue) || new Date();
    const sequenceCandidate = custom?.sequence || Number(manualSequenceInput ? manualSequenceInput.value : '');
    const sequence = Number.isFinite(sequenceCandidate) && sequenceCandidate > 0
      ? sequenceCandidate
      : nextSequenceForDay(records, dayDate);
    const number = nextNumber(records, dayDate, sequence);
    currentNumberEl.textContent = custom
      ? `Следующий номер (принудительно): ${number}`
      : `Следующий номер: ${number}`;
  }

  function renderRegistry() {
    const records = loadRecords().sort((a, b) => b.createdAt - a.createdAt);
    registryBody.innerHTML = '';
    records.forEach(record => {
      const quantity = Number(record.quantity) || 1;
      const unitPrice = Number(record.unitPrice);
      const amountValue = Number.isFinite(Number(record.amount))
        ? Number(record.amount)
        : Number((unitPrice * quantity).toFixed(2));
      const displayService = record.serviceName || record.service || record.basis || '';
      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${record.number}</td>
          <td>${record.date}</td>
          <td>${record.time}</td>
          <td>${record.client}</td>
          <td>${displayService}</td>
          <td>${formatAmountDisplay(amountValue)}</td>
          <td>${record.payment}</td>
          <td class="actions"><button data-number="${record.number}" class="download">Скачать PDF</button><button data-number="${record.number}" class="delete">Удалить</button></td>
        `;
      registryBody.appendChild(row);
    });
  }

  function render() {
    renderManualNumber();
    renderCurrentNumber();
    renderRegistry();
  }

  function exportRegistry() {
    const records = loadRecords();
    const fileName = `bso-registry-${todayNumberPrefix(new Date())}.json`;
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importRegistryFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) {
          throw new Error('Файл должен содержать массив записей.');
        }
        const cleaned = parsed
          .filter(item => item && item.number && item.date && item.time)
          .map(item => ({
            ...item,
            createdAt: Number(item.createdAt) || Date.now()
          }));
        saveRecords(cleaned);
        render();
        alert('Реестр загружен.');
      } catch (error) {
        console.error('Import failed', error);
        alert('Не удалось загрузить файл реестра. Проверьте формат JSON.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleRegistryClick(event) {
    const number = event.target.getAttribute('data-number');
    if (!number) return;

    if (event.target.classList.contains('download')) {
      const records = loadRecords();
      const record = records.find(r => r.number === number);
      if (record && downloadPdf) {
        downloadPdf(record);
      }
    }

    if (event.target.classList.contains('delete')) {
      if (!confirm('Удалить запись?')) return;
      const updated = loadRecords().filter(r => r.number !== number);
      saveRecords(updated);
      render();
    }
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportRegistry);
  }

  if (importJsonBtn && importJsonInput) {
    importJsonBtn.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', (event) => {
      const [file] = event.target.files || [];
      if (file) {
        importRegistryFromFile(file);
      }
      event.target.value = '';
    });
  }

  toggleButtons.forEach(button => {
    button.addEventListener('click', () => toggleReadonly(button));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const records = loadRecords();
    const now = new Date();
    const date = normalizeDateInput(manualDateInput ? manualDateInput.value : '') || formatDate(now);
    const time = normalizeTimeInput(manualTimeInput ? manualTimeInput.value : '') || formatTime(now);
    const quantityValue = Number(document.getElementById('quantity').value);
    const unitPriceValue = Number(document.getElementById('unitPrice').value);
    const manualNumberParts = getStoredCustomNumberParts();
    const numberingDayValue = manualNumberParts?.day || (manualNumberDayInput ? manualNumberDayInput.value : '');
    const numberingDate = parseDateValue(numberingDayValue) || now;
    const sequenceInputValue = manualNumberParts?.sequence || Number(manualSequenceInput ? manualSequenceInput.value : '');
    const sequenceForNumber = Number.isFinite(sequenceInputValue) && sequenceInputValue > 0
      ? sequenceInputValue
      : nextSequenceForDay(records, numberingDate);
    const clientValue = document.getElementById('client').value.trim() || 'Физлицо';
    const serviceNameValue = document.getElementById('serviceName').value.trim();
    const basisValue = document.getElementById('basis').value.trim() || serviceNameValue;

    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      alert('Введите корректное количество занятий.');
      return;
    }

    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) {
      alert('Введите корректную цену за занятие.');
      return;
    }

    const amountValue = Number((unitPriceValue * quantityValue).toFixed(2));

    const recordNumber = nextNumber(records, numberingDate, sequenceForNumber);

    const record = {
      number: recordNumber,
      date,
      time,
      client: clientValue,
      serviceName: serviceNameValue,
      basis: basisValue,
      service: serviceNameValue,
      quantity: quantityValue,
      unitPrice: unitPriceValue,
      amount: amountValue,
      payment: document.getElementById('payment').value,
      createdAt: Date.now()
    };

    records.push(record);
    saveRecords(records);
    if (manualNumberParts) {
      setCustomNumberParts(null);
    }
    if (manualSequenceInput) {
      manualSequenceInput.value = '';
    }
    render();
    if (downloadPdf) {
      downloadPdf(record);
    }
    form.reset();
    setDefaultPaymentDateTime();
    resetEditableFields();
  });

  registryBody.addEventListener('click', handleRegistryClick);

  saveManualNumberBtn.addEventListener('click', () => {
    const dayValue = manualNumberDayInput ? manualNumberDayInput.value : '';
    const dayDate = parseDateValue(dayValue);
    const sequenceValue = Number(manualSequenceInput ? manualSequenceInput.value : '');
    if (!dayDate) {
      alert('Выберите день квитанции.');
      return;
    }
    if (!Number.isFinite(sequenceValue) || sequenceValue <= 0) {
      alert('Введите корректный номер за день.');
      return;
    }
    setCustomNumberParts({ day: dayValue, sequence: sequenceValue });
  });

  clearManualNumberBtn.addEventListener('click', () => {
    setCustomNumberParts(null);
    if (manualSequenceInput) {
      manualSequenceInput.value = '';
    }
    render();
  });

  if (manualNumberDayInput) {
    manualNumberDayInput.addEventListener('change', () => {
      const dateForNumber = parseDateValue(manualNumberDayInput.value) || new Date();
      const nextSeq = nextSequenceForDay(loadRecords(), dateForNumber);
      if (manualSequenceInput && !getStoredCustomNumberParts()) {
        manualSequenceInput.placeholder = String(nextSeq);
        if (!manualSequenceInput.value) {
          manualSequenceInput.value = String(nextSeq);
        }
      }
      renderCurrentNumber();
    });
  }

  if (manualSequenceInput) {
    manualSequenceInput.addEventListener('input', renderCurrentNumber);
  }

  vendorToggleBtn.addEventListener('click', () => {
    vendorForm.classList.toggle('hidden');
  });

  vendorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const overrides = {};
    vendorFields.forEach(field => {
      const control = document.getElementById(`vendor-${field}`);
      overrides[field] = control ? control.value.trim() : '';
    });
    saveVendorOverrides(overrides);
    ipDetails = { ...vendorBase, ...overrides };
    populateVendorForm();
    alert('Реквизиты сохранены в браузере.');
  });

  vendorResetBtn.addEventListener('click', () => {
    localStorage.removeItem(VENDOR_STORAGE_KEY);
    ipDetails = { ...vendorBase };
    populateVendorForm();
    alert('Реквизиты сброшены к данным из vendor.json.');
  });

  (async function init() {
    resetEditableFields();
    await loadVendorDetails();
    setDefaultPaymentDateTime();
    render();
  })();
})();
