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
let activeFieldId = null; // Stores ID of the input currently being edited

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
        auth.signInAnonymously().catch(error => {
            errorMessage.textContent = "Error: Enable 'Anonymous' in Firebase Console. " + error.message;
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
    const dateInput = document.getElementById('entryDate');
    if(dateInput) dateInput.valueAsDate = new Date();

    if (recordId) {
        await loadRecordForEditing(recordId);
    } else {
        const snapshot = await recordsCollection.orderBy('recordNumber', 'desc').limit(1).get();
        const lastRecordNumber = snapshot.empty ? 0 : snapshot.docs[0].data().recordNumber;
        const recNumInput = document.getElementById('recordNumber');
        if(recNumInput) recNumInput.value = lastRecordNumber + 1;
        
        recordItems = [{ fullLength: '', invLength: '', girth: '', cft: 0 }];
        renderSlider();
    }
    
    populatePartyNames(); 
    const partyInput = document.getElementById('partyName');
    const dateInput = document.getElementById('entryDate');
    
    if(partyInput) partyInput.addEventListener('focus', hideKeypad);
    if(dateInput) dateInput.addEventListener('focus', hideKeypad);
    
    // Hide it initially
    hideKeypad();
    
    // Auto-open print if requested
    if (urlParams.get('action') === 'print' && recordId) {
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
    document.getElementById('partyName').value = record.partyName || ''; 
    document.getElementById('entryDate').value = record.date;
    document.getElementById('recordNumber').value = record.recordNumber;
    
    const deleteBtn = document.getElementById('delete-btn');
    if(deleteBtn) {
        deleteBtn.classList.remove('d-none');
        deleteBtn.onclick = () => deleteRecord(doc.id);
    }
    
    recordItems = record.items && record.items.length > 0 ? record.items : [{ fullLength: '', invLength: '', girth: '', cft: 0 }];
    renderSlider();
}

// --- SLIDER & UI LOGIC ---

function renderSlider() {
    const sliderContainer = document.getElementById('slider-container');
    if (!sliderContainer) return;

    sliderContainer.innerHTML = recordItems.map((item, index) => {
        const cftValue = (item.cft || 0).toFixed(2);
        return `
            <div class="log-card">
                <div class="entry-box-card">
                    <button type="button" class="card-delete-btn" onclick="removeLogRow(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                    
                    <h5 class="text-muted mb-3 small fw-bold text-uppercase">Log Entry #${index + 1}</h5>

                    <div class="row g-3">
                        <div class="col-6">
                            <div class="form-floating">
                                <input type="text" id="fullLength-${index}" 
                                    class="form-control" placeholder="0" readonly
                                    value="${item.fullLength || ''}" 
                                    onclick="setActiveField('fullLength-${index}')">
                                <label>List Len</label>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="form-floating">
                                <input type="text" id="invLength-${index}" 
                                    class="form-control" placeholder="0" readonly
                                    value="${item.invLength || ''}" 
                                    onclick="setActiveField('invLength-${index}')">
                                <label>Used Len</label>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="form-floating">
                                <input type="text" id="girth-${index}" 
                                    class="form-control" placeholder="0" readonly
                                    value="${item.girth || ''}" 
                                    onclick="setActiveField('girth-${index}')">
                                <label>Girth</label>
                            </div>
                        </div>
                    </div>

                    <div class="cft-result-box">
                        <div class="small text-uppercase fw-bold opacity-75">Volume (CFT)</div>
                        <div class="fs-1 fw-bold cft-value-display">${cftValue}</div>
                    </div>
                </div>
            </div>`;
    }).join('');
    
    showSlide(currentIndex);
    updateTotals();

    // Auto-select logic:
    // If we have an active field, re-highlight it (good for returning from delete)
    // Otherwise, default to the first field of the current slide.
    if(activeFieldId && document.getElementById(activeFieldId)) {
        setActiveField(activeFieldId);
    } else {
        setActiveField(`fullLength-${currentIndex}`);
    }
}

function showSlide(index) {
    const sliderContainer = document.getElementById('slider-container');
    if (!sliderContainer) return;

    currentIndex = Math.max(0, Math.min(index, recordItems.length - 1));
    sliderContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
}

function addLogRow() {
    recordItems.push({ fullLength: '', invLength: '', girth: '', cft: 0 });
    currentIndex = recordItems.length - 1;
    renderSlider();
    
    // Auto-focus the new log's first field
    setTimeout(() => {
        setActiveField(`fullLength-${currentIndex}`);
    }, 50);
}

function removeLogRow(index) {
    if (recordItems.length <= 1) {
        alert("Cannot delete the last log.");
        return;
    }
    if (confirm(`Delete Log #${index + 1}?`)) {
        recordItems.splice(index, 1);
        if (currentIndex >= recordItems.length) currentIndex = recordItems.length - 1;
        renderSlider();
    }
}

// --- ACTIVE FIELD & KEYPAD LOGIC ---
// Replace your existing setActiveField function
function setActiveField(id) {
    // 1. Remove active class from old field
    if (activeFieldId) {
        const oldEl = document.getElementById(activeFieldId);
        if (oldEl) oldEl.classList.remove('active-field');
    }
    
    // 2. Set new active field
    activeFieldId = id;
    const newEl = document.getElementById(id);
    if (newEl) {
        newEl.classList.add('active-field');
        
        // NEW: Ensure Keypad is visible
        showKeypad(); 
        
        // Ensure we slide to the correct card
        const parts = id.split('-'); 
        const slideIndex = parseInt(parts[1]);
        if (slideIndex !== currentIndex) showSlide(slideIndex);
    }
}

function kp(key) {
    if (!activeFieldId) return;
    const input = document.getElementById(activeFieldId);
    if (!input) return;

    // Append number
    let val = input.value;
    // Prevent multiple decimals
    if (key === '.' && val.includes('.')) return;
    
    val += key;
    input.value = val;
    
    // Trigger calculation
    const parts = activeFieldId.split('-');
    const field = parts[0];
    const index = parseInt(parts[1]);
    
    updateItem(index, field, val);
}

function kpBack() {
    if (!activeFieldId) return;
    const input = document.getElementById(activeFieldId);
    if (!input) return;

    let val = input.value;
    val = val.substring(0, val.length - 1);
    input.value = val;

    const parts = activeFieldId.split('-');
    updateItem(parseInt(parts[1]), parts[0], val);
}

function kpNext() {
    if (!activeFieldId) return;
    const parts = activeFieldId.split('-');
    const field = parts[0];
    const index = parseInt(parts[1]);

    // Logic: Full -> Inv -> Girth -> Next Slide
    if (field === 'fullLength') {
        setActiveField(`invLength-${index}`);
    } else if (field === 'invLength') {
        setActiveField(`girth-${index}`);
    } else if (field === 'girth') {
        // Move to next slide or create new
        if (index < recordItems.length - 1) {
             showSlide(index + 1);
             setActiveField(`fullLength-${index + 1}`);
        } else {
             addLogRow(); 
        }
    }
}

// --- CALCULATION LOGIC ---

function updateItem(index, field, value) {
    if (!recordItems[index]) return;
    
    // 1. Update Data
    recordItems[index][field] = value;
    
    // 2. Auto-calculate Used Length based on List Length
    if (field === 'fullLength') {
        const listLen = parseFloat(value);
        if (!isNaN(listLen)) {
            let usedLen = listLen > 520 ? 520 : listLen;
            recordItems[index].invLength = usedLen;
            const usedInput = document.getElementById(`invLength-${index}`);
            if (usedInput) usedInput.value = usedLen;
        }
    }

    // 3. Recalculate CFT
    const item = recordItems[index];
    const usedLength = parseFloat(item.invLength) || 0;
    const girth = parseFloat(item.girth) || 0;
    item.cft = (usedLength * girth * girth / 16000000) * 35.315;

    // 4. Update Display on Card
    const sliderContainer = document.getElementById('slider-container');
    const card = sliderContainer.children[index];
    if (card) {
        const cftDisplay = card.querySelector('.cft-value-display');
        if(cftDisplay) cftDisplay.innerText = item.cft.toFixed(2);
    }
    
    updateTotals();
}

function updateTotals() {
    const totalPcs = recordItems.filter(item => item.fullLength).length;
    const totalCft = recordItems.reduce((sum, item) => sum + (item.cft || 0), 0);
    const totalCbm = totalCft / 35.315;

    document.getElementById('total-pcs').innerText = totalPcs;
    document.getElementById('total-cft').innerText = totalCft.toFixed(2);
    document.getElementById('total-cbm').innerText = totalCbm.toFixed(2);
}

function manualNextLog() {
    if (currentIndex < recordItems.length - 1) {
        showSlide(currentIndex + 1);
        setActiveField(`fullLength-${currentIndex + 1}`);
    } else {
        addLogRow();
    }
}

function manualPrevLog() {
    if (currentIndex > 0) {
        showSlide(currentIndex - 1);
        setActiveField(`fullLength-${currentIndex - 1}`);
    }
}
// --- KEYPAD VISIBILITY LOGIC ---
function showKeypad() {
    const keypad = document.querySelector('.virtual-keypad-container');
    if(keypad) {
        keypad.classList.remove('keypad-hidden');
        // Add padding to body so content isn't covered
        document.body.style.paddingBottom = '260px'; 
    }
}

function hideKeypad() {
    const keypad = document.querySelector('.virtual-keypad-container');
    if(keypad) {
        keypad.classList.add('keypad-hidden');
        // Reduce padding when keypad is gone
        document.body.style.paddingBottom = '80px'; 
        
        // Also remove "active" blue border from log inputs
        if(activeFieldId) {
             const el = document.getElementById(activeFieldId);
             if(el) el.classList.remove('active-field');
             activeFieldId = null;
        }
    }
}
// --- SAVING & EXPORTING ---

async function saveRecord() {
    const partyName = document.getElementById('partyName').value.trim();
    const entryDate = document.getElementById('entryDate').value;
    const recordNumber = document.getElementById('recordNumber').value;
    
    if (!partyName || !entryDate) { return alert('Please fill in Supplier Name and Date.'); }

    const validItems = recordItems.filter(item => item.fullLength && item.girth);
    if (validItems.length === 0) { return alert('Please add at least one complete log.'); }

    const recordData = { 
        recordNumber: parseInt(recordNumber), 
        partyName, 
        date: entryDate, 
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
            if(deleteBtn) {
                deleteBtn.classList.remove('d-none');
                deleteBtn.onclick = () => deleteRecord(recordId);
            }
            successModal.show();
        }
    } catch (error) {
        console.error("Error saving record: ", error);
        alert('Error: Could not save data.');
    }
}

async function populatePartyNames() {
    const dataList = document.getElementById('party-names-list');
    if(!dataList) return;
    try {
        const snapshot = await recordsCollection.get();
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
    const itemsToPrint = recordItems.filter(item => item.fullLength);
    if (itemsToPrint.length === 0) { return alert("Nothing to print."); }
    
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 32;
    
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
        
        const tableHead = [['Sr.', 'List', 'Used', 'Girth', 'CFT']];
        const tableStyles = { theme: 'grid', headStyles: { fillColor: [50, 50, 50], fontSize: 8 }, styles: { fontSize: 8, cellPadding: 1.5 }, columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 4: { halign: 'right', cellWidth: 18 } } };
        
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
    }
    
    // Footer Totals
    const totalPcs = document.getElementById('total-pcs').innerText;
    const totalCft = document.getElementById('total-cft').innerText;
    const totalCbm = document.getElementById('total-cbm').innerText;
    
    doc.autoTable({ 
        body: [[{ content: 'Grand Totals', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } }], ['Total PCS', 'Total CFT', 'Total CBM'], [totalPcs, totalCft, totalCbm]], 
        startY: doc.lastAutoTable.finalY + 5, theme: 'grid', styles: { fontSize: 10, halign: 'center' }, tableWidth: 100, margin: { left: (pageWidth - 100) / 2 } 
    });
    
    doc.save(`Report_${partyName}.pdf`);
}

function exportRecordToExcel() {
    const partyName = document.getElementById('partyName').value || "Unknown";
    const date = document.getElementById('entryDate').value || "NoDate";
    const items = recordItems.filter(item => item.fullLength);

    if (items.length === 0) return alert("No data to export.");

    const data = [["Supplier Name:", partyName], ["Date:", date], [], ["Sr No.", "List Length", "Used Length", "Girth", "CFT"]];
    items.forEach((item, index) => {
        data.push([index + 1, parseFloat(item.fullLength) || 0, parseFloat(item.invLength) || 0, parseFloat(item.girth) || 0, parseFloat(item.cft) || 0]);
    });
    data.push([], ["", "", "", "Total PCS:", items.length], ["", "", "", "Total CFT:", document.getElementById('total-cft').innerText], ["", "", "", "Total CBM:", document.getElementById('total-cbm').innerText]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Record Details");
    XLSX.writeFile(wb, `${partyName}_${date}.xlsx`);
}

