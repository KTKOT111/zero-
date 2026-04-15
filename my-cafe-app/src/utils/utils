export function exportReportPDF(title, data, period, cafeName) {
  const periodLabels = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربع سنوي', semi: 'نصف سنوي', yearly: 'سنوي', all: 'كامل' };
  const now = new Date().toLocaleDateString('ar-EG');
  const rows = data.orders.map((o, i) => {
    const itemsStr = (o.items || []).map(it => `${it.name}(${it.quantity})`).join('، ');
    return `<tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 0 ? 'background:#f8fafc' : ''}">
      <td style="padding:8px;text-align:right">${o.date || ''}</td>
      <td style="padding:8px;text-align:right">${o.note || 'تيك أواي'}</td>
      <td style="padding:8px;text-align:right">${itemsStr}</td>
      <td style="padding:8px;text-align:center">${o.discountAmount > 0 ? `-${o.discountAmount.toFixed(2)}` : '-'}</td>
      <td style="padding:8px;text-align:center;font-weight:bold;color:#4f46e5">${o.total.toFixed(2)} ج</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Arial;margin:20px;direction:rtl}h1{color:#4f46e5}.stats{display:flex;gap:16px}.stat{background:#f1f5f9;border-radius:12px;padding:12px 20px}.stat-val{font-size:22px;font-weight:bold;color:#4f46e5}table{width:100%;border-collapse:collapse}th{background:#4f46e5;color:#fff;padding:10px}</style></head><body>
    <h1>تقرير المبيعات — ${periodLabels[period] || period}</h1><p>${cafeName} | ${now}</p>
    <div class="stats"><div class="stat"><div class="stat-val">${data.totalRevenue.toFixed(2)} ج</div><div class="stat-lbl">المبيعات</div></div><div class="stat"><div class="stat-val">${data.ordersCount}</div><div class="stat-lbl">الطلبات</div></div><div class="stat"><div class="stat-val">${data.totalExpenses.toFixed(2)} ج</div><div class="stat-lbl">المصروفات</div></div><div class="stat"><div class="stat-val" style="color:${data.netProfit>=0?'#16a34a':'#dc2626'}">${data.netProfit.toFixed(2)} ج</div><div class="stat-lbl">صافي الربح</div></div></div>
    <table><thead><tr><th>التاريخ</th><th>النوع</th><th>الأصناف</th><th>الخصم</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}<\/script></body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}

export function exportEmployeeReportPDF(employee, orders, cafeName) {
  const empOrders = orders.filter(o => o.cashierName === employee.name);
  const totalSales = empOrders.reduce((s, o) => s + o.total, 0);
  const now = new Date().toLocaleDateString('ar-EG');
  const rows = empOrders.map((o, i) => {
    const itemsStr = (o.items || []).map(it => it.name).join('، ');
    return `<tr><td>${o.date}</td><td>${itemsStr}</td><td>${o.total.toFixed(2)} ج</td></tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Arial;margin:20px}h1{color:#4f46e5}table{width:100%}th{background:#4f46e5;color:#fff}</style></head><body>
    <h1>تقرير معاملات: ${employee.name}</h1><p>${cafeName} | ${now}</p>
    <div style="display:flex;gap:16px"><div><div>${totalSales.toFixed(2)} ج</div><div>المبيعات</div></div><div><div>${empOrders.length}</div><div>الطلبات</div></div><div><div>${employee.salary} ج</div><div>الراتب</div></div></div>
    <table><thead><tr><th>التاريخ</th><th>الأصناف</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000)}<\/script></body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}
