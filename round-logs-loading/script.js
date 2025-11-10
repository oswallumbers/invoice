// Global variables
let currentView = 'entry';
let logsData = []; // This remains for the current entry form
// let savedLists = []; // REMOVED: This is now replaced by 'allFetchedLists' from Firestore
let allFetchedLists = []; // NEW: A cache for all lists fetched from the dashboard
let currentListId = null;
let nextListNumber = 1; // MODIFIED: This will be loaded from Firestore
let currentPage = 1;
let rowCount = 1;
const itemsPerPage = 10;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // MODIFIED: initializeApp is now async to fetch data from Firestore
    initializeApp();
    setupEventListeners();
    generateInitialRows(); // Start with just a few rows
    setTodayDate();
});

// MODIFIED: Now an async function to load data from Firestore
async function initializeApp() {
    showLoadingSpinner();
    await updateListNumberFromFirestore(); // NEW: Load the next list number from DB
    await updateDashboard(); // MODIFIED: This will now fetch from Firestore
    hideLoadingSpinner();
}

// NEW: Fetches the next list number from a 'metadata' collection
async function updateListNumberFromFirestore() {
    const metadataRef = db.collection('metadata').doc('counter');
    const doc = await metadataRef.get();

    if (doc.exists) {
        nextListNumber = doc.data().nextListNumber;
    } else {
        // If counter doesn't exist, this might be the first run.
        // We'll set it to 1 and initialize it in the database.
        nextListNumber = 1;
        await metadataRef.set({ nextListNumber: 1 });
    }
    // Update the UI field
    updateListNumber();
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('entryNav').addEventListener('click', function(e) {
        e.preventDefault();
        switchView('entry');
    });
    
    document.getElementById('dashboardNav').addEventListener('click', function(e) {
        e.preventDefault();
        switchView('dashboard');
    });
    
    // Form buttons
    document.getElementById('saveBtn').addEventListener('click', saveData);
    document.getElementById('editBtn').addEventListener('click', editData);
    document.getElementById('printBtn').addEventListener('click', showPrintPreview);
    document.getElementById('signOutBtn').addEventListener('click', signOutUser);
    
    // Dashboard search and filter
    document.getElementById('searchInput').addEventListener('input', filterDashboard);
    document.getElementById('filterBtn').addEventListener('click', filterDashboard);
    
    // Print modal
    document.getElementById('confirmPrintBtn').addEventListener('click', function() {
        printCurrentData();
    });
}

// Switch between views
function switchView(view) {
    currentView = view;
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (view === 'entry') {
        document.getElementById('entryView').style.display = 'block';
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('entryNav').classList.add('active');
    } else if (view === 'dashboard') {
        document.getElementById('entryView').style.display = 'none';
        document.getElementById('dashboardView').style.display = 'block';
        document.getElementById('dashboardNav').classList.add('active');
        
        // MODIFIED: updateDashboard is now async
        updateDashboard();
    }
}

// Generate initial rows (start with just a few)
function generateInitialRows() {
    const tableBody = document.getElementById('logsTableBody');
    tableBody.innerHTML = '';
    rowCount = 1;
    
    // Start with 5 rows
    for (let i = 1; i <= 5; i++) {
        addTableRow();
    }
}

