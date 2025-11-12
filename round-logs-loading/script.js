// Global variables
let currentView = 'entry';
let logsData = []; // This remains for the current entry form
let allFetchedLists = []; // NEW: A cache for all lists fetched from the dashboard
let currentListId = null;
let nextListNumber = 1; // MODIFIED: This will be loaded from Firestore
let currentPage = 1;
let rowCount = 1;
const itemsPerPage = 10;

// NEW: Global variable to store the target of the right-click
let currentContextMenuTarget = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateInitialRows(); 
    setTodayDate();
});

async function initializeApp() {
    showLoadingSpinner();
    await updateListNumberFromFirestore(); 
    await updateDashboard(); 
    hideLoadingSpinner();
}

async function updateListNumberFromFirestore() {
    // Make sure 'db' is defined in firebase-init.js
    if (typeof db === 'undefined') {
        console.error("Firestore 'db' is not initialized. Check firebase-init.js");
        return;
    }
    const metadataRef = db.collection('metadata').doc('counter');
    const doc = await metadataRef.get();

    if (doc.exists) {
        nextListNumber = doc.data().nextListNumber;
    } else {
        nextListNumber = 1;
        await metadataRef.set({ nextListNumber: 1 });
    }
    updateListNumber();
}

// 
// --- THIS FUNCTION HAS BEEN UPDATED ---
//
// Setup event listeners
function setupEventListeners() {
    // Navigation
    const entryNav = document.getElementById('entryNav');
    if (entryNav) {
        entryNav.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('entry');
        });
    }
    
    const dashboardNav = document.getElementById('dashboardNav');
    if (dashboardNav) {
        dashboardNav.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('dashboard');
        });
    }
    
    // Form buttons
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveData);
    }
    
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', editData);
    }
    
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', showPrintPreview);
    }
    
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOutUser);
    }
    
    // Dashboard search and filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterDashboard);
    }
    
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', filterDashboard);
    }
    
    // Print modal
    const confirmPrintBtn = document.getElementById('confirmPrintBtn');
    if (confirmPrintBtn) {
        confirmPrintBtn.addEventListener('click', function() {
            printCurrentData();
        });
    }

    // --- NEW: Context Menu Listeners ---
    const contextMenu = document.getElementById('tableContextMenu');
    
    // Hide menu when clicking anywhere
    document.addEventListener('click', () => {
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        currentContextMenuTarget = null;
    });

    // Action: Insert Row Below
    const insertRowBelowBtn = document.getElementById('insertRowBelow');
    if (insertRowBelowBtn) {
        insertRowBelowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentContextMenuTarget) {
                const rowNum = parseInt(currentContextMenuTarget.dataset.row);
                insertRowAfter(rowNum); // NEW Function
            }
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        });
    }
    
    // Action: Delete This Row
    const deleteCurrentRowBtn = document.getElementById('deleteCurrentRow');
    if (deleteCurrentRowBtn) {
        deleteCurrentRowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentContextMenuTarget) {
                const rowNum = parseInt(currentContextMenuTarget.dataset.row);
                deleteRow(rowNum); // Use existing delete function
            }
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        });
    }
    
    // Action: Insert Cell (Shift Down)
    const insertShiftDownBtn = document.getElementById('insertShiftDown');
    if (insertShiftDownBtn) {
        insertShiftDownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentContextMenuTarget) {
                shiftColumnData(currentContextMenuTarget, 'down'); // NEW Function
            }
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        });
    }
    
    // Action: Delete Cell (Shift Up)
    const deleteShiftUpBtn = document.getElementById('deleteShiftUp');
    if (deleteShiftUpBtn) {
        deleteShiftUpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentContextMenuTarget) {
                shiftColumnData(currentContextMenuTarget, 'up'); // NEW Function
            }
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        });
    }
    // --- END NEW ---
}
// 
// --- END OF UPDATED FUNCTION ---
// 

// Switch between views
function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const entryView = document.getElementById('entryView');
    const dashboardView = document.getElementById('dashboardView');
    const entryNav = document.getElementById('entryNav');
    const dashboardNav = document.getElementById('dashboardNav');
    
    if (view === 'entry') {
        if (entryView) entryView.style.display = 'block';
        if (dashboardView) dashboardView.style.display = 'none';
        if (entryNav) entryNav.classList.add('active');
    } else if (view === 'dashboard') {
        if (entryView) entryView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'block';
        if (dashboardNav) dashboardNav.classList.add('active');
        updateDashboard();
    }
}

