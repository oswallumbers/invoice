document.addEventListener('DOMContentLoaded', function () {
    // Check if firebase is initialized
    if (typeof firebase === 'undefined') {
        alert("Firebase is not initialized. Please check your firebase-init.js file.");
        return;
    }
    const db = firebase.firestore();

    // --- DOM Elements ---
    const addPurchaseBtn = document.getElementById('add-purchase-btn');
    const purchaseModal = document.getElementById('purchase-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeBtns = purchaseModal.querySelectorAll('.close-btn');
    const purchaseForm = document.getElementById('purchase-form');
    const purchaseTableBody = document.getElementById('purchase-table-body');

    // Form Inputs
    const supplierNameInput = document.getElementById('supplier-name');
    const localInvoiceNoInput = document.getElementById('local-invoice-no');
    const localInvoiceDateInput = document.getElementById('local-invoice-date');
    const purchaseCbmInput = document.getElementById('purchase-cbm');
    const purchaseAmountInrInput = document.getElementById('purchase-amount-inr');
    
    // NEW: Link to Shipment
    const linkShipmentSelect = document.getElementById('link-shipment');

    // Store loaded dropdown data
    let shipmentsData = [];
    
    // --- Main Initializer ---
    async function initializePage() {
        await loadDropdowns(); // Load shipments dropdown
        await loadPurchaseRecords();
    }
    initializePage();

    // --- Data Loading Functions ---

    /**
     * Fetches all records from the 'localPurchases' collection and displays them.
     */
    async function loadPurchaseRecords() {
        purchaseTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Loading records...</td></tr>';
        try {
            const querySnapshot = await db.collection('localPurchases').orderBy('localInvoiceDate', 'desc').get();
            const records = [];
            querySnapshot.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });
            renderTable(records);
        } catch (error) {
            console.error("Error loading purchase records: ", error);
            purchaseTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-red-500">Failed to load records.</td></tr>';
        }
    }

    /**
     * Renders the fetched records into the HTML table.
     */
    function renderTable(records) {
        if (records.length === 0) {
            purchaseTableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">No purchase records found. Add one to get started!</td></tr>';
            return;
        }
        purchaseTableBody.innerHTML = ''; // Clear

        records.forEach(rec => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${rec.supplierName}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${rec.localInvoiceNo}<br><span class="text-gray-500">${rec.localInvoiceDate}</span></td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-blue-700 font-semibold">${rec.shipmentNo || 'N/A'}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${parseFloat(rec.purchaseCbm).toFixed(3)}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(rec.purchaseAmountInr, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" class="text-pink-600 hover:text-pink-900 edit-record-btn" data-id="${rec.id}">Edit</a>
                </td>
            `;
            purchaseTableBody.appendChild(row);
        });
    }

    /**
     * Loads the 'shipments' collection into the dropdown.
     */
    async function loadDropdowns() {
        // Clear existing options first
        linkShipmentSelect.innerHTML = '<option value="">-- Select Shipment --</option>';
        shipmentsData = []; // Reset data
        
        try {
            const snapshot = await db.collection('shipments').orderBy('shipmentNo', 'desc').get();
            snapshot.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                shipmentsData.push(data);
                
                const option = document.createElement('option');
                option.value = data.id; // Store Firebase ID as value
                option.textContent = data.shipmentNo; // Show Shipment No
                option.dataset.shipmentNo = data.shipmentNo; // Store the text for saving
                linkShipmentSelect.appendChild(option);
            });
        } catch (error) {
            console.error(`Error loading shipments: `, error);
        }
    }


    // --- Event Handlers ---
    
    /**
     * Handles the form submission for adding or updating a purchase record.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const selectedShipmentOption = linkShipmentSelect.options[linkShipmentSelect.selectedIndex];
        const editId = purchaseForm.dataset.editId; // Check for the ID

        // Simplified data object
        const purchaseData = {
            supplierName: supplierNameInput.value,
            localInvoiceNo: localInvoiceNoInput.value,
            localInvoiceDate: localInvoiceDateInput.value,
            purchaseCbm: parseFloat(purchaseCbmInput.value) || 0,
            purchaseAmountInr: parseFloat(purchaseAmountInrInput.value) || 0,
            
            // NEW: Add shipment ID and No. for linking
            shipmentId: selectedShipmentOption.value,
            shipmentNo: selectedShipmentOption.dataset.shipmentNo || selectedShipmentOption.textContent,
        };

        if (!purchaseData.shipmentId) {
            alert('Please select a shipment to link this purchase to.');
            return;
        }

        try {
            if (editId) {
                // Update existing record
                await db.collection('localPurchases').doc(editId).update(purchaseData);
                alert('Purchase record updated successfully!');
                delete purchaseForm.dataset.editId; // Clear the ID
            } else {
                // Add new record
                await db.collection('localPurchases').add({
                    ...purchaseData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert('Purchase record saved successfully!');
            }
            
            closeModal();
            loadPurchaseRecords(); // Refresh the table
            
            // IMPORTANT: We also refresh the shipment dropdown in case a new one was added
            // (This is a small UX improvement)
            loadDropdowns(); 
            
        } catch (error) {
            console.error("Error saving document: ", error);
            alert('Failed to save record. Please check the console for errors.');
        }
    }


    // --- Edit Logic ---
    
    /**
     * Fetches a record and prepares the modal for editing.
     */
    async function loadRecordForEdit(id) {
        try {
            const doc = await db.collection('localPurchases').doc(id).get();
            if (!doc.exists) {
                alert("Record not found!");
                return;
            }

            const data = doc.data();
            
            // 1. Store the ID on the form
            purchaseForm.dataset.editId = id; 

            // 2. Populate form fields
            supplierNameInput.value = data.supplierName || '';
            localInvoiceNoInput.value = data.localInvoiceNo || '';
            localInvoiceDateInput.value = data.localInvoiceDate || '';
            purchaseCbmInput.value = data.purchaseCbm || 0;
            purchaseAmountInrInput.value = data.purchaseAmountInr || 0;

            // 3. Select correct shipment
            linkShipmentSelect.value = data.shipmentId || '';
            
            // 4. Open modal
            modalTitle.textContent = "Edit Purchase Record";
            openModal();

        } catch (error) {
            console.error("Error loading record for edit: ", error);
            alert('Failed to load record for editing.');
        }
    }


    // --- Modal and Utility Functions ---

    function openModal() {
        purchaseModal.classList.remove('hidden');
    }

    function closeModal() {
        purchaseForm.reset(); // Clear the form
        delete purchaseForm.dataset.editId; // Clear the edit ID on close
        modalTitle.textContent = "Add New Purchase Record"; // Reset title
        purchaseModal.classList.add('hidden');
    }

    /**
     * Formats a number into a currency string.
     */
    function formatCurrency(amount, currency) {
        if (isNaN(amount)) amount = 0;
        return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    }


    // --- Event Listeners ---
    addPurchaseBtn.addEventListener('click', openModal);
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    purchaseForm.addEventListener('submit', handleFormSubmit);
    
    // Event delegation for dynamically added Edit buttons
    purchaseTableBody.addEventListener('click', function(e) {
        const editLink = e.target.closest('a.edit-record-btn');
        if (editLink) {
            e.preventDefault(); // Stop the link from going to '#'
            const recordId = editLink.getAttribute('data-id');
            loadRecordForEdit(recordId);
        }
    });

});