// Add a new table row (No changes needed)
function addTableRow() {
    const tableBody = document.getElementById('logsTableBody');
    const row = document.createElement('tr');
    
    // Use the current row count
    const currentRowNumber = rowCount;
    
    row.innerHTML = `
        <td>
            <button class="btn btn-sm btn-danger delete-row-btn" data-row="${currentRowNumber}" title="Delete Row">
                <i class="bi bi-trash"></i>
            </button>
        </td>
        <td>${currentRowNumber}</td>
        <td><input type="number" class="length-input" data-row="${currentRowNumber}" step="0.01"></td>
        <td><input type="number" class="allowance-input" data-row="${currentRowNumber}" step="0.01" readonly></td>
        <td><input type="number" class="girth-input" data-row="${currentRowNumber}" step="0.01"></td>
        <td><input type="number" class="cft-input" data-row="${currentRowNumber}" step="0.01" readonly></td>
    `;
    tableBody.appendChild(row);
    
    // Add event listener for delete button
    const deleteBtn = row.querySelector('.delete-row-btn');
    deleteBtn.addEventListener('click', function() {
        deleteRow(currentRowNumber);
    });
    
    // Add event listeners for inputs
    const lengthInput = row.querySelector('.length-input');
    const allowanceInput = row.querySelector('.allowance-input');
    const girthInput = row.querySelector('.girth-input');
    const cftInput = row.querySelector('.cft-input');
    
    // Length input event
    lengthInput.addEventListener('input', function() {
        allowanceInput.value = this.value;
        calculateCFT(currentRowNumber);
    });
    
    // Allowance input event
    allowanceInput.addEventListener('input', function() {
        calculateCFT(currentRowNumber);
    });
    
    // Girth input event
    girthInput.addEventListener('input', function() {
        calculateCFT(currentRowNumber);
    });
    
    // Add keyboard navigation for all inputs
    [lengthInput, allowanceInput, girthInput, cftInput].forEach(input => {
        // Enter key navigation - move to the same column in the row below
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentRow = parseInt(this.dataset.row);
                const allRows = document.querySelectorAll('#logsTableBody tr');
                const isLastRow = this.closest('tr') === allRows[allRows.length - 1];
                
                if (isLastRow) {
                    // Add a new row and return the new row number
                    const newRowNumber = addNewRowAndReturnNumber();
                    
                    // Focus on the new row's same column
                    const inputClass = this.className.split(' ')[0];
                    focusOnInput(inputClass, newRowNumber);
                } else {
                    // Move to the next row's same column
                    const nextRow = currentRow + 1;
                    const inputClass = this.className.split(' ')[0];
                    const nextInput = document.querySelector(`.${inputClass}[data-row="${nextRow}"]`);
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            }
            
            // Up Arrow key navigation - move to the same column in the row above
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const currentRow = parseInt(this.dataset.row);
                if (currentRow > 1) {
                    const prevRow = currentRow - 1;
                    const inputClass = this.className.split(' ')[0];
                    const prevInput = document.querySelector(`.${inputClass}[data-row="${prevRow}"]`);
                    if (prevInput) {
                        prevInput.focus();
                    }
                }
            }
            
            // Down Arrow key navigation - move to the same column in the row below
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const currentRow = parseInt(this.dataset.row);
                const allRows = document.querySelectorAll('#logsTableBody tr');
                const isLastRow = this.closest('tr') === allRows[allRows.length - 1];
                
                if (isLastRow) {
                    // Add a new row and return the new row number
                    const newRowNumber = addNewRowAndReturnNumber();
                    
                    // Focus on the new row's same column
                    const inputClass = this.className.split(' ')[0];
                    focusOnInput(inputClass, newRowNumber);
                } else {
                    // Move to the next row's same column
                    const nextRow = currentRow + 1;
                    const inputClass = this.className.split(' ')[0];
                    const nextInput = document.querySelector(`.${inputClass}[data-row="${nextRow}"]`);
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            }
        });
    });
    
    // Increment rowCount after creating the row
    rowCount++;
}

// Delete a row (No changes needed)
function deleteRow(rowNumber) {
    const row = document.querySelector(`tr:has(.delete-row-btn[data-row="${rowNumber}"])`);
    if (!row) return;
    
    // Remove the row
    row.remove();
    
    // Renumber all rows after the deleted row
    renumberRowsAfterDeletion(rowNumber);
    
    // Update totals
    updateTotals();
    
    // Show notification
    showNotification(`Row ${rowNumber} deleted successfully`, 'success');
}