// Generate initial rows (start with just a few)
function generateInitialRows() {
    const tableBody = document.getElementById('logsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    rowCount = 1;
    
    for (let i = 1; i <= 5; i++) {
        addTableRow();
    }
}

// MODIFIED: addTableRow is now simpler, it calls a separate function for listeners
function addTableRow() {
    const tableBody = document.getElementById('logsTableBody');
    if (!tableBody) return;
    const row = document.createElement('tr');
    
    const currentRowNumber = rowCount;
    
    row.innerHTML = `
        <td>
            <button class="btn btn-sm btn-danger delete-row-btn" data-row="${currentRowNumber}" title="Delete Row">
                <i class="bi bi-trash"></i>
            </button>
        </td>
        <td>${currentRowNumber}</td>
        <td><input type="number" class="length-input" data-row="${currentRowNumber}" step="0.01"></td>
        <td><input type="number" class="allowance-input" data-row="${currentRowNumber}" step="0.01"></td>
        <td><input type="number" class="girth-input" data-row="${currentRowNumber}" step="0.01"></td>
        <td><input type="number" class="cft-input" data-row="${currentRowNumber}" step="0.01" readonly></td>
    `;
    tableBody.appendChild(row);
    
    // NEW: Call the listener function for the new row
    addListenersToRow(row, currentRowNumber);
    
    rowCount++;
}

// NEW: Function to add all listeners to a specific row
function addListenersToRow(row, rowNumber) {
    // Delete button
    const deleteBtn = row.querySelector('.delete-row-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            deleteRow(rowNumber);
        });
    }
    
    // Input elements
    const lengthInput = row.querySelector('.length-input');
    const allowanceInput = row.querySelector('.allowance-input');
    const girthInput = row.querySelector('.girth-input');
    const cftInput = row.querySelector('.cft-input');
    
    // Calculation events
    if (lengthInput && allowanceInput) {
        lengthInput.addEventListener('input', function() {
            allowanceInput.value = this.value;
            calculateCFT(rowNumber);
        });
    }
    if (allowanceInput) {
        allowanceInput.addEventListener('input', () => calculateCFT(rowNumber));
    }
    if (girthInput) {
        girthInput.addEventListener('input', () => calculateCFT(rowNumber));
    }
    
    // Add keyboard navigation and context menu for all inputs
    [lengthInput, allowanceInput, girthInput, cftInput].forEach(input => {
        if (!input) return; // Safety check
        
        // Keydown navigation (Enter, Up, Down)
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                const currentRow = parseInt(this.dataset.row);
                const allRows = document.querySelectorAll('#logsTableBody tr');
                const isLastRow = this.closest('tr') === allRows[allRows.length - 1];
                
                if (isLastRow) {
                    const newRowNumber = addNewRowAndReturnNumber();
                    focusOnInput(this.className.split(' ')[0], newRowNumber);
                } else {
                    focusOnInput(this.className.split(' ')[0], currentRow + 1);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const currentRow = parseInt(this.dataset.row);
                if (currentRow > 1) {
                    focusOnInput(this.className.split(' ')[0], currentRow - 1);
                }
            }
        });
        
        // NEW: Right-click context menu listener
        input.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            currentContextMenuTarget = e.target; // Store the clicked input
            
            const contextMenu = document.getElementById('tableContextMenu');
            if (contextMenu) {
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.top = `${e.clientY}px`;
            }
            
            // Disable cell-shift options for the read-only 'CFT' column
            const isCFT = e.target.classList.contains('cft-input');
            const insertShiftDownItem = document.getElementById('insertShiftDown');
            const deleteShiftUpItem = document.getElementById('deleteShiftUp');
            
            if (insertShiftDownItem) insertShiftDownItem.style.display = isCFT ? 'none' : 'block';
            if (deleteShiftUpItem) deleteShiftUpItem.style.display = isCFT ? 'none' : 'block';
            
            // Also hide the divider if both are hidden
            const divider = deleteShiftUpItem ? deleteShiftUpItem.previousElementSibling : null;
            if (divider && divider.classList.contains('dropdown-divider')) {
                divider.style.display = isCFT ? 'none' : 'block';
            }
        });
    });
}

