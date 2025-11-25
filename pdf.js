(function (global) {
  const pdfApi = {};

  function formatAmountDisplay(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    return parsed.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function ensureFont(doc) {
    if (!global.DEJAVU_SANS_FONT) {
      throw new Error('Font data is missing');
    }
    doc.addFileToVFS('DejaVuSans.ttf', global.DEJAVU_SANS_FONT);
    doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
    doc.setFont('DejaVuSans', 'normal');
  }

  function buildPdf(record, ipDetails) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      alert('Не удалось загрузить модуль PDF. Проверьте интернет-соединение и обновите страницу.');
      throw new Error('jsPDF not loaded');
    }

    const { jsPDF } = global.jspdf;
    const doc = new jsPDF();
    ensureFont(doc);

    const left = 14;
    const center = 105;
    const contentWidth = 182;
    const dashSeparator = '--------------------------------------------------------------------------';
    const strongSeparator = '==========================================================================';
    let y = 16;

    const addSeparator = () => {
      doc.text(dashSeparator, left, y);
      y += 6;
    };

    const addStrongSeparator = () => {
      doc.text(strongSeparator, left, y);
      y += 6;
    };

    const addSection = (title, body) => {
      addSeparator();
      doc.text(title, left, y);
      y += 7;
      if (typeof body === 'function') {
        body();
      }
      addSeparator();
      y += 4;
    };

    const pushLines = (text) => {
      if (!text) return;
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, left, y);
      y += lines.length * 6;
    };

    const serviceName = record.serviceName || record.service || '';
    const basis = record.basis || record.service || serviceName;
    const quantity = Number(record.quantity) || 1;
    const unitPrice = Number(record.unitPrice);
    const unitPriceDisplay = Number.isFinite(unitPrice)
      ? `${formatAmountDisplay(unitPrice)} р`
      : '—';
    const totalAmount = Number.isFinite(Number(record.amount))
      ? Number(record.amount)
      : Number((unitPrice * quantity).toFixed(2));
    const amountDisplay = `${formatAmountDisplay(totalAmount)} р`;

    addStrongSeparator();
    doc.setFontSize(14);
    doc.text('КВИТАНЦИЯ ОБ ОПЛАТЕ УСЛУГ', center, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.text(`Документ № ${record.number} от ${record.date} за ${record.time}`, center, y, { align: 'center' });
    y += 12;
    addStrongSeparator();

    addSection('1. ПРОДАВЕЦ', () => {
      pushLines(ipDetails.name);
      pushLines([ipDetails.inn, ipDetails.ogrnip].filter(Boolean).join('   '));
      if (ipDetails.taxRegime) pushLines(`Налоговый режим: ${ipDetails.taxRegime}`);
      if (ipDetails.activity) pushLines(`Вид деятельности: ${ipDetails.activity}`);
      if (ipDetails.okved) pushLines(`Код ОКВЭД: ${ipDetails.okved}`);
      pushLines(`Место деятельности: ${ipDetails.location || 'Онлайн'}`);
    });

    addSection('2. ПОКУПАТЕЛЬ', () => {
      pushLines(record.client || 'Физическое лицо');
    });

    addSection('3. ОСНОВАНИЕ ПЛАТЕЖА', () => {
      pushLines(basis);
    });

    addSection('4. СОСТАВ РАСЧЁТА', () => {
      pushLines(serviceName || basis);
      pushLines(`Цена 1 занятия: ${unitPriceDisplay}`);
      pushLines(`Количество занятий: ${quantity}`);
      pushLines(`Сумма: ${amountDisplay}`);
    });

    addStrongSeparator();
    doc.setFontSize(13);
    doc.text(`ИТОГО К ОПЛАТЕ: ${amountDisplay}`, left, y);
    y += 10;
    doc.setFontSize(12);

    addSection('5. ОПЛАТА', () => {
      pushLines(`Оплата: ${record.payment}`);
    });

    addSection('6. ПОДТВЕРЖДЕНИЕ ОПЛАТЫ', () => {
      pushLines(`Дата получения: ${record.date} за ${record.time}`);
    });

    addStrongSeparator();

    return doc;
  }

  function downloadPdf(record, ipDetails) {
    try {
      const doc = buildPdf(record, ipDetails);
      doc.save(`${record.number}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
    }
  }

  pdfApi.buildPdf = buildPdf;
  pdfApi.downloadPdf = downloadPdf;
  pdfApi.formatAmountDisplay = formatAmountDisplay;

  global.PdfGenerator = pdfApi;
})(window);
