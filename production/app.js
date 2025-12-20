firebase.initializeApp(firebaseConfig);

// Configure connections
const db = firebase.firestore();
const auth = firebase.auth();
const recordsCollection = db.collection('records');

// --- CONFIGURATION ---
const APP_PIN = "1234"; // CHANGE THIS PIN AS NEEDED

// --- GLOBAL VARIABLES ---
let recordItems = []; 
let currentIndex = 0;

// --- AUTHENTICATION ---
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', event => {
        event.preventDefault();
        const pinInput = document.getElementById('pin').value;
        loginWithPin(pinInput);
    });
}

auth.onAuthStateChanged(user => {
    const onLoginPage = window.location.pathname.includes('login.html');
    if (!user && !onLoginPage) {
        window.location.href = 'login.html';
    } else if (user && onLoginPage) {
        window.location.href = 'index.html';
    }
});

function loginWithPin(pin) {
    const errorMessage = document.getElementById('error-message');
    if (pin === APP_PIN) {
        // Uses Anonymous Auth. Make sure "Anonymous" is enabled in Firebase Console -> Auth
        auth.signInAnonymously().catch(error => {
            errorMessage.textContent = "Error: Enable 'Anonymous' in Firebase Console Auth settings. " + error.message;
            errorMessage.classList.remove('d-none');
        });
    } else {
        errorMessage.textContent = "Invalid PIN. Try again.";
        errorMessage.classList.remove('d-none');
    }
}
function logoutUser() { auth.signOut(); }

// --- SCRIPT FOR ENTRY PAGE (entry.html) ---

async function initializeEntryPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');
    document.getElementById('entryDate').valueAsDate = new Date();

    if (recordId) {
        await loadRecordForEditing(recordId);
    } else {
        const snapshot = await recordsCollection.orderBy('recordNumber', 'desc').limit(1).get();
        const lastRecordNumber = snapshot.empty ? 0 : snapshot.docs[0].data().recordNumber;
        document.getElementById('recordNumber').value = lastRecordNumber + 1;
        
        recordItems = [{ fullLength: '', invLength: '', girth: '', cft: 0 }];
        renderSlider();
    }
    
    populatePartyNames(); // Actually populates Supplier Names
    setupSliderControls();
    
    // Auto-open print if requested
    if (urlParams.get('action') === 'print' && recordId) {
        // Wait a moment for data to load then print
        setTimeout(() => printList(), 1500);
    }
}

async function loadRecordForEditing(recordId) {
    const doc = await recordsCollection.doc(recordId).get();
    if (!doc.exists) {
        alert('Record not found.');
        return window.location.href = 'index.html';
    }
    
    const record = doc.data();
    document.getElementById('page-title').innerText = `Edit #${record.recordNumber}`;
    // Maps DB partyName to UI Supplier Name
    document.getElementById('partyName').value = record.partyName || ''; 
    document.getElementById('entryDate').value = record.date;
    document.getElementById('recordNumber').value = record.recordNumber;
    
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.classList.remove('d-none');
    deleteBtn.onclick = () => deleteRecord(doc.id);
    
    recordItems = record.items && record.items.length > 0 ? record.items : [{ fullLength: '', invLength: '', girth: '', cft: 0 }];
    renderSlider();
}

// --- SLIDER LOGIC ---