// NEW: Function to insert a new row *after* a specific row
function insertRowAfter(rowNumber) {
    const tableBody = document.getElementById('logsTableBody');
    if (!tableBody) return;
    const allRows = Array.from(tableBody.querySelectorAll('tr'));
    const targetRow = allRows[rowNumber - 1]; // -1 because rowNumber is 1-based
    
    if (!targetRow) {
        addTableRow(); // If it's the last row, just add to end
        return;
    }
    
    // Create a new blank row
    const newRow = document.createElement('tr');
    // Row number will be fixed by renumbering
    newRow.innerHTML = `
        <td><button class="btn btn-sm btn-danger delete-row-btn" data-row="${rowNumber + 1}"><i class="bi bi-trash"></i></button></td>
        <td>${rowNumber + 1}</td>
        <td><input type="number" class="length-input" data-row="${rowNumber + 1}" step="0.01"></td>
        <td><input type="number" class="allowance-input" data-row="${rowNumber + 1}" step="0.01"></td>
        <td><input type="number" class="girth-input" data-row="${rowNumber + 1}" step="0.01"></td>
        <td><input type="number" class="cft-input" data-row="${rowNumber + 1}" step="0.01" readonly></td>
    `;
    
    // Insert the new row *after* the target row
    targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);
    
    // Re-add listeners to the new row
    addListenersToRow(newRow, rowNumber + 1);
    
    // Renumber all rows starting from the one *after* the inserted row
    renumberRowsAfterDeletion(rowNumber);
    updateTotals();
}

// NEW: Function to shift data in a single column
function shiftColumnData(targetInput, direction) {
    const columnClass = targetInput.className.split(' ')[0]; // e.g., 'girth-input'
    const startRow = parseInt(targetInput.dataset.row);
    
    if (direction === 'down') {
        // --- Shift Down (Insert) ---
        
        // Get all inputs in this column
        let allInputsInColumn = Array.from(document.querySelectorAll(`.${columnClass}`));
        
        // Check if the last row is empty. If not, add a new row.
        const lastRowInput = allInputsInColumn[allInputsInColumn.length - 1];
        if (lastRowInput && lastRowInput.value !== '') {
            addTableRow(); // Add a new blank row at the end
            // Get the list of inputs again since we added one
            allInputsInColumn = Array.from(document.querySelectorAll(`.${columnClass}`));
        }
        
        // Iterate backwards from the second-to-last row down to the start row
        for (let i = allInputsInColumn.length - 2; i >= startRow - 1; i--) {
            const currentRowInput = allInputsInColumn[i];
            const nextRowInput = allInputsInColumn[i + 1];
            if (currentRowInput && nextRowInput) {
                nextRowInput.value = currentRowInput.value;
            }
        }
        
        // Clear the target input
        targetInput.value = '';
        
    } else if (direction === 'up') {
        // --- Shift Up (Delete) ---
        
        const allInputsInColumn = Array.from(document.querySelectorAll(`.${columnClass}`));
        
        // Iterate forwards from the start row to the second-to-last row
        for (let i = startRow - 1; i < allInputsInColumn.length - 1; i++) {
            const currentRowInput = allInputsInColumn[i];
            const nextRowInput = allInputsInColumn[i + 1];
            if (currentRowInput && nextRowInput) {
                currentRowInput.value = nextRowInput.value;
            }
        }
        
        // Clear the last input in the column
        if (allInputsInColumn.length > 0) {
            allInputsInColumn[allInputsInColumn.length - 1].value = '';
        }
    }
    
    // After shifting, recalculate CFT for all rows and update totals
    recalculateAllCFTs();
}

// NEW: Function to recalculate all CFTs after a major shift
function recalculateAllCFTs() {
    const allRows = document.querySelectorAll('#logsTableBody tr');
    allRows.forEach((row, index) => {
        const rowNum = index + 1;
        // Need to find the row number from the data-row attribute, not index
        const deleteBtn = row.querySelector('.delete-row-btn');
        if (deleteBtn) {
            const actualRowNum = deleteBtn.dataset.row;
            calculateCFT(actualRowNum); // Use existing function
        }
    });
    // updateTotals() is called by calculateCFT, so no need to call it again here.
}


