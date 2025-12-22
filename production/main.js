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
    const listContainer = document.getElementById('records-list-container');
    const noRecordsMsg = document.getElementById('no-records-msg');
    
    // Show spinner handled in HTML initial state, but helpful to be explicit
    // listContainer.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const snapshot = await recordsCollection.orderBy('recordNumber', 'desc').get();
        allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        populatePartyFilter(); 

        if (allRecords.length === 0) {
            noRecordsMsg.classList.remove('d-none');
            listContainer.innerHTML = '';
        } else {
            noRecordsMsg.classList.add('d-none');
            renderRecords(allRecords);
        }
    } catch (error) {
        console.error(error);
        listContainer.innerHTML = '<div class="text-center text-danger mt-4">Error loading data.</div>';
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

// UPDATED: Renders Cards instead of Table Rows
function renderRecords(recordsToDisplay) {
    const listContainer = document.getElementById('records-list-container');
    
    if (recordsToDisplay.length === 0) {
        listContainer.innerHTML = '';
        document.getElementById('no-records-msg').classList.remove('d-none');
        return;
    }
    document.getElementById('no-records-msg').classList.add('d-none');
    
    listContainer.innerHTML = recordsToDisplay.map(record => {
        const totals = record.totals || {};
        // Get first letter of supplier for the icon
        const initial = record.partyName ? record.partyName.charAt(0).toUpperCase() : '?';
        
        return `
            <div class="record-card" onclick="editRecord('${record.id}')">
                <div class="record-icon">
                    ${initial}
                </div>
                <div class="record-info">
                    <div class="record-title">${record.partyName || 'Unknown'}</div>
                    <div class="record-meta">
                        <span class="badge bg-light text-dark border">#${record.recordNumber}</span>
                        <span class="ms-1 text-muted"><i class="bi bi-calendar3"></i> ${formatDate(record.date)}</span>
                    </div>
                </div>
                <div class="record-stat">
                    <div class="stat-value">${totals.cft || '0.00'}</div>
                    <div class="stat-label">CFT</div>
                </div>
                <div class="ms-2 text-muted opacity-50">
                    <i class="bi bi-chevron-right"></i>
                </div>
            </div>`;
    }).join('');
}

// Helper for nicer dates
function formatDate(dateString) {
    if(!dateString) return '-';
    // Returns DD/MM format for brevity on mobile
    const d = new Date(dateString);
    if(isNaN(d.getTime())) return dateString;
    return `${d.getDate()}/${d.getMonth()+1}`;
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
    
    // Re-apply filter
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