function renderSlider() {
    const sliderContainer = document.getElementById('slider-container');
    if (!sliderContainer) return;

    sliderContainer.innerHTML = recordItems.map((item, index) => {
        const cftValue = (item.cft || 0).toFixed(2);
        return `
            <div class="log-card">
                <div class="log-card-header">
                    <h3 class="log-card-title">Log #${index + 1}</h3>
                    <button type="button" class="btn-close" aria-label="Delete Log" onclick="removeLogRow(${index})"></button>
                </div>
                <div class="row g-3">
                    <div class="col-6">
                        <label class="form-label text-muted">List Length</label>
                        <input type="number" id="fullLength-${index}" class="form-control form-control-lg fw-bold" placeholder="List" value="${item.fullLength || ''}" oninput="updateItem(${index}, 'fullLength', this.value)">
                    </div>
                    <div class="col-6">
                        <label class="form-label text-muted">Used Length</label>
                        <input type="number" id="invLength-${index}" class="form-control form-control-lg fw-bold" placeholder="Used" value="${item.invLength || ''}" oninput="updateItem(${index}, 'invLength', this.value)">
                    </div>
                    <div class="col-12">
                        <label class="form-label text-muted">Girth</label>
                        <input type="number" id="girth-${index}" class="form-control form-control-lg fw-bold" placeholder="Girth" value="${item.girth || ''}" oninput="updateItem(${index}, 'girth', this.value)">
                    </div>
                    <div class="col-12">
                        <div class="cft-display mt-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <span>CFT</span>
                                <span class="fs-3">${cftValue}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
    
    showSlide(currentIndex);
    updateTotals();
}

function showSlide(index) {
    const sliderContainer = document.getElementById('slider-container');
    const slideCounter = document.getElementById('slide-counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (!sliderContainer) return;

    currentIndex = Math.max(0, Math.min(index, recordItems.length - 1));

    sliderContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
    slideCounter.textContent = `Log ${currentIndex + 1} / ${recordItems.length}`;
    
    prevBtn.disabled = currentIndex === 0;
}

function setupSliderControls() {
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentIndex > 0) {
            showSlide(currentIndex - 1);
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (currentIndex < recordItems.length - 1) {
            showSlide(currentIndex + 1);
        } else {
            addLogRow();
        }
    });
}

function addLogRow() {
    recordItems.push({ fullLength: '', invLength: '', girth: '', cft: 0 });
    currentIndex = recordItems.length - 1;
    renderSlider();
    setTimeout(() => {
        document.getElementById(`fullLength-${currentIndex}`).focus();
    }, 100);
}

function removeLogRow(index) {
    if (recordItems.length <= 1) {
        alert("Cannot delete the last log.");
        return;
    }
    if (confirm(`Delete Log #${index + 1}?`)) {
        recordItems.splice(index, 1);
        renderSlider();
    }
}

function updateItem(index, field, value) {
    if (!recordItems[index]) return;
    
    // 1. Update the field being typed in
    recordItems[index][field] = value;
    
    // 2. LOGIC: Auto-calculate Used Length based on List Length
    if (field === 'fullLength') {
        const listLen = parseFloat(value);
        if (!isNaN(listLen)) {
            let usedLen;
            if (listLen > 520) {
                usedLen = 520; // Fixed 520 if above
            } else {
                usedLen = listLen; // Same as List if below or equal
            }
            
            // Update data model
            recordItems[index].invLength = usedLen;
            
            // Update UI input
            const usedInput = document.getElementById(`invLength-${index}`);
            if (usedInput) {
                usedInput.value = usedLen;
            }
        }
    }

    // 3. Recalculate CFT
    // Formula uses invLength (Used Length)
    const item = recordItems[index];
    const usedLength = parseFloat(item.invLength) || 0;
    const girth = parseFloat(item.girth) || 0;
    
    item.cft = (usedLength * girth * girth / 16000000) * 35.315;

    // 4. Update CFT Display on Card
    const sliderContainer = document.getElementById('slider-container');
    const card = sliderContainer.children[index];
    if (card) {
        const cftDisplay = card.querySelector('.cft-display span.fs-3');
        if(cftDisplay) cftDisplay.innerText = item.cft.toFixed(2);
    }
    
    updateTotals();

    // 5. Auto-focus logic
    if (value.length >= 3) {
        if (field === 'fullLength') {
             // If we just autofilled Used Length, skip to Girth
             document.getElementById(`girth-${index}`).focus();
        } else if (field === 'invLength') {
             document.getElementById(`girth-${index}`).focus();
        } else if (field === 'girth') {
             document.getElementById('next-btn').click();
        }
    }
}


function updateTotals() {
    const totalPcs = recordItems.filter(item => item.fullLength).length;
    const totalCft = recordItems.reduce((sum, item) => sum + (item.cft || 0), 0);
    const totalCbm = totalCft / 35.315;

    document.getElementById('total-pcs').innerText = totalPcs;
    document.getElementById('total-cft').innerText = totalCft.toFixed(2);
    document.getElementById('total-cbm').innerText = totalCbm.toFixed(2);
}

// --- CORE FUNCTIONS ---

async function saveRecord() {
    // Maps UI Supplier Name -> DB partyName
    const partyName = document.getElementById('partyName').value.trim();
    const entryDate = document.getElementById('entryDate').value;
    const recordNumber = document.getElementById('recordNumber').value;
    
    // Removed vehicleNumber check
    const vehicleNumber = ""; 

    if (!partyName || !entryDate) { return alert('Please fill in Supplier Name and Date.'); }

    const validItems = recordItems.filter(item => item.fullLength && item.invLength && item.girth);
    if (validItems.length === 0) { return alert('Please add at least one complete log.'); }

    const recordData = { 
        recordNumber: parseInt(recordNumber), 
        partyName, // Saved as partyName for backward compatibility
        date: entryDate, 
        vehicleNumber, 
        items: validItems, 
        totals: { 
            pcs: document.getElementById('total-pcs').innerText, 
            cft: document.getElementById('total-cft').innerText, 
            cbm: document.getElementById('total-cbm').innerText 
        } 
    };
    
    const urlParams = new URLSearchParams(window.location.search);
    let recordId = urlParams.get('id');
    try {
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        if (recordId) {
            await recordsCollection.doc(recordId).update(recordData);
            successModal.show();
        } else {
            const newDocRef = await recordsCollection.add(recordData);
            recordId = newDocRef.id;
            document.getElementById('page-title').innerText = `Edit #${recordNumber}`;
            const newUrl = `${window.location.pathname}?id=${recordId}`;
            history.pushState({ path: newUrl }, '', newUrl);
            const deleteBtn = document.getElementById('delete-btn');
            deleteBtn.classList.remove('d-none');
            deleteBtn.onclick = () => deleteRecord(recordId);
            successModal.show();
        }
    } catch (error) {
        console.error("Error saving record: ", error);
        alert('Error: Could not save data.');
    }
}

async function populatePartyNames() {
    const dataList = document.getElementById('party-names-list');
    try {
        const snapshot = await recordsCollection.get();
        // Uses partyName field but acts as Supplier Name
        const partyNames = new Set(snapshot.docs.map(doc => doc.data().partyName).filter(Boolean));
        dataList.innerHTML = '';
        partyNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            dataList.appendChild(option);
        });
    } catch (error) { console.error("Could not populate names: ", error); }
}