// Renumber rows after deletion (No changes needed)
function renumberRowsAfterDeletion(deletedRowNumber) {
    const allRows = document.querySelectorAll('#logsTableBody tr');
    
    allRows.forEach((row, index) => {
        const currentRowNumber = index + 1;
        const oldRowNumber = parseInt(row.querySelector('.delete-row-btn').dataset.row);
        
        // Update row number display
        row.querySelector('td:nth-child(2)').textContent = currentRowNumber;
        
        // Update delete button data attribute
        row.querySelector('.delete-row-btn').dataset.row = currentRowNumber;
        
        // Update all input data attributes
        row.querySelectorAll('input').forEach(input => {
            input.dataset.row = currentRowNumber;
        });
        
        // If this row was after the deleted row, we need to recalculate CFT
        if (oldRowNumber > deletedRowNumber) {
            const lengthInput = row.querySelector('.length-input');
            const allowanceInput = row.querySelector('.allowance-input');
            const girthInput = row.querySelector('.girth-input');
            
            // Recalculate CFT for this row
            const allowance = parseFloat(allowanceInput.value) || 0;
            const girth = parseFloat(girthInput.value) || 0;
            const cft = (allowance * girth * girth / 16000000 * 35.315).toFixed(2);
            row.querySelector('.cft-input').value = cft;
        }
    });
    
    // Update the global row count
    rowCount = allRows.length + 1;
}

// Add a new row and return the new row number (No changes needed)
function addNewRowAndReturnNumber() {
    const newRowNumber = rowCount;
    addTableRow();
    return newRowNumber;
}

// Focus on an input in a specific row (No changes needed)
function focusOnInput(inputClass, rowNumber) {
    // Use requestAnimationFrame to ensure the DOM is updated
    requestAnimationFrame(() => {
        const input = document.querySelector(`.${inputClass}[data-row="${rowNumber}"]`);
        if (input) {
            input.focus();
        }
    });
}

// Calculate CFT (No changes needed)
function calculateCFT(row) {
    const allowanceInput = document.querySelector(`.allowance-input[data-row="${row}"]`);
    const girthInput = document.querySelector(`.girth-input[data-row="${row}"]`);
    const cftInput = document.querySelector(`.cft-input[data-row="${row}"]`);
    
    if (!allowanceInput || !girthInput || !cftInput) {
        console.error(`Could not find input elements for row ${row}`);
        return;
    }
    
    const allowance = parseFloat(allowanceInput.value) || 0;
    const girth = parseFloat(girthInput.value) || 0;
    
    const cft = (allowance * girth * girth / 16000000 * 35.315).toFixed(2);
    cftInput.value = cft;
    
    updateTotals();
}

// Update totals (No changes needed)
function updateTotals() {
    let totalCFT = 0;
    let totalPCS = 0;
    
    document.querySelectorAll('.cft-input').forEach(input => {
        const value = parseFloat(input.value) || 0;
        totalCFT += value;
    });
    
    document.querySelectorAll('.length-input').forEach(input => {
        if (input.value) {
            totalPCS++;
        }
    });
    
    document.getElementById('totalCFT').textContent = totalCFT.toFixed(2);
    document.getElementById('grandTotalCFT').textContent = totalCFT.toFixed(2);
    document.getElementById('grandTotalCBM').textContent = (totalCFT / 27.74).toFixed(2);
    document.getElementById('totalPCS').textContent = totalPCS;
}

// Update list number (No changes needed)
function updateListNumber() {
    const listNumber = `OLPL/LOG/${String(nextListNumber).padStart(3, '0')}`;
    document.getElementById('listNumber').value = listNumber;
}