// Delete a row
function deleteRow(rowNumber) {
    const row = document.querySelector(`tr:has(.delete-row-btn[data-row="${rowNumber}"])`);
    if (!row) return;
    
    row.remove();
    renumberRowsAfterDeletion(rowNumber - 1); // Renumber from the row *before* the deleted one
    updateTotals();
    showNotification(`Row ${rowNumber} deleted successfully`, 'success');
}

// MODIFIED: Renumber rows after deletion or insertion
function renumberRowsAfterDeletion(startFromRow) {
    const allRows = document.querySelectorAll('#logsTableBody tr');
    
    allRows.forEach((row, index) => {
        const currentRowNumber = index + 1;
        
        // Update row number display
        const srNoCell = row.querySelector('td:nth-child(2)');
        if (srNoCell) {
            srNoCell.textContent = currentRowNumber;
        }
        
        // Update delete button data attribute
        const deleteBtn = row.querySelector('.delete-row-btn');
        if (deleteBtn) {
            deleteBtn.dataset.row = currentRowNumber;
        }
        
        // Update all input data attributes
        row.querySelectorAll('input').forEach(input => {
            input.dataset.row = currentRowNumber;
        });
        
        // Recalculate CFT for this row
        // We need to do this in case a shift-up/down affected this
        calculateCFT(currentRowNumber);
    });
    
    // Update the global row count
    rowCount = allRows.length + 1;
    updateTotals();
}

// Add a new row and return the new row number
function addNewRowAndReturnNumber() {
    const newRowNumber = rowCount;
    addTableRow();
    return newRowNumber;
}

// Focus on an input in a specific row
function focusOnInput(inputClass, rowNumber) {
    requestAnimationFrame(() => {
        const input = document.querySelector(`.${inputClass}[data-row="${rowNumber}"]`);
        if (input) {
            input.focus();
            input.select();
        }
    });
}

// Calculate CFT
function calculateCFT(row) {
    const allowanceInput = document.querySelector(`.allowance-input[data-row="${row}"]`);
    const girthInput = document.querySelector(`.girth-input[data-row="${row}"]`);
    const cftInput = document.querySelector(`.cft-input[data-row="${row}"]`);
    
    if (!allowanceInput || !girthInput || !cftInput) {
        // This can happen if a row is being deleted, it's not an error
        return;
    }
    
    const allowance = parseFloat(allowanceInput.value) || 0;
    const girth = parseFloat(girthInput.value) || 0;
    
    const cft = (allowance * girth * girth / 16000000 * 35.315).toFixed(2);
    cftInput.value = cft;
    
    updateTotals();
}

// Update totals
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
    
    const totalCFTEl = document.getElementById('totalCFT');
    if (totalCFTEl) totalCFTEl.textContent = totalCFT.toFixed(2);
    
    const grandTotalCFTEl = document.getElementById('grandTotalCFT');
    if (grandTotalCFTEl) grandTotalCFTEl.textContent = totalCFT.toFixed(2);
    
    const grandTotalCBMEl = document.getElementById('grandTotalCBM');
    if (grandTotalCBMEl) grandTotalCBMEl.textContent = (totalCFT / 27.74).toFixed(3);
    
    const totalPCSEl = document.getElementById('totalPCS');
    if (totalPCSEl) totalPCSEl.textContent = totalPCS;
}

// Update list number
function updateListNumber() {
    const listNumberEl = document.getElementById('listNumber');
    if (listNumberEl) {
        const listNumber = `OLPL/LOG/${String(nextListNumber).padStart(3, '0')}`;
        listNumberEl.value = listNumber;
    }
}

// Set today's date
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('date');
    if (dateEl) {
        dateEl.value = today;
    }
}

