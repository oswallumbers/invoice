// Controls index.html

let allRecords = []; 

function initializeMainPage() {
    const searchInput = document.getElementById('searchInput');
    const partyFilter = document.getElementById('partyFilter');
    
    if (searchInput) searchInput.addEventListener('keyup', filterAndRender);
    if (partyFilter) partyFilter.addEventListener('change', filterAndRender);
    
    fetchAndDisplayRecords();
}

async function fetchAndDisplayRecords() {
    const tableBody = document.getElementById('records-table-body');
    const noRecordsMsg = document.getElementById('no-records-msg');
    
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div></td></tr>';
    
    try {
        const snapshot = await recordsCollection.orderBy('recordNumber', 'desc').get();
        allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        populatePartyFilter(); 

        if (allRecords.length === 0) {
            noRecordsMsg.style.display = 'block';
            tableBody.innerHTML = '';
        } else {
            noRecordsMsg.style.display = 'none';
            renderRecords(allRecords);
        }
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading data.</td></tr>';
    }
}

function populatePartyFilter() {
    const partyFilter = document.getElementById('partyFilter');
    const partyNames = new Set(allRecords.map(record => record.partyName));
    partyFilter.innerHTML = '<option value="">All Suppliers</option>'; 
    partyNames.forEach(name => {
        if(name) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            partyFilter.appendChild(option);
        }
    });
}

function renderRecords(recordsToDisplay) {
    const tableBody = document.getElementById('records-table-body');
    if (recordsToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No matching records found.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = recordsToDisplay.map(record => {
        const totals = record.totals || {};
        return `
            <tr>
                <td><strong>${record.recordNumber || ''}</strong></td>
                <td>${record.partyName || '-'}</td>
                <td>${record.date}</td>
                <td>${totals.pcs || 0}</td>
                <td>${totals.cft || '0.00'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="editRecord('${record.id}')">Open</button>
                </td>
            </tr>`;
    }).join('');
}

function filterAndRender() {
    const partyValue = document.getElementById('partyFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filteredRecords = allRecords;

    if (partyValue) filteredRecords = filteredRecords.filter(record => record.partyName === partyValue);
    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record => {
            const partyName = record.partyName ? record.partyName.toLowerCase() : '';
            const recordNumber = record.recordNumber ? record.recordNumber.toString() : '';
            return partyName.includes(searchTerm) || recordNumber.includes(searchTerm);
        });
    }
    renderRecords(filteredRecords);
}

function editRecord(recordId) {
    window.location.href = `entry.html?id=${recordId}`;
}

function exportMainListToExcel() {
    // Get currently filtered records
    const partyValue = document.getElementById('partyFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Re-apply filter to ensure we export what we see
    let recordsToExport = allRecords;
    if (partyValue) recordsToExport = recordsToExport.filter(r => r.partyName === partyValue);
    if (searchTerm) {
        recordsToExport = recordsToExport.filter(r => (r.partyName || '').toLowerCase().includes(searchTerm) || (r.recordNumber || '').toString().includes(searchTerm));
    }

    if (recordsToExport.length === 0) return alert("No records to export.");

    const data = [["Record No", "Supplier Name", "Date", "Total PCS", "Total CFT", "Total CBM"]];
    
    recordsToExport.forEach(r => {
        const t = r.totals || {};
        data.push([r.recordNumber, r.partyName, r.date, t.pcs, t.cft, t.cbm]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Records List");
    XLSX.writeFile(wb, "All_Records.xlsx");
}