// Set today's date (No changes needed)
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// MODIFIED: This function is now async to save to Firestore
async function saveData() {
    showLoadingSpinner();
    
    // Validate form (No change)
    const listNumber = document.getElementById('listNumber').value;
    const date = document.getElementById('date').value;
    const partyName = document.getElementById('partyName').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const productType = document.getElementById('productType').value;
    
    if (!date || !partyName || !vehicleNumber || !productType) {
        showNotification('Please fill all required fields', 'error');
        hideLoadingSpinner();
        return;
    }
    
    // Collect log data (No change)
    const logs = [];
    let totalCFT = 0;
    let totalPCS = 0;
    
    document.querySelectorAll('.length-input').forEach((input, index) => {
        const row = index + 1;
        const length = parseFloat(input.value) || 0;
        const allowance = parseFloat(document.querySelector(`.allowance-input[data-row="${row}"]`).value) || 0;
        const girth = parseFloat(document.querySelector(`.girth-input[data-row="${row}"]`).value) || 0;
        const cft = parseFloat(document.querySelector(`.cft-input[data-row="${row}"]`).value) || 0;
        
        if (length > 0 && girth > 0) {
            logs.push({
                srNo: row,
                length: length,
                allowance: allowance,
                girth: girth,
                cft: cft
            });
            
            totalCFT += cft;
            totalPCS++;
        }
    });
    
    if (logs.length === 0) {
        showNotification('Please enter at least one log entry', 'error');
        hideLoadingSpinner();
        return;
    }
    
    // Create list object (No 'id' field, Firestore will add it)
    const list = {
        listNumber: listNumber,
        date: date,
        partyName: partyName,
        vehicleNumber: vehicleNumber,
        productType: productType,
        logs: logs,
        totalCFT: totalCFT,
        totalCBM: totalCFT / 27.74,
        totalPCS: totalPCS,
        createdAt: new Date().toISOString()
    };
    
    // NEW: Save to Firestore
    try {
        if (currentListId) {
            // Update existing list in Firestore
            await db.collection('lists').doc(currentListId).update(list);
            showNotification('Data updated successfully', 'success');
        } else {
            // Add new list to Firestore
            const docRef = await db.collection('lists').add(list);
            
            // NEW: Update the document with its own ID for easier reference later
            await db.collection('lists').doc(docRef.id).update({ id: docRef.id });

            // NEW: Increment and save the next list number in Firestore
            nextListNumber++;
            await db.collection('metadata').doc('counter').set({ nextListNumber: nextListNumber });
            
            updateListNumber(); // Update UI with new number
            resetForm(); // Reset form for new entry
            showNotification('Data saved successfully', 'success');
        }
        
        // NEW: Invalidate dashboard cache and reload
        allFetchedLists = []; 
        await updateDashboard(); // Refresh dashboard data

    } catch (error) {
        console.error("Error saving data: ", error);
        showNotification('Error saving data. See console for details.', 'error');
    } finally {
        currentListId = null;
        hideLoadingSpinner();
    }
}

// Edit data (No changes needed, just a helper)
function editData() {
    showNotification('Select a list from the dashboard to edit', 'info');
    switchView('dashboard');
}

// Show print preview (No changes needed)
function showPrintPreview() {
    // Validate form
    const listNumber = document.getElementById('listNumber').value;
    const date = document.getElementById('date').value;
    const partyName = document.getElementById('partyName').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const productType = document.getElementById('productType').value;
    
    if (!date || !partyName || !vehicleNumber || !productType) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Collect log data
    const logs = [];
    let totalCFT = 0;
    
    document.querySelectorAll('.length-input').forEach((input, index) => {
        const row = index + 1;
        const length = parseFloat(input.value) || 0;
        const allowance = parseFloat(document.querySelector(`.allowance-input[data-row="${row}"]`).value) || 0;
        const girth = parseFloat(document.querySelector(`.girth-input[data-row="${row}"]`).value) || 0;
        const cft = parseFloat(document.querySelector(`.cft-input[data-row="${row}"]`).value) || 0;
        
        if (length > 0 && girth > 0) {
            logs.push({
                srNo: row,
                length: length,
                allowance: allowance,
                girth: girth,
                cft: cft
            });
            
            totalCFT += cft;
        }
    });
    
    if (logs.length === 0) {
        showNotification('Please enter at least one log entry', 'error');
        return;
    }
    
    // Generate print preview
    const printPreviewContainer = document.getElementById('printPreviewContainer');
    printPreviewContainer.innerHTML = generatePrintHTML(listNumber, date, partyName, vehicleNumber, productType, logs, totalCFT);
    
    // Show modal
    const printPreviewModal = new bootstrap.Modal(document.getElementById('printPreviewModal'));
    printPreviewModal.show();
}

