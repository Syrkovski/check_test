(function () {
  function showFatalError(message) {
    const fallback = document.getElementById('app-error');
    if (fallback) {
      fallback.textContent = message;
      fallback.classList.remove('hidden');
    }
  }

  function initApp() {
    const pdfService = window.PdfService || {};
    const safeFormatAmountDisplay = pdfService.formatAmountDisplay || ((value) => value);
    const downloadPdf = pdfService.downloadPdf;

    const STORAGE_KEY = 'bso-records';
    const VENDOR_STORAGE_KEY = 'bso-vendor-details';
    const NUMBER_OVERRIDE_KEY = 'bso-number-override';

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

    let successTimeout;

    const form = document.getElementById('bso-form');
    const registryBody = document.querySelector('#registry tbody');
    const currentNumberEl = document.getElementById('current-number');
    const creationSuccess = document.getElementById('creation-success');
    const toggleButtons = document.querySelectorAll('.toggle-edit');
    const numberingForm = document.getElementById('numbering-form');
    const numberPrefixInput = document.getElementById('number-prefix');
    const numberSequenceInput = document.getElementById('number-sequence');
    const resetNumberingBtn = document.getElementById('reset-numbering');
    const vendorForm = document.getElementById('vendor-form');
    const toggleVendorFormBtn = document.getElementById('toggle-vendor-form');
    const cancelVendorBtn = document.getElementById('cancel-vendor');
    const exportRegistryBtn = document.getElementById('export-registry');
    const importRegistryBtn = document.getElementById('import-registry');
    const importRegistryInput = document.getElementById('registry-import-file');

    if (!form || !registryBody || !currentNumberEl || !creationSuccess) {
      const message = 'Страница загружена некорректно: отсутствуют обязательные элементы формы.';
      console.error(message);
      showFatalError(message);
      return;
    }

    async function loadVendorDetails() {
      const stored = loadStoredVendorDetails();
      if (stored) {
        ipDetails = { ...ipDetails, ...stored };
      }

      try {
        const response = await fetch('vendor.json');
        if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
        const data = await response.json();
        ipDetails = { ...ipDetails, ...data };
        if (stored) {
          ipDetails = { ...ipDetails, ...stored };
        }
      } catch (error) {
        console.warn('Не удалось загрузить данные продавца из vendor.json', error);
      }

      fillVendorFormFromDetails();
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
  
    function fillVendorFormFromDetails() {
      if (!vendorForm) return;
  
      const fields = {
        'vendor-name': ipDetails.name,
        'vendor-inn': ipDetails.inn || '',
        'vendor-ogrnip': ipDetails.ogrnip || '',
        'vendor-tax': ipDetails.taxRegime || '',
        'vendor-activity': ipDetails.activity || '',
        'vendor-okved': ipDetails.okved || '',
        'vendor-location': ipDetails.location || '',
        'vendor-bank': ipDetails.bank || '',
        'vendor-account': ipDetails.account || '',
        'vendor-bik': ipDetails.bik || ''
      };
  
      Object.entries(fields).forEach(([id, value]) => {
        const node = document.getElementById(id);
        if (node) {
          node.value = value || '';
        }
      });
    }
  
    function hideVendorForm() {
      if (!vendorForm || !toggleVendorFormBtn) return;
      vendorForm.classList.add('hidden');
      toggleVendorFormBtn.textContent = 'Редактировать реквизиты';
      toggleVendorFormBtn.setAttribute('aria-expanded', 'false');
      fillVendorFormFromDetails();
    }
  
    function showVendorForm() {
      if (!vendorForm || !toggleVendorFormBtn) return;
      fillVendorFormFromDetails();
      vendorForm.classList.remove('hidden');
      toggleVendorFormBtn.textContent = 'Скрыть реквизиты';
      toggleVendorFormBtn.setAttribute('aria-expanded', 'true');
    }
  
    function parseQuantity(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
  
    function parseUnitPrice(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }
  
    function calculateAmount(quantity, unitPrice) {
      return Number(((quantity || 0) * (unitPrice || 0)).toFixed(2));
    }
  
    function sanitizeRecord(raw) {
      if (!raw || typeof raw !== 'object' || !raw.number || !raw.date || !raw.time) {
        return null;
      }
  
      const quantity = parseQuantity(raw.quantity);
      const unitPrice = parseUnitPrice(raw.unitPrice);
  
      if (quantity === null || unitPrice === null) {
        return null;
      }
  
      return {
        ...raw,
        quantity,
        unitPrice,
        amount: calculateAmount(quantity, unitPrice)
      };
    }
  
    function loadRecords() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        return parsed.map(sanitizeRecord).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
  
    function saveRecords(records) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  
    function exportRegistry() {
      const records = loadRecords();
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'registry.json';
      link.click();
      URL.revokeObjectURL(url);
    }
  
    function importRegistryFromFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) {
            alert('Файл должен содержать массив записей реестра.');
            return;
          }
  
          const sanitized = data
            .map(sanitizeRecord)
            .filter(Boolean);
  
          if (!sanitized.length) {
            alert('Не удалось найти валидные записи в файле.');
            return;
          }
  
          saveRecords(sanitized);
          render();
          alert('Реестр обновлён из файла.');
        } catch (error) {
          alert(`Не удалось прочитать файл: ${error.message}`);
        } finally {
          importRegistryInput.value = '';
        }
      };
  
      reader.onerror = () => {
        alert('Ошибка чтения файла.');
        importRegistryInput.value = '';
      };
  
      reader.readAsText(file);
    }
  
    function loadStoredVendorDetails() {
      try {
        return JSON.parse(localStorage.getItem(VENDOR_STORAGE_KEY)) || null;
      } catch (error) {
        return null;
      }
    }
  
    function saveVendorDetails(details) {
      localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(details));
    }
  
    function loadSequenceOverrides() {
      try {
        return JSON.parse(localStorage.getItem(NUMBER_OVERRIDE_KEY)) || {};
      } catch (error) {
        return {};
      }
    }
  
    function saveSequenceOverrides(overrides) {
      localStorage.setItem(NUMBER_OVERRIDE_KEY, JSON.stringify(overrides));
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
  
    function todayNumberPrefix(date) {
      const d = date || new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    }
  
    function maxSequenceForPrefix(records, prefix) {
      return records.reduce((max, record) => {
        if (typeof record.number !== 'string') return max;
        if (!record.number.startsWith(`${prefix}-`)) return max;
        const [, suffix] = record.number.split('-');
        const parsed = Number.parseInt(suffix, 10);
        if (!Number.isFinite(parsed)) return max;
        return Math.max(max, parsed);
      }, 0);
    }
  
    function nextNumber(records, date) {
      const prefix = todayNumberPrefix(date);
      const overrides = loadSequenceOverrides();
      const overrideSeq = overrides[prefix];
      const maxSeq = maxSequenceForPrefix(records, prefix);
      const seq = Number.isFinite(overrideSeq) && overrideSeq > 0
        ? overrideSeq
        : maxSeq + 1;
      return `${prefix}-${String(seq).padStart(3, '0')}`;
    }
  
    function renderCurrentNumber() {
      const records = loadRecords();
      const today = new Date();
      const prefix = todayNumberPrefix(today);
      const overrides = loadSequenceOverrides();
      const overrideSeq = overrides[prefix];
      const number = nextNumber(records, today);
      const isManual = Number.isFinite(overrideSeq) && overrideSeq > 0;
      currentNumberEl.innerHTML = `
        <span class="number-display">
          <span>Следующий номер:</span>
          <span class="number-value">${number}</span>
          ${isManual ? '<span class="pill">ручной</span>' : ''}
        </span>
      `;
  
      if (numberPrefixInput) {
        numberPrefixInput.value = `${prefix}-`;
      }
  
      if (numberSequenceInput) {
        const suggested = Number.isFinite(overrideSeq) && overrideSeq > 0
          ? overrideSeq
          : maxSequenceForPrefix(records, prefix) + 1;
        numberSequenceInput.value = suggested;
      }
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
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${record.number}</td>
          <td>${record.date}</td>
          <td>${record.time}</td>
          <td>${record.client}</td>
          <td>${record.service}</td>
          <td>${safeFormatAmountDisplay(amountValue)}</td>
          <td>${record.payment}</td>
          <td class="actions">
            <button data-number="${record.number}" class="download">Скачать PDF</button>
            <button data-number="${record.number}" class="delete">Удалить</button>
          </td>
        `;
        registryBody.appendChild(row);
      });
    }
  
    function render() {
      renderCurrentNumber();
      renderRegistry();
    }
  
    function showCreationSuccess(number) {
      if (!creationSuccess) return;
      creationSuccess.textContent = `БСО №${number} создан, PDF скачан.`;
      creationSuccess.classList.remove('hidden');
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
      successTimeout = setTimeout(() => creationSuccess.classList.add('hidden'), 5000);
    }
  
    function handleRegistryClick(event) {
      const target = event.target;
  
      if (target.classList.contains('download')) {
        const number = target.getAttribute('data-number');
        const records = loadRecords();
        const record = records.find(r => r.number === number);
        if (record && typeof downloadPdf === 'function') {
          downloadPdf(record, ipDetails);
        }
        return;
      }
  
      if (target.classList.contains('delete')) {
        const number = target.getAttribute('data-number');
        if (!number) return;
        if (!confirm(`Удалить запись ${number}?`)) return;
        const updatedRecords = loadRecords().filter(r => r.number !== number);
        saveRecords(updatedRecords);
        render();
      }
    }
  
    function handleNumberingSubmit(event) {
      event.preventDefault();
      const prefix = todayNumberPrefix(new Date());
      const seq = Number(numberSequenceInput.value);
      if (!Number.isFinite(seq) || seq <= 0 || seq > 999) {
        alert('Укажите суффикс от 1 до 999.');
        return;
      }
  
      const overrides = loadSequenceOverrides();
      overrides[prefix] = Math.floor(seq);
      saveSequenceOverrides(overrides);
      renderCurrentNumber();
    }
  
    function handleResetNumbering() {
      const prefix = todayNumberPrefix(new Date());
      const overrides = loadSequenceOverrides();
      delete overrides[prefix];
      saveSequenceOverrides(overrides);
      renderCurrentNumber();
    }
  
    function handleVendorSubmit(event) {
      event.preventDefault();
      const updated = {
        ...ipDetails,
        name: document.getElementById('vendor-name').value.trim(),
        inn: document.getElementById('vendor-inn').value.trim(),
        ogrnip: document.getElementById('vendor-ogrnip').value.trim(),
        taxRegime: document.getElementById('vendor-tax').value.trim(),
        activity: document.getElementById('vendor-activity').value.trim(),
        okved: document.getElementById('vendor-okved').value.trim(),
        location: document.getElementById('vendor-location').value.trim(),
        bank: document.getElementById('vendor-bank').value.trim(),
        account: document.getElementById('vendor-account').value.trim(),
        bik: document.getElementById('vendor-bik').value.trim()
      };
  
      if (!updated.name) {
        alert('Введите наименование ИП.');
        return;
      }
  
      ipDetails = updated;
      saveVendorDetails(updated);
      hideVendorForm();
    }
  
      toggleButtons.forEach(button => {
        button.addEventListener('click', () => toggleReadonly(button));
      });
  
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const records = loadRecords();
        const now = new Date();
      const date = formatDate(now);
      const time = formatTime(now);
      const quantityValue = parseQuantity(document.getElementById('quantity').value);
      const unitPriceValue = parseUnitPrice(document.getElementById('unitPrice').value);
  
      if (quantityValue === null) {
        alert('Введите корректное количество занятий.');
        return;
      }
  
      if (unitPriceValue === null) {
        alert('Введите корректную цену за занятие.');
        return;
      }
  
      const amountValue = calculateAmount(quantityValue, unitPriceValue);
  
      const record = {
        number: nextNumber(records, now),
        date,
        time,
        client: document.getElementById('client').value.trim() || 'Физлицо',
        service: document.getElementById('service').value.trim(),
        quantity: quantityValue,
        unitPrice: unitPriceValue,
        amount: amountValue,
        payment: document.getElementById('payment').value,
        createdAt: Date.now()
      };
  
        records.push(record);
        saveRecords(records);
  
      const prefix = todayNumberPrefix(now);
      const overrides = loadSequenceOverrides();
      const [, suffix] = record.number.split('-');
      const parsedSuffix = Number.parseInt(suffix, 10);
      if (Number.isFinite(overrides[prefix])) {
        overrides[prefix] = Number.isFinite(parsedSuffix) ? parsedSuffix + 1 : overrides[prefix];
        saveSequenceOverrides(overrides);
      }
  
      render();
      if (typeof downloadPdf === 'function') {
        downloadPdf(record, ipDetails);
      }
      showCreationSuccess(record.number);
      form.reset();
      resetEditableFields();
    });
  
      if (numberingForm) {
        numberingForm.addEventListener('submit', handleNumberingSubmit);
      }
  
      if (resetNumberingBtn) {
        resetNumberingBtn.addEventListener('click', handleResetNumbering);
      }
  
      if (vendorForm) {
        vendorForm.addEventListener('submit', handleVendorSubmit);
      }
  
      if (cancelVendorBtn) {
        cancelVendorBtn.addEventListener('click', () => hideVendorForm());
      }
  
      if (toggleVendorFormBtn) {
        toggleVendorFormBtn.addEventListener('click', () => {
          if (vendorForm.classList.contains('hidden')) {
            showVendorForm();
          } else {
            hideVendorForm();
          }
        });
      }
  
      if (exportRegistryBtn) {
        exportRegistryBtn.addEventListener('click', exportRegistry);
      }
  
      if (importRegistryBtn && importRegistryInput) {
        importRegistryBtn.addEventListener('click', () => importRegistryInput.click());
        importRegistryInput.addEventListener('change', (event) => {
          const file = event.target.files && event.target.files[0];
          importRegistryFromFile(file);
        });
      }
  
      registryBody.addEventListener('click', handleRegistryClick);
  
      (function init() {
        resetEditableFields();
        loadVendorDetails();
        render();
      })();
  }

  function start() {
    try {
      initApp();
    } catch (error) {
      console.error('Неожиданная ошибка инициализации', error);
      showFatalError('Не удалось запустить генератор. Попробуйте обновить страницу или открыть её в другом браузере.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
