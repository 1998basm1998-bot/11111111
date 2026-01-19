// مصفوفة لتخزين البيانات (سنستخدم LocalStorage للحفظ الدائم)
let transactions = JSON.parse(localStorage.getItem('debtTransactions')) || [];

// دالة لحفظ البيانات
function saveToLocal() {
    localStorage.setItem('debtTransactions', JSON.stringify(transactions));
}

// دالة التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تعيين تاريخ اليوم كافتراضي
    document.getElementById('transDate').valueAsDate = new Date();
    renderGeneralLedger();
});

// 1. منطق إضافة العملية
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('customerName').value.trim();
    const type = document.getElementById('transType').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('transDate').value;

    if (!name || isNaN(amount) || amount <= 0) {
        alert("يرجى إدخال بيانات صحيحة");
        return;
    }

    // إنشاء كائن العملية الجديد
    const transaction = {
        id: Date.now(), // رقم تسلسلي فريد يعتمد على الوقت
        date: date,
        name: name,
        type: type, // 'debt' or 'payment'
        amount: amount
    };

    // إضافة للسجل وحفظ
    transactions.push(transaction);
    saveToLocal();

    // إعادة تعيين النموذج وتحديث الجدول
    this.reset();
    document.getElementById('transDate').valueAsDate = new Date();
    renderGeneralLedger();
    
    // إذا كنا في صفحة هذا الزبون، نحدثها أيضاً
    const currentViewCustomer = document.getElementById('statementCustomerName').innerText;
    if (document.getElementById('customerStatementSection').style.display !== 'none' && currentViewCustomer === name) {
        searchCustomer(name); // إعادة تحميل كشف الحساب
    } else {
        alert("تمت إضافة العملية بنجاح!");
    }
});

// 2. عرض السجل العام
function renderGeneralLedger() {
    const tbody = document.getElementById('generalTableBody');
    tbody.innerHTML = '';

    // ترتيب العمليات: الأحدث أولاً للعرض العام
    const sortedTrans = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

    sortedTrans.forEach((t, index) => {
        const row = document.createElement('tr');
        
        // تحديد اللون والنص حسب النوع
        const typeClass = t.type === 'debt' ? 'text-green' : 'text-red';
        const typeText = t.type === 'debt' ? 'إضافة دين (+)' : 'تسديد (-)';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${t.date}</td>
            <td>${t.name}</td>
            <td class="${typeClass}">${typeText}</td>
            <td>${formatMoney(t.amount)}</td>
            <td><button class="btn-glass" style="padding: 2px 8px; font-size: 0.8em;" onclick="performSearch('${t.name}')">كشف حساب</button></td>
        `;
        tbody.appendChild(row);
    });
}

// 3. منطق البحث وكشف الحساب (جوهر المعادلة الرياضية)
function searchCustomer(forceName = null) {
    const searchName = forceName || document.getElementById('searchInput').value.trim();
    
    if (!searchName) {
        alert("يرجى كتابة اسم الزبون");
        return;
    }

    // التبديل بين الواجهات
    document.getElementById('generalLedgerSection').classList.add('hidden');
    document.getElementById('customerStatementSection').classList.remove('hidden');
    document.getElementById('statementCustomerName').innerText = searchName;

    // تصفية العمليات الخاصة بالزبون وترتيبها من الأقدم للأحدث (منطق محاسبي)
    const customerTrans = transactions
        .filter(t => t.name.toLowerCase().includes(searchName.toLowerCase()))
        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);

    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';

    // ==========================================
    // المعادلة الرياضية المحورية
    // الرصيد الحالي = الرصيد السابق + (الدين) - (التسديد)
    // ==========================================
    let runningBalance = 0;

    if (customerTrans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد حركات لهذا الزبون</td></tr>';
    } else {
        customerTrans.forEach(t => {
            // تطبيق المعادلة
            if (t.type === 'debt') {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }

            const row = document.createElement('tr');
            
            // تنسيق الأعمدة (مدين / دائن)
            const debitCell = t.type === 'debt' ? formatMoney(t.amount) : '-';
            const creditCell = t.type === 'payment' ? formatMoney(t.amount) : '-';
            
            // تلوين الرصيد التراكمي
            let balanceClass = 'text-neutral';
            if(runningBalance > 0) balanceClass = 'text-green'; // عليه دين
            if(runningBalance < 0) balanceClass = 'text-red';   // له فائض (دافع زيادة)

            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.type === 'debt' ? 'دين جديد' : 'تسديد دفعة'}</td>
                <td class="text-red">${creditCell}</td>
                <td class="text-green">${debitCell}</td>
                <td class="${balanceClass}" style="direction: ltr; text-align: right;">${formatMoney(runningBalance)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // تحديث الرصيد النهائي في أعلى البطاقة
    const finalDisplay = document.getElementById('finalBalanceDisplay');
    finalDisplay.innerText = formatMoney(runningBalance);
    finalDisplay.style.color = runningBalance > 0 ? '#4caf50' : (runningBalance < 0 ? '#ff5252' : '#fff');
}

// دالة مساعدة للبحث من الجدول العام
function performSearch(name) {
    document.getElementById('searchInput').value = name;
    searchCustomer(name);
}

// العودة للسجل العام
function showGeneralLedger() {
    document.getElementById('generalLedgerSection').classList.remove('hidden');
    document.getElementById('customerStatementSection').classList.add('hidden');
    document.getElementById('searchInput').value = '';
    renderGeneralLedger();
}

// تنسيق العملة
function formatMoney(amount) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