async function deleteRecord(recordId) {
    if (confirm('Delete this record permanently?')) {
        try {
            await recordsCollection.doc(recordId).delete();
            window.location.href = 'index.html';
        } catch (error) { console.error("Error deleting: ", error); alert('Could not delete.'); }
    }
}

function printList() {
    const { jsPDF } = window.jspdf;
    const partyName = document.getElementById('partyName').value;
    const date = document.getElementById('entryDate').value;
    
    // Filter items
    const itemsToPrint = recordItems.filter(item => item.fullLength);
    if (itemsToPrint.length === 0) { return alert("Nothing to print."); }
    
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 32;
    let finalY = 0;
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TIMBER RECORDS', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Supplier: ${partyName}`, 14, 25);
    doc.text(`Date: ${date}`, pageWidth - 14, 25, { align: 'right' });

    const chunkSize = 45;
    const itemsPerPage = chunkSize * 2;
    const numPages = Math.ceil(itemsToPrint.length / itemsPerPage);
    
    for (let i = 0; i < numPages; i++) {
        if (i > 0) { doc.addPage(); startY = 15; }
        const pageItems = itemsToPrint.slice(i * itemsPerPage, (i + 1) * itemsPerPage);
        const leftItems = pageItems.slice(0, chunkSize);
        const rightItems = pageItems.slice(chunkSize, itemsPerPage);
        
        // Changed Headers to List Length / Used Length
        const tableHead = [['Sr.', 'List', 'Used', 'Girth', 'CFT']];
        const tableStyles = { theme: 'grid', headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' }, styles: { fontSize: 8, cellPadding: 1.5 }, columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 4: { halign: 'right', cellWidth: 18 } } };
        
        const leftBody = leftItems.map((item, idx) => [(i * itemsPerPage) + idx + 1, item.fullLength, item.invLength, item.girth, item.cft.toFixed(2)]);
        const leftSubtotal = leftItems.reduce((sum, item) => sum + item.cft, 0);
        leftBody.push([{ content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: leftSubtotal.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }]);
        
        doc.autoTable({ ...tableStyles, head: tableHead, body: leftBody, startY: startY, margin: { left: 14, right: pageWidth / 2 + 2, bottom: 10 } });
        
        let leftFinalY = doc.autoTable.previous.finalY;
        let rightFinalY = 0;
        
        if (rightItems.length > 0) {
            const rightBody = rightItems.map((item, idx) => [(i * itemsPerPage) + chunkSize + idx + 1, item.fullLength, item.invLength, item.girth, item.cft.toFixed(2)]);
            const rightSubtotal = rightItems.reduce((sum, item) => sum + item.cft, 0);
            rightBody.push([{ content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: rightSubtotal.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }]);
            
            doc.autoTable({ ...tableStyles, head: tableHead, body: rightBody, startY: startY, margin: { left: pageWidth / 2 + 2, bottom: 10 } });
            rightFinalY = doc.autoTable.previous.finalY;
        }
        finalY = Math.max(leftFinalY, rightFinalY);
    }
    
    // Footer Totals
    const totalPcs = document.getElementById('total-pcs').innerText;
    const totalCft = document.getElementById('total-cft').innerText;
    const totalCbm = document.getElementById('total-cbm').innerText;
    
    doc.autoTable({ 
        body: [
            [{ content: 'Grand Totals', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } }], 
            ['Total PCS', 'Total CFT', 'Total CBM'], 
            [totalPcs, totalCft, totalCbm]
        ], 
        startY: finalY + 5, 
        theme: 'grid', 
        styles: { fontSize: 10, halign: 'center' }, 
        tableWidth: 100,
        margin: { left: (pageWidth - 100) / 2 } 
    });
    
    doc.save(`Report_${partyName}.pdf`);
}
function exportRecordToExcel() {
    const partyName = document.getElementById('partyName').value || "Unknown";
    const date = document.getElementById('entryDate').value || "NoDate";
    const items = recordItems.filter(item => item.fullLength);

    if (items.length === 0) return alert("No data to export.");

    // 1. Prepare Data Array
    const data = [];
    data.push(["Supplier Name:", partyName]);
    data.push(["Date:", date]);
    data.push([]); // Empty row
    data.push(["Sr No.", "List Length", "Used Length", "Girth", "CFT"]); // Headers

    items.forEach((item, index) => {
        data.push([
            index + 1,
            parseFloat(item.fullLength) || 0,
            parseFloat(item.invLength) || 0,
            parseFloat(item.girth) || 0,
            parseFloat(item.cft) || 0
        ]);
    });

    data.push([]); // Empty row
    data.push(["", "", "", "Total PCS:", items.length]);
    data.push(["", "", "", "Total CFT:", document.getElementById('total-cft').innerText]);
    data.push(["", "", "", "Total CBM:", document.getElementById('total-cbm').innerText]);

    // 2. Create Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 3. Append Sheet and Save
    XLSX.utils.book_append_sheet(wb, ws, "Record Details");
    XLSX.writeFile(wb, `${partyName}_${date}.xlsx`);
}