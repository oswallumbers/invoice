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
    const exportBuyerSelect = document.getElementById('export-buyer');
    const performaInvoiceSelect = document.getElementById('performa-invoice');
    const commercialInvoiceSelect = document.getElementById('commercial-invoice');
    const saleAmountUsdInput = document.getElementById('sale-amount-usd');
    const exchangeRateInput = document.getElementById('exchange-rate');
    
    // Calculation Display
    const calculatedSaleInrEl = document.getElementById('calculated-sale-inr');
    const calculatedProfitEl = document.getElementById('calculated-profit');

    // --- Main Initializer ---
    async function initializePage() {
        await loadPurchaseRecords();
        await loadDropdowns();
    }
    initializePage();

    // --- Data Loading Functions ---

    /**
     * Fetches all records from the 'localPurchases' collection and displays them in the table.
     */
    async function loadPurchaseRecords() {
        purchaseTableBody.innerHTML = '<tr><td colspan="11" class="text-center p-4">Loading records...</td></tr>';
        try {
            const querySnapshot = await db.collection('localPurchases').orderBy('localInvoiceDate', 'desc').get();
            const records = [];
            querySnapshot.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });
            renderTable(records);
        } catch (error) {
            console.error("Error loading purchase records: ", error);
            purchaseTableBody.innerHTML = '<tr><td colspan="11" class="text-center p-4 text-red-500">Failed to load records.</td></tr>';
        }
    }

    /**
     * Renders the fetched records into the HTML table.
     * @param {Array} records - An array of purchase record objects from Firebase.
     */
    function renderTable(records) {
        if (records.length === 0) {
            purchaseTableBody.innerHTML = '<tr><td colspan="11" class="text-center p-4">No purchase records found. Add one to get started!</td></tr>';
            return;
        }
        purchaseTableBody.innerHTML = ''; // Clear previous content

        records.forEach(rec => {
            const saleInr = (rec.saleAmountUsd || 0) * (rec.exchangeRate || 0);
            const profit = saleInr - (rec.purchaseAmountInr || 0);

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${rec.supplierName}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${rec.localInvoiceNo}<br><span class="text-gray-500">${rec.localInvoiceDate}</span></td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${rec.exportBuyer}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${rec.performaInvoice}<br><span class="text-blue-600">${rec.commercialInvoice || ''}</span></td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${parseFloat(rec.purchaseCbm).toFixed(3)}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(rec.purchaseAmountInr, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${formatCurrency(rec.saleAmountUsd, 'USD')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-700">${rec.exchangeRate}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">${formatCurrency(saleInr, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}">${formatCurrency(profit, 'INR')}</td>
                <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" class="text-pink-600 hover:text-pink-900" data-id="${rec.id}">Edit</a>
                </td>
            `;
            purchaseTableBody.appendChild(row);
        });
    }

    /**
     * Orchestrates loading data for all dropdowns in the modal.
     */
    function loadDropdowns() {
        loadCollectionIntoSelect('buyers', 'name', exportBuyerSelect, 'name');
        loadCollectionIntoSelect('performaInvoices', 'createdAt', performaInvoiceSelect, 'performaInvoiceNo');
        loadCollectionIntoSelect('invoices', 'createdAt', commercialInvoiceSelect, 'invoiceNo');
    }

    /**
     * A generic function to fetch a collection and populate a <select> element.
     * @param {string} collectionName - The name of the Firebase collection.
     * @param {string} orderByField - The field to order the results by.
     * @param {HTMLElement} selectElement - The <select> DOM element.
     * @param {string} textField - The field from the document to use as the option text.
     */
    async function loadCollectionIntoSelect(collectionName, orderByField, selectElement, textField) {
        try {
            const snapshot = await db.collection(collectionName).orderBy(orderByField, 'desc').get();
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data()[textField];
                option.dataset.extra = JSON.stringify(doc.data()); // Store full data
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error(`Error loading ${collectionName}: `, error);
        }
    }


    // --- Event Handlers ---
    
    /**
     * Handles the form submission for adding or updating a purchase record.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const selectedBuyerOption = exportBuyerSelect.options[exportBuyerSelect.selectedIndex];
        const selectedPiOption = performaInvoiceSelect.options[performaInvoiceSelect.selectedIndex];
        const selectedCiOption = commercialInvoiceSelect.options[commercialInvoiceSelect.selectedIndex];

        const purchaseData = {
            supplierName: supplierNameInput.value,
            localInvoiceNo: localInvoiceNoInput.value,
            localInvoiceDate: localInvoiceDateInput.value,
            purchaseCbm: parseFloat(purchaseCbmInput.value) || 0,
            purchaseAmountInr: parseFloat(purchaseAmountInrInput.value) || 0,
            exportBuyer: selectedBuyerOption.value ? selectedBuyerOption.textContent : '',
            performaInvoice: selectedPiOption.value ? selectedPiOption.textContent : '',
            commercialInvoice: selectedCiOption.value ? selectedCiOption.textContent : '',
            saleAmountUsd: parseFloat(saleAmountUsdInput.value) || 0,
            exchangeRate: parseFloat(exchangeRateInput.value) || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('localPurchases').add(purchaseData);
            alert('Purchase record saved successfully!');
            closeModal();
            loadPurchaseRecords(); // Refresh the table
        } catch (error) {
            console.error("Error saving document: ", error);
            alert('Failed to save record. Please check the console for errors.');
        }
    }

    /**
     * Updates the calculated financial fields when related inputs change.
     */
    function calculateFinancials() {
        const purchaseInr = parseFloat(purchaseAmountInrInput.value) || 0;
        const saleUsd = parseFloat(saleAmountUsdInput.value) || 0;
        const exRate = parseFloat(exchangeRateInput.value) || 0;

        const saleInr = saleUsd * exRate;
        const profit = saleInr - purchaseInr;

        calculatedSaleInrEl.textContent = formatCurrency(saleInr, 'INR');
        calculatedProfitEl.textContent = formatCurrency(profit, 'INR');

        if (profit < 0) {
            calculatedProfitEl.classList.remove('text-green-700');
            calculatedProfitEl.classList.add('text-red-700');
        } else {
            calculatedProfitEl.classList.remove('text-red-700');
            calculatedProfitEl.classList.add('text-green-700');
        }
    }

    /**
     * When a commercial invoice is selected, automatically populate the Sale Amount (USD).
     */
    function handleCommercialInvoiceChange() {
        const selectedOption = commercialInvoiceSelect.options[commercialInvoiceSelect.selectedIndex];
        if (selectedOption.value && selectedOption.dataset.extra) {
            const invoiceData = JSON.parse(selectedOption.dataset.extra);
            saleAmountUsdInput.value = invoiceData.totalAmount.toFixed(2);
            calculateFinancials(); // Recalculate after auto-filling
        }
    }


    // --- Modal and Utility Functions ---

    function openModal() {
        purchaseForm.reset(); // Clear the form
        modalTitle.textContent = "Add New Purchase Record";
        calculatedSaleInrEl.textContent = formatCurrency(0, 'INR');
        calculatedProfitEl.textContent = formatCurrency(0, 'INR');
        purchaseModal.classList.remove('hidden');
    }

    function closeModal() {
        purchaseModal.classList.add('hidden');
    }

    /**
     * Formats a number into a currency string.
     * @param {number} amount The number to format.
     * @param {string} currency 'INR' or 'USD'.
     * @returns {string} Formatted currency string.
     */
    function formatCurrency(amount, currency) {
        if (isNaN(amount)) amount = 0;
        if (currency === 'INR') {
            return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
        } else { // Default to USD
            return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        }
    }


    // --- Event Listeners ---
    addPurchaseBtn.addEventListener('click', openModal);
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    purchaseForm.addEventListener('submit', handleFormSubmit);
    
    // Listen for changes to calculate financials in real-time
    purchaseAmountInrInput.addEventListener('input', calculateFinancials);
    saleAmountUsdInput.addEventListener('input', calculateFinancials);
    exchangeRateInput.addEventListener('input', calculateFinancials);
    
    // Auto-populate sale amount when a commercial invoice is selected
    commercialInvoiceSelect.addEventListener('change', handleCommercialInvoiceChange);
});