// Print current data (No changes needed)
function printCurrentData() {
    // Validate form
    const listNumber = document.getElementById('listNumber').value;
    const date = document.getElementById('date').value;
    const partyName = document.getElementById('partyName').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const productType = document.getElementById('productType').value;
    
    if (!date || !partyName || !vehicleNumber || !productType) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Collect log data
    const logs = [];
    let totalCFT = 0;
    
    document.querySelectorAll('.length-input').forEach((input, index) => {
        const row = index + 1;
        const length = parseFloat(input.value) || 0;
        const allowance = parseFloat(document.querySelector(`.allowance-input[data-row="${row}"]`).value) || 0;
        const girth = parseFloat(document.querySelector(`.girth-input[data-row="${row}"]`).value) || 0;
        const cft = parseFloat(document.querySelector(`.cft-input[data-row="${row}"]`).value) || 0;
        
        if (length > 0 && girth > 0) {
            logs.push({
                srNo: row,
                length: length,
                allowance: allowance,
                girth: girth,
                cft: cft
            });
            
            totalCFT += cft;
        }
    });
    
    if (logs.length === 0) {
        showNotification('Please enter at least one log entry', 'error');
        return;
    }
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print - ${listNumber}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .header-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .header-left, .header-right {
                    text-align: left;
                    width: 48%;
                }
                .two-column-table {
                    display: flex;
                    justify-content: space-between;
                }
                .column-table {
                    width: 48%;
                }
                .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .print-table th, .print-table td {
                    border: 1px solid #000;
                    padding: 5px;
                    text-align: center;
                }
                .print-table th {
                    background-color: #f2f2f2;
                }
                .print-footer {
                    margin-top: 20px;
                    text-align: center;
                }
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                }
            </style>
        </head>
        <body>
            ${generatePrintHTML(listNumber, date, partyName, vehicleNumber, productType, logs, totalCFT)}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for the content to load before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// Generate print HTML (No changes needed)
function generatePrintHTML(listNumber, date, partyName, vehicleNumber, productType, logs, totalCFT) {
    let html = `
        <div class="print-header">
            <h2>OSWAL LUMBERS PVT LTD</h2>
            <h3>${productType}</h3>
            
            <div class="header-info">
                <div class="header-left">
                    <p><strong>List Number:</strong> ${listNumber}</p>
                    <p><strong>Party Name:</strong> ${partyName}</p>
                </div>
                <div class="header-right">
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
                </div>
            </div>
        </div>
    `;
    
    // Split logs into two columns for printing
    const leftColumnLogs = logs.slice(0, 50);
    const rightColumnLogs = logs.slice(50, 100);
    
    html += '<div class="two-column-table">';
    
    // Left column
    html += '<div class="column-table">';
    html += '<table class="print-table">';
    html += '<thead><tr><th>Sr No</th><th>Length</th><th>Allowance</th><th>Girth</th><th>CFT</th></tr></thead>';
    html += '<tbody>';
    
    leftColumnLogs.forEach(log => {
        html += `<tr>
            <td>${log.srNo}</td>
            <td>${log.length}</td>
            <td>${log.allowance}</td>
            <td>${log.girth}</td>
            <td>${log.cft.toFixed(2)}</td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // Right column
    html += '<div class="column-table">';
    html += '<table class="print-table">';
    html += '<thead><tr><th>Sr No</th><th>Length</th><th>Allowance</th><th>Girth</th><th>CFT</th></tr></thead>';
    html += '<tbody>';
    
    rightColumnLogs.forEach(log => {
        html += `<tr>
            <td>${log.srNo}</td>
            <td>${log.length}</td>
            <td>${log.allowance}</td>
            <td>${log.girth}</td>
            <td>${log.cft.toFixed(2)}</td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    html += '</div>';
    
    // Grand total
    html += `
        <div class="print-footer">
            <h3>Grand Total</h3>
            <p><strong>Total CFT:</strong> ${totalCFT.toFixed(2)}</p>
            <p><strong>Total CBM:</strong> ${(totalCFT / 27.74).toFixed(2)}</p>
            <p><strong>Total PCS:</strong> ${logs.length}</p>
        </div>
    `;
    
    return html;
}

// MODIFIED: Fetches data from Firestore
async function updateDashboard() {
    showLoadingSpinner();
    const tableBody = document.getElementById('dashboardTableBody');
    tableBody.innerHTML = '';

    try {
        // NEW: Only fetch from Firestore if the local cache 'allFetchedLists' is empty.
        // This avoids unnecessary reads every time you switch views.
        // The cache is cleared when you save or update data.
        if (allFetchedLists.length === 0) {
            // Note: For large databases, you should filter/paginate using Firestore queries.
            // For simplicity, we are fetching all documents and filtering locally.
            const snapshot = await db.collection('lists').orderBy('date', 'desc').get();
            allFetchedLists = snapshot.docs.map(doc => doc.data());
        }

        // Filter and paginate data (now uses the fetched list)
        const filteredLists = filterLists(allFetchedLists);
        const paginatedLists = paginateLists(filteredLists);
        
        // Generate table rows (No change in this logic)
        paginatedLists.forEach(list => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${list.listNumber}</td>
                <td>${list.date}</td>
                <td>${list.partyName}</td>
                <td>${list.vehicleNumber}</td>
                <td>${list.productType}</td>
                <td>${list.totalCFT.toFixed(2)}</td>
                <td>${list.totalCBM.toFixed(2)}</td>
                <td>${list.totalPCS}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-list-btn" data-id="${list.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger print-list-btn" data-id="${list.id}">
                        <i class="bi bi-printer"></i>
                    </button>
                    <button class="btn btn-sm btn-success export-list-btn" data-id="${list.id}">
                        <i class="bi bi-file-earmark-excel"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons (No change)
        document.querySelectorAll('.edit-list-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                loadListForEditing(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.print-list-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                printList(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.export-list-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                exportListToExcel(this.dataset.id);
            });
        });
        
        // Update pagination (No change)
        updatePagination(filteredLists.length);

    } catch (error) {
        console.error("Error loading dashboard data: ", error);
        showNotification('Error loading dashboard. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// MODIFIED: Accepts a list to filter, instead of using global 'savedLists'
function filterLists(listsToFilter) {
    let filtered = [...listsToFilter];
    
    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(list => 
            (list.listNumber && list.listNumber.toLowerCase().includes(searchTerm)) ||
            (list.partyName && list.partyName.toLowerCase().includes(searchTerm)) ||
            (list.vehicleNumber && list.vehicleNumber.toLowerCase().includes(searchTerm))
        );
    }
    
    // Date filter
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    
    if (dateFrom) {
        filtered = filtered.filter(list => list.date >= dateFrom);
    }
    
    if (dateTo) {
        filtered = filtered.filter(list => list.date <= dateTo);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return filtered;
}

// Paginate lists (No changes needed)
function paginateLists(lists) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return lists.slice(startIndex, endIndex);
}

// Update pagination (No changes needed)
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('dashboardPagination');
    pagination.innerHTML = '';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
    prevLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            updateDashboard();
        }
    });
    pagination.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage = i;
            updateDashboard();
        });
        pagination.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
    nextLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            updateDashboard();
        }
    });
    pagination.appendChild(nextLi);
}

