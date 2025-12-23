// --- report.js ---

let allReportData = []; // Store raw data
let filteredData = [];  // Store filtered data

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default dates (First day of month to Today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('startDate').valueAsDate = firstDay;
    document.getElementById('endDate').valueAsDate = today;

    fetchReportData();
});

// 1. Fetch Data from Firebase
async function fetchReportData() {
    const tableBody = document.getElementById('report-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary text-sm"></div></td></tr>';

    try {
        const snapshot = await db.collection('records').orderBy('date', 'desc').get();
        allReportData = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                date: d.date,
                partyName: d.partyName || 'Unknown',
                note: d.note || '', // Handle missing notes
                pcs: parseInt(d.totals?.pcs || 0),
                cft: parseFloat(d.totals?.cft || 0),
                recNo: d.recordNumber
            };
        });

        populateSupplierDropdown();
        applyFilters(); // Initial render

    } catch (error) {
        console.error("Error fetching report:", error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Error loading data</td></tr>';
    }
}

// 2. Filter Logic (Date, Supplier, Note)
function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const supplierVal = document.getElementById('supplierFilter').value;
    const noteVal = document.getElementById('noteFilter').value.toLowerCase().trim();

    filteredData = allReportData.filter(item => {
        // Date Filter
        let inDateRange = true;
        if (startDate && endDate) {
            inDateRange = item.date >= startDate && item.date <= endDate;
        }

        // Supplier Filter
        let isSupplier = true;
        if (supplierVal) {
            isSupplier = item.partyName === supplierVal;
        }

        // Note Filter (Partial Search)
        let isNoteMatch = true;
        if (noteVal) {
            const noteText = item.note.toLowerCase();
            const partyText = item.partyName.toLowerCase();
            // Search in Note OR Supplier Name
            isNoteMatch = noteText.includes(noteVal) || partyText.includes(noteVal);
        }

        return inDateRange && isSupplier && isNoteMatch;
    });

    renderTable();
    updateSummaryPills();
}

// 3. Render Table
function renderTable() {
    const tableBody = document.getElementById('report-table-body');
    const noDataMsg = document.getElementById('no-data-msg');

    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        noDataMsg.classList.remove('d-none');
        return;
    }
    noDataMsg.classList.add('d-none');

    tableBody.innerHTML = filteredData.map(item => `
        <tr>
            <td class="ps-3 text-nowrap text-muted small">${formatDateShort(item.date)}</td>
            <td>
                <div class="fw-bold text-dark">${item.partyName}</div>
                <div class="small text-muted" style="font-size: 0.75rem;">Rec #${item.recNo}</div>
            </td>
            <td>
                ${item.note ? `<span class="badge bg-light text-dark border fw-normal text-wrap text-start">${item.note}</span>` : '-'}
            </td>
            <td class="text-end fw-bold">${item.pcs}</td>
            <td class="text-end pe-3 fw-bold text-primary">${item.cft.toFixed(2)}</td>
        </tr>
    `).join('');
}

// 4. Update Daily/Summary Pills
function updateSummaryPills() {
    let totalRecords = filteredData.length;
    let totalPcs = filteredData.reduce((sum, item) => sum + item.pcs, 0);
    let totalCft = filteredData.reduce((sum, item) => sum + item.cft, 0);

    // Animate numbers (Optional, simple update for now)
    document.getElementById('sum-records').innerText = totalRecords;
    document.getElementById('sum-pcs').innerText = totalPcs;
    document.getElementById('sum-cft').innerText = totalCft.toFixed(2);
}

// 5. Populate Dropdown
function populateSupplierDropdown() {
    const select = document.getElementById('supplierFilter');
    const suppliers = [...new Set(allReportData.map(item => item.partyName))].sort();
    
    // Keep first option
    select.innerHTML = '<option value="">All Suppliers</option>';
    
    suppliers.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.innerText = name;
        select.appendChild(option);
    });
}

// 6. Excel Download Logic
function downloadExcel() {
    if (filteredData.length === 0) return alert("No data to export.");

    // Prepare data for Excel
    const dataForSheet = [
        ["Date", "Record No", "Supplier Name", "Note / Remarks", "Total PCS", "Total CFT"]
    ];

    filteredData.forEach(item => {
        dataForSheet.push([
            item.date,
            item.recNo,
            item.partyName,
            item.note,
            item.pcs,
            item.cft
        ]);
    });

    // Add Grand Totals Row
    const totalPcs = document.getElementById('sum-pcs').innerText;
    const totalCft = document.getElementById('sum-cft').innerText;
    dataForSheet.push(["", "", "GRAND TOTAL", "", totalPcs, totalCft]);

    // Create File
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
    
    // Auto-width columns (Basic)
    ws['!cols'] = [{wch:12}, {wch:10}, {wch:25}, {wch:25}, {wch:10}, {wch:12}];

    XLSX.utils.book_append_sheet(wb, ws, "Filtered Report");
    
    const startDate = document.getElementById('startDate').value;
    XLSX.writeFile(wb, `Report_${startDate}_Generated.xlsx`);
}

// Helper: DD/MM Date format
function formatDateShort(dateString) {
    if(!dateString) return '-';
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}