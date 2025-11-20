document.addEventListener('DOMContentLoaded', () => {

 const firebaseConfig = {
    apiKey: "AIzaSyB67fJm6K7kLHaITD77YDOQiiABYwXTJ7I",
    authDomain: "export-costing.firebaseapp.com",
    projectId: "export-costing",
    storageBucket: "export-costing.firebasestorage.app",
    messagingSenderId: "542008738422",
    appId: "1:542008738422:web:f8831e950e92f13c159557"
  };
    // --- FIREBASE INITIALIZATION ---
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const exportCollection = db.collection('exports');

    // --- DOM ELEMENT SELECTION ---
    const pages = document.querySelectorAll('.page');
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const navBtns = document.querySelectorAll('.nav-btn');
    const exportForm = document.getElementById('export-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const dataTableBody = document.getElementById('data-table-body');
    const noDataMessage = document.getElementById('no-data-message');
    const chaSummaryContainer = document.getElementById('cha-summary-container');

    // Form Inputs
    const recordIdInput = document.getElementById('record-id');
    const buyerNameInput = document.getElementById('buyer-name');
    const exportDateInput = document.getElementById('export-date');
    const contractNoInput = document.getElementById('contract-no');
    const destinationSelect = document.getElementById('destination');
    const otherDestinationInput = document.getElementById('other-destination');
    const totalContainersInput = document.getElementById('total-containers');
    const chaSelect = document.getElementById('cha-select');
    const newChaInput = document.getElementById('new-cha-input'); // Re-added
    const addChaBtn = document.getElementById('add-cha-btn');     // Re-added
    const lineInput = document.getElementById('line');

    // Expense Inputs
    const oceanFreightInput = document.getElementById('ocean-freight');
    const customCargoInput = document.getElementById('custom-cargo');
    const clearingChargesInput = document.getElementById('clearing-charges');
    const transportationInput = document.getElementById('transportation');
    const loadingChargesInput = document.getElementById('loading-charges');
    const unloadingChargesInput = document.getElementById('unloading-charges');
    const otherCharges1Input = document.getElementById('other-charges-1');
    const otherCharges1RemarksInput = document.getElementById('other-charges-1-remarks');
    const otherCharges2Input = document.getElementById('other-charges-2');
    const otherCharges2RemarksInput = document.getElementById('other-charges-2-remarks');

    // Filter/Sort Inputs
    const filterChaSelect = document.getElementById('filter-cha');
    const filterContractInput = document.getElementById('filter-contract');
    const filterDestinationSelect = document.getElementById('filter-destination');
    const sortDateSelect = document.getElementById('sort-date');

    // --- APPLICATION STATE ---
    const APP_STATE = {
        isLoggedIn: false,
        exportData: [], // This will now hold data fetched from Firestore
        editingRecordId: null,
    };

    const LOGIN_PIN = '1234'; // Set your login PIN here

    // --- INITIALIZATION ---
    function init() {
        setupEventListeners();
        checkLoginStatus();
    }

    // --- FIREBASE CRUD FUNCTIONS ---
    function fetchAllRecords() {
        exportCollection.get().then(querySnapshot => {
            APP_STATE.exportData = [];
            querySnapshot.forEach(doc => {
                APP_STATE.exportData.push({ id: doc.id, ...doc.data() });
            });
            updateChaDropdown(); // Rebuild dropdowns from fresh data
            renderDataList();
            renderDashboard();
        });
    }

    function addRecord(recordData) {
        exportCollection.add(recordData).then(() => {
            console.log("Document successfully written!");
            fetchAllRecords(); // Re-fetch data to update UI
        }).catch(error => {
            console.error("Error writing document: ", error);
            alert("Error saving data. Please check console.");
        });
    }

    function updateRecord(recordId, recordData) {
        exportCollection.doc(recordId).update(recordData).then(() => {
            console.log("Document successfully updated!");
            fetchAllRecords(); // Re-fetch data to update UI
        }).catch(error => {
            console.error("Error updating document: ", error);
            alert("Error updating data. Please check console.");
        });
    }

    function deleteRecord(recordId) {
        exportCollection.doc(recordId).delete().then(() => {
            console.log("Document successfully deleted!");
            fetchAllRecords(); // Re-fetch data to update UI
        }).catch(error => {
            console.error("Error removing document: ", error);
            alert("Error deleting data. Please check console.");
        });
    }

    // --- AUTHENTICATION (Front-end PIN check) ---
    function checkLoginStatus() {
        const loggedInStatus = localStorage.getItem('isLoggedIn');
        if (loggedInStatus === 'true') {
            APP_STATE.isLoggedIn = true;
            showApp();
        } else {
            showLogin();
        }
    }

    function showLogin() {
        loginPage.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }

    function showApp() {
        loginPage.classList.add('hidden');
        appContainer.classList.remove('hidden');
        showPage('dashboard-page'); // Default page after login
        fetchAllRecords(); // Fetch data from Firebase when app is shown
    }

    function login() {
        const pin = document.getElementById('pin-input').value;
        if (pin === LOGIN_PIN) {
            APP_STATE.isLoggedIn = true;
            localStorage.setItem('isLoggedIn', 'true');
            showApp();
        } else {
            alert('Invalid PIN. Please try again.');
        }
    }

    function logout() {
        APP_STATE.isLoggedIn = false;
        localStorage.setItem('isLoggedIn', 'false');
        showLogin();
        document.getElementById('pin-input').value = '';
    }

    // --- NAVIGATION ---
    function showPage(pageId) {
        pages.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
    }

    // --- CHA MANAGEMENT (Restored Functionality) ---
    function updateChaDropdown() {
        // Derive unique CHAs from the fetched data
        const uniqueChas = [...new Set(APP_STATE.exportData.map(record => record.cha))].filter(Boolean);

        const chaOptions = ['<option value="">Select CHA</option>'];
        uniqueChas.forEach(cha => {
            chaOptions.push(`<option value="${cha}">${cha}</option>`);
        });
        chaSelect.innerHTML = chaOptions.join('');
        filterChaSelect.innerHTML = '<option value="">All CHAs</option>' + chaOptions.slice(1).join('');
    }

    function addNewCha() {
        const newChaName = newChaInput.value.trim();
        if (newChaName) {
            // Check if CHA already exists in the current dropdown to prevent duplicates
            const existingOptions = Array.from(chaSelect.options).map(option => option.value);
            if (!existingOptions.includes(newChaName)) {
                // Add to main form dropdown
                const newOption = new Option(newChaName, newChaName);
                chaSelect.add(newOption);
                
                // Add to filter dropdown
                const newFilterOption = new Option(newChaName, newChaName);
                filterChaSelect.add(newFilterOption);

                // Select the newly added CHA in the form
                chaSelect.value = newChaName;
            }
            
            // Hide the input and show the button again
            newChaInput.value = '';
            newChaInput.classList.add('hidden');
            addChaBtn.classList.remove('hidden');
        }
    }


    // --- FORM HANDLING ---
    function populateFormForEdit(recordId) {
        const record = APP_STATE.exportData.find(r => r.id === recordId);
        if (!record) return;

        APP_STATE.editingRecordId = recordId;
        recordIdInput.value = record.id;
        buyerNameInput.value = record.buyerName;
        exportDateInput.value = record.exportDate;
        contractNoInput.value = record.contractNo;
        destinationSelect.value = record.destination === 'OTHER' ? 'OTHER' : record.destination;
        otherDestinationInput.value = record.destination === 'OTHER' ? record.otherDestination : '';
        otherDestinationInput.classList.toggle('hidden', record.destination !== 'OTHER');
        totalContainersInput.value = record.totalContainers;
        chaSelect.value = record.cha;
        lineInput.value = record.line;

        oceanFreightInput.value = record.expenses.oceanFreight;
        customCargoInput.value = record.expenses.customCargo;
        clearingChargesInput.value = record.expenses.clearingCharges;
        transportationInput.value = record.expenses.transportation;
        loadingChargesInput.value = record.expenses.loadingCharges;
        unloadingChargesInput.value = record.expenses.unloadingCharges;
        otherCharges1Input.value = record.expenses.otherCharges1.amount;
        otherCharges1RemarksInput.value = record.expenses.otherCharges1.remarks;
        otherCharges2Input.value = record.expenses.otherCharges2.amount;
        otherCharges2RemarksInput.value = record.expenses.otherCharges2.remarks;

        cancelEditBtn.classList.remove('hidden');
        showPage('entry-form-page');
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const finalDestination = destinationSelect.value === 'OTHER' ? otherDestinationInput.value : destinationSelect.value;
        const totalCharges = [
            parseFloat(oceanFreightInput.value) || 0,
            parseFloat(customCargoInput.value) || 0,
            parseFloat(clearingChargesInput.value) || 0,
            parseFloat(transportationInput.value) || 0,
            parseFloat(loadingChargesInput.value) || 0,
            parseFloat(unloadingChargesInput.value) || 0,
            parseFloat(otherCharges1Input.value) || 0,
            parseFloat(otherCharges2Input.value) || 0,
        ].reduce((sum, charge) => sum + charge, 0);

        const recordData = {
            buyerName: buyerNameInput.value,
            exportDate: exportDateInput.value,
            contractNo: contractNoInput.value,
            destination: finalDestination,
            totalContainers: parseInt(totalContainersInput.value),
            cha: chaSelect.value,
            line: lineInput.value,
            totalCharges: totalCharges.toFixed(2),
            expenses: {
                oceanFreight: parseFloat(oceanFreightInput.value) || 0,
                customCargo: parseFloat(customCargoInput.value) || 0,
                clearingCharges: parseFloat(clearingChargesInput.value) || 0,
                transportation: parseFloat(transportationInput.value) || 0,
                loadingCharges: parseFloat(loadingChargesInput.value) || 0,
                unloadingCharges: parseFloat(unloadingChargesInput.value) || 0,
                otherCharges1: {
                    amount: parseFloat(otherCharges1Input.value) || 0,
                    remarks: otherCharges1RemarksInput.value,
                },
                otherCharges2: {
                    amount: parseFloat(otherCharges2Input.value) || 0,
                    remarks: otherCharges2RemarksInput.value,
                },
            },
        };

        if (APP_STATE.editingRecordId) {
            updateRecord(APP_STATE.editingRecordId, recordData);
            APP_STATE.editingRecordId = null;
            cancelEditBtn.classList.add('hidden');
        } else {
            addRecord(recordData);
        }

        exportForm.reset();
        otherDestinationInput.classList.add('hidden');
        showPage('data-list-page');
    }

    // --- DATA RENDERING (No changes needed here) ---
    function getFilteredAndSortedData() {
        let filteredData = [...APP_STATE.exportData];
        const chaFilter = filterChaSelect.value;
        const contractFilter = filterContractInput.value.toLowerCase();
        const destinationFilter = filterDestinationSelect.value;

        if (chaFilter) {
            filteredData = filteredData.filter(r => r.cha === chaFilter);
        }
        if (contractFilter) {
            filteredData = filteredData.filter(r => r.contractNo.toLowerCase().includes(contractFilter));
        }
        if (destinationFilter) {
            filteredData = filteredData.filter(r => r.destination === destinationFilter);
        }

        const sortOrder = sortDateSelect.value;
        filteredData.sort((a, b) => {
            const dateA = new Date(a.exportDate);
            const dateB = new Date(b.exportDate);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return filteredData;
    }

    function renderDataList() {
        const dataToRender = getFilteredAndSortedData();
        dataTableBody.innerHTML = '';

        if (dataToRender.length === 0) {
            noDataMessage.classList.remove('hidden');
        } else {
            noDataMessage.classList.add('hidden');
            dataToRender.forEach(record => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.exportDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.contractNo}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.buyerName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.destination}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.totalContainers}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.cha}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.totalCharges}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="app.populateFormForEdit('${record.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                        <button onclick="app.deleteRecordFromUI('${record.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                `;
                dataTableBody.appendChild(row);
            });
        }
    }

    function renderDashboard() {
        chaSummaryContainer.innerHTML = '';
        const groupedByCha = APP_STATE.exportData.reduce((acc, record) => {
            if (!acc[record.cha]) {
                acc[record.cha] = [];
            }
            acc[record.cha].push(record);
            return acc;
        }, {});

        for (const chaName in groupedByCha) {
            const chaRecords = groupedByCha[chaName];
            const totalChargesForCha = chaRecords.reduce((sum, r) => sum + parseFloat(r.totalCharges), 0);
            const totalContainersForCha = chaRecords.reduce((sum, r) => sum + r.totalContainers, 0);

            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-lg shadow-md';
            
            let contractDetailsHtml = '';
            const groupedByContract = chaRecords.reduce((acc, record) => {
                if (!acc[record.contractNo]) {
                    acc[record.contractNo] = { records: [], totalCharge: 0, totalContainers: 0 };
                }
                acc[record.contractNo].records.push(record);
                acc[record.contractNo].totalCharge += parseFloat(record.totalCharges);
                acc[record.contractNo].totalContainers += record.totalContainers;
                return acc;
            }, {});

            for (const contractNo in groupedByContract) {
                const contractData = groupedByContract[contractNo];
                const perContainerRate = (contractData.totalCharge / contractData.totalContainers).toFixed(2);
                const destinations = [...new Set(contractData.records.map(r => r.destination))].join(', ');
                contractDetailsHtml += `
                    <div class="border-t pt-3 mt-3">
                        <p class="text-sm font-semibold text-gray-700">Contract: ${contractNo}</p>
                        <p class="text-xs text-gray-500">Containers: ${contractData.totalContainers} | Destinations: ${destinations}</p>
                        <p class="text-sm text-gray-800">Total Charged: ${contractData.totalCharge.toFixed(2)}</p>
                        <p class="text-xs text-gray-500">Rate/Container: ${perContainerRate}</p>
                    </div>
                `;
            }

            card.innerHTML = `
                <h3 class="text-lg font-bold text-indigo-800 border-b pb-2">${chaName}</h3>
                <div class="mt-4">
                    <p class="text-sm text-gray-600">Total Contracts: ${Object.keys(groupedByContract).length}</p>
                    <p class="text-sm text-gray-600">Total Containers: ${totalContainersForCha}</p>
                    <p class="text-xl font-semibold text-gray-900 mt-2">Total Charged: ${totalChargesForCha.toFixed(2)}</p>
                    ${contractDetailsHtml}
                </div>
            `;
            chaSummaryContainer.appendChild(card);
        }
    }
    
    // Wrapper for delete to handle confirmation
    function deleteRecordFromUI(recordId) {
        if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            deleteRecord(recordId);
        }
    }

    // --- EXPORT TO CSV (No changes needed here) ---
    function exportToCsv() {
        const dataToExport = getFilteredAndSortedData();
        if (dataToExport.length === 0) {
            alert('No data to export.');
            return;
        }
        const headers = ['Export Date', 'Contract No.', 'Buyer Name', 'Destination', 'Total Containers', 'CHA', 'LINE', 'Ocean Freight', 'Custom Cargo', 'Clearing Charges', 'Transportation', 'Loading', 'Unloading', 'Other Charges 1 (Amt)', 'Other Charges 1 (Remarks)', 'Other Charges 2 (Amt)', 'Other Charges 2 (Remarks)', 'Total Charges'];
        const csvContent = [
            headers.join(','),
            ...dataToExport.map(record => [
                record.exportDate, record.contractNo, record.buyerName, record.destination, record.totalContainers, record.cha, record.line,
                record.expenses.oceanFreight, record.expenses.customCargo, record.expenses.clearingCharges, record.expenses.transportation,
                record.expenses.loadingCharges, record.expenses.unloadingCharges, record.expenses.otherCharges1.amount,
                `"${record.expenses.otherCharges1.remarks}"`, record.expenses.otherCharges2.amount, `"${record.expenses.otherCharges2.remarks}"`,
                record.totalCharges
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_costing_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- EVENT LISTENER SETUP ---
    function setupEventListeners() {
        loginBtn.addEventListener('click', login);
        logoutBtn.addEventListener('click', logout);
        
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => showPage(btn.dataset.page));
        });

        exportForm.addEventListener('submit', handleFormSubmit);
        cancelEditBtn.addEventListener('click', () => {
            exportForm.reset();
            APP_STATE.editingRecordId = null;
            cancelEditBtn.classList.add('hidden');
            showPage('data-list-page');
        });
        
        exportCsvBtn.addEventListener('click', exportToCsv);

        destinationSelect.addEventListener('change', (e) => {
            otherDestinationInput.classList.toggle('hidden', e.target.value !== 'OTHER');
        });

        // Re-added event listeners for CHA functionality
        addChaBtn.addEventListener('click', () => {
            addChaBtn.classList.add('hidden');
            newChaInput.classList.remove('hidden');
            newChaInput.focus();
        });

        newChaInput.addEventListener('blur', addNewCha);
        newChaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewCha();
            }
        });

        filterChaSelect.addEventListener('change', renderDataList);
        filterContractInput.addEventListener('input', renderDataList);
        filterDestinationSelect.addEventListener('change', renderDataList);
        sortDateSelect.addEventListener('change', renderDataList);
    }

    // Expose functions to global scope for inline onclick handlers
    window.app = {
        populateFormForEdit,
        deleteRecordFromUI
    };

    // Start the application
    init();
});