// Filter dashboard (No changes needed)
function filterDashboard() {
    currentPage = 1;
    updateDashboard();
}

// MODIFIED: Now async, fetches the specific document from Firestore
async function loadListForEditing(listId) {
    showLoadingSpinner();
    try {
        const docRef = db.collection('lists').doc(listId);
        const doc = await docRef.get();

        if (!doc.exists) {
            showNotification('Error: List not found.', 'error');
            hideLoadingSpinner();
            return;
        }

        const list = doc.data();
        
        // Switch to entry view
        switchView('entry');
        
        // Load list data into form (No change in this logic)
        document.getElementById('listNumber').value = list.listNumber;
        document.getElementById('date').value = list.date;
        document.getElementById('partyName').value = list.partyName;
        document.getElementById('vehicleNumber').value = list.vehicleNumber;
        document.getElementById('productType').value = list.productType;
        
        // Clear existing rows
        document.getElementById('logsTableBody').innerHTML = '';
        rowCount = 1;
        
        // Load log data into table (No change in this logic)
        list.logs.forEach(log => {
            addTableRow();
            const lengthInput = document.querySelector(`.length-input[data-row="${log.srNo}"]`);
            const allowanceInput = document.querySelector(`.allowance-input[data-row="${log.srNo}"]`);
            const girthInput = document.querySelector(`.girth-input[data-row="${log.srNo}"]`);
            const cftInput = document.querySelector(`.cft-input[data-row="${log.srNo}"]`);
            
            if (lengthInput) {
                lengthInput.value = log.length;
                allowanceInput.value = log.allowance;
                girthInput.value = log.girth;
                cftInput.value = log.cft;
            }
        });
        
        // Add a few empty rows for new entries
        for (let i = 0; i < 3; i++) {
            addTableRow();
        }
        
        // Update totals
        updateTotals();
        
        // Set current list ID
        currentListId = list.id;
        
        showNotification('List loaded for editing', 'info');

    } catch (error) {
        console.error("Error loading list for editing: ", error);
        showNotification('Error loading list. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// MODIFIED: Now async, fetches the specific document from Firestore
async function printList(listId) {
    showLoadingSpinner();
    try {
        const doc = await db.collection('lists').doc(listId).get();
        if (!doc.exists) {
            showNotification('Error: List not found.', 'error');
            return;
        }
        const list = doc.data();
        
        // Generate print HTML (No change in this logic)
        const printHTML = generatePrintHTML(
            list.listNumber,
            list.date,
            list.partyName,
            list.vehicleNumber,
            list.productType,
            list.logs,
            list.totalCFT
        );
        
        // Create a new window for printing (No change in this logic)
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print - ${list.listNumber}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    .header-left, .header-right {
                        text-align: left;
                        width: 48%;
                    }
                    .two-column-table {
                        display: flex;
                        justify-content: space-between;
                    }
                    .column-table {
                        width: 48%;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #000;
                        padding: 5px;
                        text-align: center;
                    }
                    .print-table th {
                        background-color: #f2f2f2;
                    }
                    .print-footer {
                        margin-top: 20px;
                        text-align: center;
                    }
                    @media print {
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                    }
                </style>
            </head>
            <body>
                ${printHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for the content to load before printing
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);

    } catch (error) {
        console.error("Error printing list: ", error);
        showNotification('Error printing list. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// MODIFIED: Now async, fetches the specific document from Firestore
async function exportListToExcel(listId) {
    showLoadingSpinner();
    try {
        const doc = await db.collection('lists').doc(listId).get();
        if (!doc.exists) {
            showNotification('Error: List not found.', 'error');
            return;
        }
        const list = doc.data();
        
        // Create a new workbook (No change in this logic)
        const wb = XLSX.utils.book_new();
        
        // Create header row
        const header = [
            ['OSWAL LUMBERS PVT LTD'],
            [''],
            ['List Number:', list.listNumber],
            ['Date:', list.date],
            ['Party Name:', list.partyName],
            ['Vehicle Number:', list.vehicleNumber],
            ['Product Type:', list.productType],
            [''],
            ['Sr No', 'Length', 'Length Allowance', 'Girth', 'CFT']
        ];
        
        // Add log data
        const data = list.logs.map(log => [
            log.srNo,
            log.length,
            log.allowance,
            log.girth,
            log.cft.toFixed(2)
        ]);
        
        // Add totals
        data.push([]);
        data.push(['Total CFT:', '', '', '', list.totalCFT.toFixed(2)]);
        data.push(['Total CBM:', '', '', '', list.totalCBM.toFixed(2)]);
        data.push(['Total PCS:', '', '', '', list.totalPCS]);
        
        // Combine header and data
        const wsData = [...header, ...data];
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Log List');
        
        // Generate filename
        const filename = `${list.listNumber}_${list.date}_${list.partyName.replace(/\s+/g, '_')}.xlsx`;
        
        // Save the file
        XLSX.writeFile(wb, filename);
        
        showNotification('List exported to Excel successfully', 'success');

    } catch (error) {
        console.error("Error exporting list: ", error);
        showNotification('Error exporting list. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Reset form (No changes needed)
function resetForm() {
    document.getElementById('logForm').reset();
    setTodayDate();
    updateListNumber();
    
    // Clear table and regenerate initial rows
    generateInitialRows();
    
    // Update totals
    updateTotals();
}

// Show notification (No changes needed)
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Show loading spinner (No changes needed)
function showLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

// Hide loading spinner (No changes needed)
function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}
// NEW: Function to sign the user out
function signOutUser() {
    showLoadingSpinner();
    firebase.auth().signOut()
        .then(() => {
            // Sign-out successful.
            // The auth listener in index.html will catch this
            // and redirect to login.html.
            console.log('User signed out.');
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Sign out error', error);
            showNotification('Error signing out', 'error');
            hideLoadingSpinner();
        });
}