// Save data (async)
async function saveData() {
    showLoadingSpinner();
    
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
    
    const logs = [];
    let totalCFT = 0;
    let totalPCS = 0;
    
    const allRows = document.querySelectorAll('#logsTableBody tr');
    allRows.forEach((row, index) => {
        const rowNum = row.querySelector('.delete-row-btn').dataset.row;
        const length = parseFloat(document.querySelector(`.length-input[data-row="${rowNum}"]`).value) || 0;
        const allowance = parseFloat(document.querySelector(`.allowance-input[data-row="${rowNum}"]`).value) || 0;
        const girth = parseFloat(document.querySelector(`.girth-input[data-row="${rowNum}"]`).value) || 0;
        const cft = parseFloat(document.querySelector(`.cft-input[data-row="${rowNum}"]`).value) || 0;
        
        if (length > 0 && girth > 0) {
            logs.push({
                srNo: index + 1, // Save the sequential Sr No
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
    
    try {
        if (currentListId) {
            await db.collection('lists').doc(currentListId).update(list);
            showNotification('Data updated successfully', 'success');
        } else {
            const docRef = await db.collection('lists').add(list);
            await db.collection('lists').doc(docRef.id).update({ id: docRef.id });
            nextListNumber++;
            await db.collection('metadata').doc('counter').set({ nextListNumber: nextListNumber });
            
            updateListNumber();
            resetForm();
            showNotification('Data saved successfully', 'success');
        }
        
        allFetchedLists = []; 
        await updateDashboard();

    } catch (error) {
        console.error("Error saving data: ", error);
        showNotification('Error saving data. See console for details.', 'error');
    } finally {
        currentListId = null;
        hideLoadingSpinner();
    }
}

// Edit data
function editData() {
    showNotification('Select a list from the dashboard to edit', 'info');
    switchView('dashboard');
}

// Show print preview
function showPrintPreview() {
    const listNumber = document.getElementById('listNumber').value;
    const date = document.getElementById('date').value;
    const partyName = document.getElementById('partyName').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const productType = document.getElementById('productType').value;
    
    if (!date || !partyName || !vehicleNumber || !productType) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    const logs = [];
    let totalCFT = 0;
    
    const allRows = document.querySelectorAll('#logsTableBody tr');
    allRows.forEach((row, index) => {
        const rowNum = row.querySelector('.delete-row-btn').dataset.row;
        const length = parseFloat(document.querySelector(`.length-input[data-row="${rowNum}"]`).value) || 0;
        const allowance = parseFloat(document.querySelector(`.allowance-input[data-row="${rowNum}"]`).value) || 0;
        const girth = parseFloat(document.querySelector(`.girth-input[data-row="${rowNum}"]`).value) || 0;
        const cft = parseFloat(document.querySelector(`.cft-input[data-row="${rowNum}"]`).value) || 0;
        
        if (length > 0 && girth > 0) {
            logs.push({
                srNo: index + 1,
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
    
    const printPreviewContainer = document.getElementById('printPreviewContainer');
    if (printPreviewContainer) {
        printPreviewContainer.innerHTML = generatePrintHTML(listNumber, date, partyName, vehicleNumber, productType, logs, totalCFT);
    }
    
    const printPreviewModalEl = document.getElementById('printPreviewModal');
    if (printPreviewModalEl) {
        const printPreviewModal = new bootstrap.Modal(printPreviewModalEl);
        printPreviewModal.show();
    }
}

// 
// --- THIS FUNCTION HAS BEEN UPDATED ---
//
// Print current data
function printCurrentData() {
    const listNumber = document.getElementById('listNumber').value;
    const date = document.getElementById('date').value;
    const partyName = document.getElementById('partyName').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const productType = document.getElementById('productType').value;
    
    const logs = [];
    let totalCFT = 0;
    
    document.querySelectorAll('.length-input').forEach((input, index) => {
        const row = input.dataset.row;
        const length = parseFloat(input.value) || 0;
        const allowance = parseFloat(document.querySelector(`.allowance-input[data-row="${row}"]`).value) || 0;
        const girth = parseFloat(document.querySelector(`.girth-input[data-row="${row}"]`).value) || 0;
        const cft = parseFloat(document.querySelector(`.cft-input[data-row="${row}"]`).value) || 0;
        
        if (length > 0 && girth > 0) {
            logs.push({
                srNo: index + 1,
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

    // UPDATED: Added new print styles for page breaks, font size, and margins
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print - ${listNumber}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 5px; 
                    font-size: 10px; /* Smaller font */
                }
                .print-header { text-align: center; margin-bottom: 10px; }
                .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .header-left, .header-right { text-align: left; width: 48%; }
                .two-column-table { display: flex; justify-content: space-between; }
                .column-table { width: 48%; }
                .print-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px; 
                    font-size: 10px; /* Smaller font */
                }
                .print-table th, .print-table td { 
                    border: 1px solid #000; 
                    padding: 2px; /* Less padding */
                    text-align: center; 
                }
                .print-table th { background-color: #f2f2f2; }
                .print-footer { margin-top: 20px; text-align: center; }
                
                /* Page break logic */
                .print-page { 
                    page-break-after: always;
                    display: block;
                    overflow: hidden;
                }
                
                /* This stops the *last* page from page-breaking,
                   so the footer stays on the same page. */
                .print-page:last-child {
                    page-break-after: auto;
                }
                
                @media print { 
                    @page { 
                        size: A4; 
                        margin: 0.5cm; /* Smaller margins */
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
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// 
// --- THIS FUNCTION HAS BEEN UPDATED (BOTH ISSUES) ---
//
// Generate print HTML
function generatePrintHTML(listNumber, date, partyName, vehicleNumber, productType, logs, totalCFT) {
    
    let html = '';
    let logIndex = 0;
    let pageNumber = 1; // Page tracker

    // Loop in chunks of 100 (50 left, 50 right)
    while (logIndex < logs.length) {
        
        // --- 1. Get logs for this page ---
        const leftColumnLogs = logs.slice(logIndex, logIndex + 50);
        const rightColumnLogs = logs.slice(logIndex + 50, logIndex + 100);

        // --- 2. Add the page wrapper ---
        html += '<div class="print-page">';
        
        // Only add header on page 1
        if (pageNumber === 1) {
            html += `
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
        }

        // --- 3. Add the two-column table structure ---
        // ▼▼▼ FIX 1: Add margin-top to pages 2+ to push content down ▼▼▼
        if (pageNumber > 1) {
            html += '<div class="two-column-table" style="margin-top: 1.5cm;">';
        } else {
            html += '<div class="two-column-table">';
        }
        // ▲▲▲ END FIX 1 ▲▲▲

        // --- 4. Build Left Column ---
        html += '<div class="column-table"><table class="print-table">';
        html += '<thead><tr><th>Sr No</th><th>Length</th><th>Allowance</th><th>Girth</th><th>CFT</th></tr></thead><tbody>';
        leftColumnLogs.forEach(log => {
            html += `<tr><td>${log.srNo}</td><td>${log.length}</td><td>${log.allowance}</td><td>${log.girth}</td><td>${log.cft.toFixed(2)}</td></tr>`;
        });
        html += '</tbody></table></div>'; // End left column

        // --- 5. Build Right Column ---
        html += '<div class="column-table"><table class="print-table">';
        html += '<thead><tr><th>Sr No</th><th>Length</th><th>Allowance</th><th>Girth</th><th>CFT</th></tr></thead><tbody>';
        rightColumnLogs.forEach(log => {
            html += `<tr><td>${log.srNo}</td><td>${log.length}</td><td>${log.allowance}</td><td>${log.girth}</td><td>${log.cft.toFixed(2)}</td></tr>`;
        });
        html += '</tbody></table></div>'; // End right column

        html += '</div>'; // End two-column-table

        // ▼▼▼ FIX 2: Check if this is the last chunk of logs ▼▼▼
        if (logIndex + 100 >= logs.length) {
            // This is the last page, so add the footer *inside* this print-page div
            html += `
                <div class="print-footer">
                    <h3>Grand Total</h3>
                    <p><strong>Total CFT:</strong> ${totalCFT.toFixed(2)}</p>
                    <p><strong>Total CBM:</strong> ${(totalCFT / 27.74).toFixed(3)}</p>
                    <p><strong>Total PCS:</strong> ${logs.length}</p>
                </div>
            `;
        }
        // ▲▲▲ END FIX 2 ▲▲▲

        html += '</div>'; // End print-page

        // Move to the next 100 logs
        logIndex += 100;
        pageNumber++;
    }
    
    // --- 6. REMOVED Grand Total from here ---
    
    return html;
}

// Update dashboard (async)
async function updateDashboard() {
    showLoadingSpinner();
    const tableBody = document.getElementById('dashboardTableBody');
    if (!tableBody) {
        hideLoadingSpinner();
        return; // Can't update if table body doesn't exist
    }
    tableBody.innerHTML = '';

    try {
        if (allFetchedLists.length === 0) {
            const snapshot = await db.collection('lists').orderBy('date', 'desc').get();
            allFetchedLists = snapshot.docs.map(doc => doc.data());
        }

        const filteredLists = filterLists(allFetchedLists);
        const paginatedLists = paginateLists(filteredLists);
        
        paginatedLists.forEach(list => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${list.listNumber}</td>
                <td>${list.date}</td>
                <td>${list.partyName}</td>
                <td>${list.vehicleNumber}</td>
                <td>${list.productType}</td>
                <td>${list.totalCFT.toFixed(2)}</td>
                <td>${list.totalCBM.toFixed(3)}</td>
                <td>${list.totalPCS}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-list-btn" data-id="${list.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger print-list-btn" data-id="${list.id}"><i class="bi bi-printer"></i></button>
                    <button class="btn btn-sm btn-success export-list-btn" data-id="${list.id}"><i class="bi bi-file-earmark-excel"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        document.querySelectorAll('.edit-list-btn').forEach(btn => {
            btn.addEventListener('click', function() { loadListForEditing(this.dataset.id); });
        });
        document.querySelectorAll('.print-list-btn').forEach(btn => {
            btn.addEventListener('click', function() { printList(this.dataset.id); });
        });
        document.querySelectorAll('.export-list-btn').forEach(btn => {
            btn.addEventListener('click', function() { exportListToExcel(this.dataset.id); });
        });
        
        updatePagination(filteredLists.length);

    } catch (error) {
        console.error("Error loading dashboard data: ", error);
        showNotification('Error loading dashboard. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Filter lists
function filterLists(listsToFilter) {
    let filtered = [...listsToFilter];
    
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (searchTerm) {
        filtered = filtered.filter(list => 
            (list.listNumber && list.listNumber.toLowerCase().includes(searchTerm)) ||
            (list.partyName && list.partyName.toLowerCase().includes(searchTerm)) ||
            (list.vehicleNumber && list.vehicleNumber.toLowerCase().includes(searchTerm))
        );
    }
    
    const dateFromEl = document.getElementById('filterDateFrom');
    const dateToEl = document.getElementById('filterDateTo');
    const dateFrom = dateFromEl ? dateFromEl.value : '';
    const dateTo = dateToEl ? dateToEl.value : '';
    
    if (dateFrom) filtered = filtered.filter(list => list.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(list => list.date <= dateTo);
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    return filtered;
}

// Paginate lists
function paginateLists(lists) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return lists.slice(startIndex, endIndex);
}

// Update pagination
function updatePagination(totalItems) {
    const pagination = document.getElementById('dashboardPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    pagination.innerHTML = '';
    
    // Previous
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) { currentPage--; updateDashboard(); }
    });
    pagination.appendChild(prevLi);
    
    // Pages
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            updateDashboard();
        });
        pagination.appendChild(li);
    }
    
    // Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) { currentPage++; updateDashboard(); }
    });
    pagination.appendChild(nextLi);
}

// Filter dashboard
function filterDashboard() {
    currentPage = 1;
    updateDashboard();
}

// Load list for editing (async)
async function loadListForEditing(listId) {
    showLoadingSpinner();
    try {
        const docRef = db.collection('lists').doc(listId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error('List not found');
        const list = doc.data();
        
        switchView('entry');
        
        document.getElementById('listNumber').value = list.listNumber;
        document.getElementById('date').value = list.date;
        document.getElementById('partyName').value = list.partyName;
        document.getElementById('vehicleNumber').value = list.vehicleNumber;
        document.getElementById('productType').value = list.productType;
        
        document.getElementById('logsTableBody').innerHTML = '';
        rowCount = 1;
        
        list.logs.forEach(log => {
            addTableRow();
            const rowNum = log.srNo;
            const lengthInput = document.querySelector(`.length-input[data-row="${rowNum}"]`);
            if (lengthInput) lengthInput.value = log.length;
            
            const allowanceInput = document.querySelector(`.allowance-input[data-row="${rowNum}"]`);
            if (allowanceInput) allowanceInput.value = log.allowance;
            
            const girthInput = document.querySelector(`.girth-input[data-row="${rowNum}"]`);
            if (girthInput) girthInput.value = log.girth;
            
            const cftInput = document.querySelector(`.cft-input[data-row="${rowNum}"]`);
            if (cftInput) cftInput.value = log.cft;
        });
        
        for (let i = 0; i < 3; i++) addTableRow();
        
        updateTotals();
        currentListId = list.id;
        showNotification('List loaded for editing', 'info');

    } catch (error) {
        console.error("Error loading list for editing: ", error);
        showNotification('Error loading list. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// 
// --- THIS FUNCTION HAS BEEN UPDATED ---
//
// Print list (async)
async function printList(listId) {
    showLoadingSpinner();
    try {
        const doc = await db.collection('lists').doc(listId).get();
        if (!doc.exists) throw new Error('List not found');
        const list = doc.data();
        
        const printHTML = generatePrintHTML(
            list.listNumber, list.date, list.partyName, list.vehicleNumber,
            list.productType, list.logs, list.totalCFT
        );
        
        // UPDATED: Added new print styles for page breaks, font size, and margins
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Print - ${list.listNumber}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 5px; 
                    font-size: 10px; /* Smaller font */
                }
                .print-header { text-align: center; margin-bottom: 10px; }
                .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .header-left, .header-right { text-align: left; width: 48%; }
                .two-column-table { display: flex; justify-content: space-between; }
                .column-table { width: 48%; }
                .print-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px; 
                    font-size: 10px; /* Smaller font */
                }
                .print-table th, .print-table td { 
                    border: 1px solid #000; 
                    padding: 2px; /* Less padding */
                    text-align: center; 
                }
                .print-table th { background-color: #f2f2f2; }
                .print-footer { margin-top: 20px; text-align: center; }
                
                /* Page break logic */
                .print-page { 
                    page-break-after: always;
                    display: block;
                    overflow: hidden;
                }
                
                /* This stops the *last* page from page-breaking,
                   so the footer stays on the same page. */
                .print-page:last-child {
                    page-break-after: auto;
                }
                
                @media print { 
                    @page { 
                        size: A4; 
                        margin: 0.5cm; /* Smaller margins */
                    } 
                }
            </style>
            </head>
            <body>${printHTML}</body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
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

// Export list to Excel (async)
async function exportListToExcel(listId) {
    showLoadingSpinner();
    try {
        const doc = await db.collection('lists').doc(listId).get();
        if (!doc.exists) throw new Error('List not found');
        const list = doc.data();
        
        const wb = XLSX.utils.book_new();
        const header = [
            ['OSWAL LUMBERS PVT LTD'], [''],
            ['List Number:', list.listNumber],
            ['Date:', list.date],
            ['Party Name:', list.partyName],
            ['Vehicle Number:', list.vehicleNumber],
            ['Product Type:', list.productType], [''],
            ['Sr No', 'Length', 'Length Allowance', 'Girth', 'CFT']
        ];
        
        const data = list.logs.map(log => [
            log.srNo, log.length, log.allowance, log.girth, log.cft.toFixed(2)
        ]);
        
        data.push([]);
        data.push(['Total CFT:', '', '', '', list.totalCFT.toFixed(2)]);
        data.push(['Total CBM:', '', '', '', list.totalCBM.toFixed(3)]);
        data.push(['Total PCS:', '', '', '', list.totalPCS]);
        
        const wsData = [...header, ...data];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Log List');
        
        const filename = `${list.listNumber}_${list.date}_${list.partyName.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        showNotification('List exported to Excel successfully', 'success');

    } catch (error) {
        console.error("Error exporting list: ", error);
        showNotification('Error exporting list. See console.', 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Reset form
function resetForm() {
    const logForm = document.getElementById('logForm');
    if (logForm) {
        logForm.reset();
    }
    setTodayDate();
    updateListNumber();
    generateInitialRows();
    updateTotals();
}

// Show notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => { notification.classList.remove('show'); }, 3000);
    }
}

// Loading spinner
function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Sign out user
function signOutUser() {
    showLoadingSpinner();
    firebase.auth().signOut()
        .then(() => {
            console.log('User signed out.');
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Sign out error', error);
            showNotification('Error signing out', 'error');
            hideLoadingSpinner();
        });
}
