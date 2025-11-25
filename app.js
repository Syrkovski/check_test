(function () {
  const FALLBACK_STYLE = `
    body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #f4f6fb; color: #1f2933; }
    .page { max-width: 1100px; margin: 24px auto 48px; padding: 0 16px; display: flex; flex-direction: column; gap: 20px; }
    .section, header { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px 24px; box-shadow: 0 6px 14px rgba(0,0,0,0.06); }
    h1, h2 { margin: 0 0 8px; }
    p { margin: 0 0 12px; color: #4b5563; }
    form { display: grid; gap: 12px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: #4b5563; }
    input, textarea, select, button { font: inherit; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; box-sizing: border-box; }
    button { cursor: pointer; background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
    .notice { padding: 12px 14px; border: 1px solid #e5e7eb; background: #f7f9fd; border-radius: 12px; color: #4b5563; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
    .hidden { display: none; }
  `;

  const FALLBACK_MARKUP = `
    <main class="page">
      <header>
        <h1>Генератор БСО</h1>
        <p>Если страница загрузилась без основного содержимого, мы восстановили шаблон автоматически.</p>
      </header>
      <section class="section" aria-labelledby="create-title">
        <div class="section-heading">
          <h2 id="create-title">Создать БСО</h2>
          <p class="section-description">Дата и время подставятся автоматически, вы меняете только количество и цену.</p>
        </div>
        <div class="notice" id="current-number">Номер генерируется автоматически по формуле YYYYMMDD-XXX, время проставляется текущее в момент создания PDF.</div>
        <div class="notice success hidden" id="creation-success" role="status" aria-live="polite"></div>
        <form id="bso-form">
          <div class="field-row">
            <label>
              Клиент
              <input type="text" id="client" name="client" value="Физлицо" readonly required />
            </label>
            <button type="button" class="toggle-edit" data-target="client">Изменить</button>
          </div>
          <div class="field-row">
            <label>
              Услуга
              <input type="text" id="service" name="service" value="Образовательные услуги" readonly required />
            </label>
            <button type="button" class="toggle-edit" data-target="service">Изменить</button>
          </div>
          <label>
            Количество занятий
            <input type="number" id="quantity" name="quantity" min="1" step="1" value="1" required />
          </label>
          <label>
            Цена за 1 занятие, ₽
            <input type="number" id="unitPrice" name="unitPrice" min="0" step="0.01" required />
          </label>
          <div class="field-row">
            <label>
              Способ оплаты
              <input
                type="text"
                id="payment"
                name="payment"
                value="безналичная (перевод по QR-коду на расчётный счёт ИП)"
                readonly
                required
              />
            </label>
            <button type="button" class="toggle-edit" data-target="payment">Изменить</button>
          </div>
          <button type="submit">Создать PDF</button>
        </form>
      </section>
      <section class="section" aria-labelledby="numbering-title">
        <h2 id="numbering-title">Управление нумерацией</h2>
        <form id="numbering-form" class="inline-fields" aria-describedby="numbering-hint">
          <label>
            Префикс (сегодня)
            <input type="text" id="number-prefix" readonly />
          </label>
          <label>
            Суффикс следующего номера
            <input type="number" id="number-sequence" name="number-sequence" min="1" max="999" required />
          </label>
          <div class="actions">
            <button type="submit">Применить вручную</button>
            <button type="button" id="reset-numbering">Сбросить на авто</button>
          </div>
        </form>
        <p id="numbering-hint" class="notice">При необходимости укажите суффикс следующего номера (только цифры, 1–999). После ручного задания нумерация продолжится последовательно.</p>
      </section>
      <section class="section" aria-labelledby="vendor-title">
        <div class="section-header">
          <div class="section-heading">
            <h2 id="vendor-title">Данные ИП</h2>
            <p class="section-description">Реквизиты подставляются в PDF и сохраняются локально. Можно отредактировать их прямо здесь, без правки vendor.json.</p>
          </div>
          <div class="section-actions">
            <button type="button" id="toggle-vendor-form">Редактировать реквизиты</button>
          </div>
        </div>
        <form id="vendor-form" class="hidden">
          <div class="inline-fields">
            <label>
              Наименование
              <textarea id="vendor-name" required></textarea>
            </label>
            <label>
              ИНН
              <input type="text" id="vendor-inn" />
            </label>
            <label>
              ОГРНИП
              <input type="text" id="vendor-ogrnip" />
            </label>
            <label>
              Налоговый режим
              <input type="text" id="vendor-tax" />
            </label>
            <label>
              Вид деятельности
              <input type="text" id="vendor-activity" />
            </label>
            <label>
              ОКВЭД
              <input type="text" id="vendor-okved" />
            </label>
            <label>
              Место деятельности
              <input type="text" id="vendor-location" />
            </label>
            <label>
              Банк
              <input type="text" id="vendor-bank" />
            </label>
            <label>
              Р/с
              <input type="text" id="vendor-account" />
            </label>
            <label>
              БИК
              <input type="text" id="vendor-bik" />
            </label>
          </div>
          <div class="actions">
            <button type="submit">Сохранить реквизиты</button>
            <button type="button" id="cancel-vendor">Отмена</button>
          </div>
        </form>
      </section>
      <section class="section" aria-labelledby="registry-title">
        <div class="section-header">
          <h2 id="registry-title">Реестр БСО</h2>
          <div class="section-actions">
            <button type="button" id="export-registry">Выгрузить реестр в JSON</button>
            <button type="button" id="import-registry">Загрузить реестр из файла</button>
          </div>
        </div>
        <p class="section-description">Хранится только в этом браузере. При очистке данных реестр исчезнет.</p>
        <input type="file" id="registry-import-file" accept="application/json" class="hidden" />
        <table id="registry">
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Клиент</th>
              <th>Услуга</th>
              <th>Сумма</th>
              <th>Оплата</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>
    </main>
  `;

  function ensureErrorContainer() {
    if (!document.getElementById('app-error')) {
      const container = document.createElement('div');
      container.id = 'app-error';
      container.className = 'notice hidden';
      container.setAttribute('role', 'alert');
      container.style.maxWidth = '1100px';
      container.style.margin = '12px auto';
      document.body.prepend(container);
    }
  }

  function ensureBaseMarkup() {
    const hasForm = document.getElementById('bso-form');
    const hasRegistry = document.querySelector('#registry tbody');
    if (hasForm && hasRegistry) {
      return;
    }

    if (!document.getElementById('fallback-style')) {
      const style = document.createElement('style');
      style.id = 'fallback-style';
      style.textContent = FALLBACK_STYLE;
      document.head.appendChild(style);
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = FALLBACK_MARKUP.trim();
    const main = wrapper.querySelector('main');
    if (main) {
      document.body.appendChild(main);
    }
  }

  function showFatalError(message) {
    const fallback = document.getElementById('app-error');
    if (fallback) {
      fallback.textContent = message;
      fallback.classList.remove('hidden');
    }
  }

  function initApp() {
    ensureBaseMarkup();
    ensureErrorContainer();

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
