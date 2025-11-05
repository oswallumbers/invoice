document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase === 'undefined') {
        alert("Firebase is not initialized.");
        return;
    }
    const db = firebase.firestore();

    // --- DOM Elements ---
    const addShipmentBtn = document.getElementById('add-shipment-btn');
    const shipmentModal = document.getElementById('shipment-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeBtns = shipmentModal.querySelectorAll('.close-btn');
    const shipmentForm = document.getElementById('shipment-form');
    const shipmentTableBody = document.getElementById('shipment-table-body');

    // Form Inputs
    const shipmentNoInput = document.getElementById('shipment-no');
    const exportBuyerSelect = document.getElementById('export-buyer');
    const commercialInvoiceSelect = document.getElementById('commercial-invoice');
    const exchangeRateInput = document.getElementById('exchange-rate');
    
    // Expense Inputs
    const freightExpInput = document.getElementById('freight-exp');
    const clearingExpInput = document.getElementById('clearing-exp');
    const loadingExpInput = document.getElementById('loading-exp');
    const otherExpInput = document.getElementById('other-exp');

    // Calculation Display
    const calcSaleUsdEl = document.getElementById('calc-sale-usd');
    const calcSaleInrEl = document.getElementById('calc-sale-inr');
    const calcTotalExpEl = document.getElementById('calc-total-exp');

    // Store loaded data
    let buyersData = [];
    let invoicesData = [];

    // --- Main Initializer ---
    async function initializePage() {
        await loadDropdowns();
        await loadShipmentRecords();
    }
    initializePage();

    // --- Data Loading ---

    /**
     * Fetches all shipments and calculates profit for each.
     */
    async function loadShipmentRecords() {
        shipmentTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4">Loading shipments...</td></tr>';
        try {
            const shipmentSnapshot = await db.collection('shipments').orderBy('shipmentNo', 'desc').get();
            if (shipmentSnapshot.empty) {
                shipmentTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4">No shipments found. Create one to get started!</td></tr>';
                return;
            }

            const records = [];
            for (const doc of shipmentSnapshot.docs) {
                const shipment = { id: doc.id, ...doc.data() };
                
                // 1. Get Total Sale (INR)
                // We use the stored values from when the shipment was created
                const totalSaleUsd = shipment.saleAmountUsd || 0;
                const exRate = shipment.exchangeRate || 0;
                const totalSaleInr = totalSaleUsd * exRate;

                // 2. Get Total Purchases (INR)
                // We query the 'localPurchases' collection for all docs matching this shipmentId
                const purchaseSnapshot = await db.collection('localPurchases').where('shipmentId', '==', shipment.id).get();
                let totalPurchaseInr = 0;
                purchaseSnapshot.forEach(purchaseDoc => {
                    totalPurchaseInr += purchaseDoc.data().purchaseAmountInr || 0;
                });

                // 3. Get Total Expenses (INR)
                const totalExpenses = (shipment.freightExp || 0) +
                                      (shipment.clearingExp || 0) +
                                      (shipment.loadingExp || 0) +
                                      (shipment.otherExp || 0);

                // 4. Calculate Final Profit
                const profit = totalSaleInr - totalPurchaseInr - totalExpenses;
                
                records.push({
                    ...shipment,
                    totalSaleInr,
                    totalPurchaseInr,
                    totalExpenses,
                    profit
                });
            }
            renderTable(records);
        } catch (error) {
            console.error("Error loading shipment records: ", error);
            shipmentTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-red-500">Failed to load records.</td></tr>';
        }
    }

    /**
     * Renders shipment records into the table.
     */
    function renderTable(records) {
        shipmentTableBody.innerHTML = ''; // Clear
        records.forEach(rec => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${rec.shipmentNo}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${rec.exportBuyer}<br><span class="text-blue-600">${rec.commercialInvoice}</span></td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">${formatCurrency(rec.totalSaleInr, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-red-700">${formatCurrency(rec.totalPurchaseInr, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-red-600">${formatCurrency(rec.totalExpenses, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm font-bold ${rec.profit >= 0 ? 'text-green-700' : 'text-red-700'}">${formatCurrency(rec.profit, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" class="text-blue-600 hover:text-blue-900 edit-record-btn" data-id="${rec.id}">Edit</a>
                </td>
            `;
            shipmentTableBody.appendChild(row);
        });
    }

    /**
     * Loads dropdown data for Buyers and Invoices.
     */
    async function loadDropdowns() {
        buyersData = await loadCollectionIntoSelect('buyers', 'name', exportBuyerSelect, 'name');
        invoicesData = await loadCollectionIntoSelect('invoices', 'createdAt', commercialInvoiceSelect, 'invoiceNo');
    }

    async function loadCollectionIntoSelect(collectionName, orderByField, selectElement, textField) {
        const records = [];
        try {
            const snapshot = await db.collection(collectionName).orderBy(orderByField, 'desc').get();
            snapshot.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                records.push(data);
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = data[textField];
                option.dataset.extra = JSON.stringify(data); // Store full data
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error(`Error loading ${collectionName}: `, error);
        }
        return records;
    }


    // --- Event Handlers ---

    /**
     * Handles the form submission for adding or updating a shipment record.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const selectedBuyerOption = exportBuyerSelect.options[exportBuyerSelect.selectedIndex];
        const selectedCiOption = commercialInvoiceSelect.options[commercialInvoiceSelect.selectedIndex];
        const selectedCiData = selectedCiOption.value ? JSON.parse(selectedCiOption.dataset.extra) : {};
        const editId = shipmentForm.dataset.editId;

        const shipmentData = {
            shipmentNo: shipmentNoInput.value,
            exportBuyer: selectedBuyerOption.value ? selectedBuyerOption.textContent : '',
            commercialInvoice: selectedCiOption.value ? selectedCiOption.textContent : '',
            commercialInvoiceId: selectedCiOption.value || '',
            saleAmountUsd: selectedCiData.totalAmount || 0, // Get USD amount from invoice data
            exchangeRate: parseFloat(exchangeRateInput.value) || 0,
            freightExp: parseFloat(freightExpInput.value) || 0,
            clearingExp: parseFloat(clearingExpInput.value) || 0,
            loadingExp: parseFloat(loadingExpInput.value) || 0,
            otherExp: parseFloat(otherExpInput.value) || 0,
        };

        try {
            if (editId) {
                await db.collection('shipments').doc(editId).update(shipmentData);
                alert('Shipment updated successfully!');
                delete shipmentForm.dataset.editId;
            } else {
                await db.collection('shipments').add({
                    ...shipmentData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert('Shipment saved successfully!');
            }
            closeModal();
            loadShipmentRecords(); // Refresh the table
        } catch (error) {
            console.error("Error saving shipment: ", error);
            alert('Failed to save shipment.');
        }
    }

    /**
     * Updates the calculated financial fields in the modal.
     */
    function calculateModalFinancials() {
        // 1. Get Sale USD from selected invoice
        const selectedCiOption = commercialInvoiceSelect.options[commercialInvoiceSelect.selectedIndex];
        let saleUsd = 0;
        if (selectedCiOption.value && selectedCiOption.dataset.extra) {
            const invoiceData = JSON.parse(selectedCiOption.dataset.extra);
            saleUsd = invoiceData.totalAmount || 0;
        }
        calcSaleUsdEl.textContent = formatCurrency(saleUsd, 'USD');
        
        // 2. Calculate Sale INR
        const exRate = parseFloat(exchangeRateInput.value) || 0;
        const saleInr = saleUsd * exRate;
        calcSaleInrEl.textContent = formatCurrency(saleInr, 'INR');

        // 3. Calculate Total Expenses
        const totalExp = (parseFloat(freightExpInput.value) || 0) +
                         (parseFloat(clearingExpInput.value) || 0) +
                         (parseFloat(loadingExpInput.value) || 0) +
                         (parseFloat(otherExpInput.value) || 0);
        calcTotalExpEl.textContent = formatCurrency(totalExp, 'INR');
    }
    

    // --- Edit Logic ---
    
    async function loadRecordForEdit(id) {
        try {
            const doc = await db.collection('shipments').doc(id).get();
            if (!doc.exists) {
                alert("Record not found!");
                return;
            }
            const data = doc.data();
            
            shipmentForm.dataset.editId = id; 
            shipmentNoInput.value = data.shipmentNo || '';
            exchangeRateInput.value = data.exchangeRate || 0;
            freightExpInput.value = data.freightExp || 0;
            clearingExpInput.value = data.clearingExp || 0;
            loadingExpInput.value = data.loadingExp || 0;
            otherExpInput.value = data.otherExp || 0;

            selectOptionByText(exportBuyerSelect, data.exportBuyer);
            selectOptionByText(commercialInvoiceSelect, data.commercialInvoice);
            
            calculateModalFinancials();
            modalTitle.textContent = "Edit Shipment Record";
            openModal();
        } catch (error) {
            console.error("Error loading record for edit: ", error);
            alert('Failed to load record for editing.');
        }
    }

    function selectOptionByText(selectElement, text) {
        if (!text) {
            selectElement.selectedIndex = 0;
            return;
        }
        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].textContent === text) {
                selectElement.selectedIndex = i;
                // Manually trigger change to update linked fields
                selectElement.dispatchEvent(new Event('change'));
                return;
            }
        }
        selectElement.selectedIndex = 0; // Default if no match
    }

    // --- Modal and Utility Functions ---
    function openModal() {
        shipmentModal.classList.remove('hidden');
    }

    function closeModal() {
        shipmentForm.reset(); 
        delete shipmentForm.dataset.editId;
        modalTitle.textContent = "Create New Shipment";
        calculateModalFinancials(); // Reset calculations to 0
        shipmentModal.classList.add('hidden');
    }

    function formatCurrency(amount, currency) {
        if (isNaN(amount)) amount = 0;
        const options = { style: 'currency', currency: currency };
        if (currency === 'INR') {
            return amount.toLocaleString('en-IN', options);
        } else { // Default to USD
            return amount.toLocaleString('en-US', options);
        }
    }

    // --- Event Listeners ---
    addShipmentBtn.addEventListener('click', openModal);
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    shipmentForm.addEventListener('submit', handleFormSubmit);
    
    // Listen for changes to calculate modal financials
    commercialInvoiceSelect.addEventListener('change', calculateModalFinancials);
    exchangeRateInput.addEventListener('input', calculateModalFinancials);
    freightExpInput.addEventListener('input', calculateModalFinancials);
    clearingExpInput.addEventListener('input', calculateModalFinancials);
    loadingExpInput.addEventListener('input', calculateModalFinancials);
    otherExpInput.addEventListener('input', calculateModalFinancials);

    // Event delegation for Edit buttons
    shipmentTableBody.addEventListener('click', function(e) {
        const editLink = e.target.closest('a.edit-record-btn');
        if (editLink) {
            e.preventDefault();
            const recordId = editLink.getAttribute('data-id');
            loadRecordForEdit(recordId);
        }
    });

});
