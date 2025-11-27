// This is the complete script.js file with your existing code preserved.
// The item comment functionality has been carefully integrated.
document.addEventListener('DOMContentLoaded', function () {
    const { jsPDF } = window.jspdf;
    const form = document.getElementById('invoice-form');
    const addRowBtn = document.getElementById('add-row-btn');
    const itemsBody = document.getElementById('items-body');
    const saveBtn = document.getElementById('save-btn');
    const buyerSelect = document.getElementById('buyer-select');
    const addBuyerBtn = document.getElementById('add-buyer-btn');
    let itemCounter = 0;

    // --- New Buyer Modal Elements ---
    const addBuyerModal = document.getElementById('add-buyer-modal');
    const closeModalBtn = addBuyerModal.querySelector('.close-btn');
    const newBuyerForm = document.getElementById('new-buyer-form');

    // --- Check URL for an invoice ID to determine Create vs. Edit mode ---
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');

    // ADD THIS NEW BLOCK IN ITS PLACE

// This is an async function that controls the page startup sequence
async function initializePage() {
    // 1. FIRST, wait for the buyer list to be fully loaded into the dropdown.
    await loadBuyers();

    // 2. NOW, check if we are in edit mode.
    if (invoiceId) {
        try {
            const doc = await db.collection('invoices').doc(invoiceId).get();
            if (doc.exists) {
                // 3. ONLY after buyers are loaded, populate the form.
                populateForm(doc.data());
            } else {
                console.error("No such document!");
                alert("Could not find the requested invoice.");
            }
        } catch (error) {
            console.error("Error getting document:", error);
        }
    } else {
        // This is for CREATE mode and runs if there's no invoice ID.
        const invoiceNoInput = document.getElementById('invoice-no');
        invoiceNoInput.value = 'Will be generated on save';
        invoiceNoInput.readOnly = true;
        document.getElementById('invoice-date').valueAsDate = new Date();
        addRow();
    }
}

// Run the initialization function
initializePage();
loadPerformaInvoices();

    /**
     * **MODIFIED**
     * Populates the form, including the new comment field for each item.
     */
    // REPLACE your old populateForm function with this complete, corrected version.

function populateForm(data) {
    document.getElementById('seller-details').value = data.sellerDetails;
    document.getElementById('buyer-details').value = data.buyerDetails;
    document.getElementById('invoice-no').value = data.invoiceNo;
    document.getElementById('invoice-no').readOnly = false;
    document.getElementById('invoice-date').value = data.invoiceDate;
    document.getElementById('terms').value = data.terms;
    document.getElementById('port-loading').value = data.portLoading;
    document.getElementById('port-discharge').value = data.portDischarge;
    document.getElementById('country-origin').value = data.countryOrigin;
    document.getElementById('container-no').value = data.containerNo;
    document.getElementById('container-size').value = data.containerSize;
    document.getElementById('total-items').value = data.totalItems;
    document.getElementById('gross-weight').value = data.grossWeight;
    document.getElementById('net-weight').value = data.netWeight;
    document.getElementById('bank-details').value = data.bankDetails;
    document.getElementById('remarks').value = data.remarks || '';

    const savedBuyerName = data.buyerName;
    if (savedBuyerName) {
        const buyerSelect = document.getElementById('buyer-select');
        for (let i = 0; i < buyerSelect.options.length; i++) {
            if (buyerSelect.options[i].text === savedBuyerName) {
                buyerSelect.selectedIndex = i;
                break;
            }
        }
    }

    itemsBody.innerHTML = '';
    data.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-2 py-1 align-top"><input type="text" class="item-sno w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.sno}" readonly>
            <input type="hidden" class="item-source-id" value="${item.sourcePerformaId || ''}"></td>
            <td class="px-2 py-1">
                <input type="text" class="item-desc w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.desc}">
                <input type="text" class="item-comment w-full border-gray-300 rounded-md shadow-sm text-sm mt-1 px-2 py-1 text-gray-500" placeholder="Add comments/details..." value="${item.comment || ''}">
            </td>
            <td class="px-2 py-1 align-top"><input type="text" class="item-hsn w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.hsn}"></td>
            <td class="px-2 py-1 align-top"><input type="number" class="item-qty w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.qty}" min="0"></td>
            <td class="px-2 py-1 align-top"><input type="text" class="item-uom w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.uom}"></td>
            <td class="px-2 py-1 align-top"><input type="number" class="item-m3 w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.m3}" step="0.001"></td>
            <td class="px-2 py-1 align-top"><input type="number" class="item-rate w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.rate}" step="0.01"></td>
            <td class="px-2 py-1 align-top"><input type="text" class="item-amount w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.amount.toFixed(2)}" readonly></td>
            <td class="px-2 py-1 align-top text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
        `;
        itemsBody.appendChild(row);
    });
    itemCounter = data.items.length;
    updateTotals();
}
    
    async function autoGenerateInvoiceNumber() {
        // This function is unchanged.
        const settingsRef = db.collection('settings').doc('invoiceCounter');
        try {
            const nextNumber = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(settingsRef);
                if (!doc.exists) {
                    transaction.set(settingsRef, { nextInvoiceNumber: 2 });
                    return 1;
                }
                const newNextNumber = doc.data().nextInvoiceNumber;
                transaction.update(settingsRef, { nextInvoiceNumber: newNextNumber + 1 });
                return newNextNumber;
            });

            const year = new Date().getFullYear();
            const formattedNumber = nextNumber.toString().padStart(3, '0');
            return `EXP/${formattedNumber}/${year}`;
        } catch (e) {
            console.error("Transaction failed: ", e);
            alert("Could not generate invoice number. Please try again.");
            return null;
        }
    }

    async function saveInvoice() {
        // This function is unchanged.
        const data = getFormData();
        
        if (invoiceId) {
            db.collection('invoices').doc(invoiceId).update(data)
                .then(() => {
                    alert('Invoice updated successfully!');
                    window.location.href = 'dashboard.html';
                })
                .catch(error => console.error("Error updating document: ", error));
        } else {
            const newInvoiceNo = await autoGenerateInvoiceNumber();
            if (!newInvoiceNo) return;
            data.invoiceNo = newInvoiceNo;
            
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            db.collection('invoices').add(data)
                .then(() => {
                    alert(`Invoice ${newInvoiceNo} saved successfully!`);
                    window.location.href = 'dashboard.html';
                })
                .catch(error => console.error("Error adding document: ", error));
        }
    }

// ==========================================
// UPDATED EXCEL EXPORT (Fixing Height/Width)
// ==========================================

window.exportInvoiceExcel = function() {
    const data = getFormData();
    const wb = XLSX.utils.book_new();
    
    // --- 1. STYLES ---
    const thinBorder = { style: "thin", color: { rgb: "000000" } };
    const borderAll = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    const styles = {
        company: { font: { bold: true, sz: 18, name: "Arial" }, alignment: { horizontal: "center", vertical: "center" } },
        address: { font: { sz: 10, name: "Arial" }, alignment: { horizontal: "center", vertical: "center" } },
        titleBox: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "D9D9D9" } }, border: borderAll },
        labelBold: { font: { bold: true, sz: 10 }, alignment: { horizontal: "left", vertical: "top" } },
        textNormal: { font: { sz: 10 }, alignment: { horizontal: "left", vertical: "top", wrapText: true } }, // wrapText is key
        tableHeader: { font: { bold: true, sz: 10 }, border: borderAll, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: { fgColor: { rgb: "F2F2F2" } } },
        cellBorder: { border: borderAll, alignment: { horizontal: "left", vertical: "top", wrapText: true } },
        cellCenter: { border: borderAll, alignment: { horizontal: "center", vertical: "top", wrapText: true } },
        cellNum: { border: borderAll, alignment: { horizontal: "right", vertical: "top" } },
        totalRow: { font: { bold: true }, border: borderAll, alignment: { horizontal: "right", vertical: "center" } }
    };

    let ws_data = [];
    let merges = [];
    let rowHeights = []; // यह नया Array है Row Heights कंट्रोल करने के लिए
    let row = 0;

    // Helper: Row Add karne ke liye aur Height set karne ke liye
    // height = pixels (e.g., 20 is standard, 40 is double)
    const addRow = (rowData, height = 20) => {
        ws_data.push(rowData);
        rowHeights.push({ hpx: height });
        row++;
    };

    const emptyRow = () => new Array(8).fill({ v: "", s: {} });

    // --- HEADER ---
    let r0 = emptyRow(); r0[0] = { v: "OSWAL LUMBERS PVT. LTD.", s: styles.company };
    addRow(r0, 30); // Height 30
    merges.push({ s: {r:0, c:0}, e: {r:0, c:7} });

    let r1 = emptyRow(); r1[0] = { v: "SURVEY NO 262, N H. 8/A, MITHIROHAR, GANDHIDHAM-370201-GUJARAT-INDIA", s: styles.address };
    addRow(r1, 20);
    merges.push({ s: {r:1, c:0}, e: {r:1, c:7} });

    let r2 = emptyRow(); r2[0] = { v: "E-MAIL: info@oswallumbers.com", s: styles.address };
    addRow(r2, 20);
    merges.push({ s: {r:2, c:0}, e: {r:2, c:7} });

    addRow(emptyRow(), 15); // Gap

    // --- INVOICE TITLE ---
    let r4 = emptyRow(); r4[0] = { v: "INVOICE", s: styles.titleBox };
    for(let i=1; i<=7; i++) r4[i] = { v: "", s: styles.titleBox };
    addRow(r4, 25);
    merges.push({ s: {r:4, c:0}, e: {r:4, c:7} });

    addRow(emptyRow(), 15); // Gap

    // --- PARTY DETAILS (Fixed Height Logic) ---
    // समस्या यहाँ थी: टेक्स्ट लम्बा है लेकिन Row छोटी थी।
    // हम 3 Rows का उपयोग कर रहे हैं (7, 8, 9), हम इनकी हाइट बढ़ा देंगे।
    
    const clean = (txt) => txt ? txt.replace(/\n/g, "\n") : "";
    const buyerFull = data.buyerName + (data.buyerDetails ? "\n" + clean(data.buyerDetails) : "");

    // Row 6
    let r6 = emptyRow();
    r6[0] = { v: "SELLER / SHIPPER:", s: styles.labelBold };
    r6[4] = { v: "INVOICE NO:", s: styles.labelBold };
    r6[5] = { v: data.invoiceNo, s: styles.textNormal };
    addRow(r6, 20);
    merges.push({ s: {r:6, c:5}, e: {r:6, c:7} });

    // Row 7 (Seller Address Start) - **HEIGHT INCREASED TO 45**
    let r7 = emptyRow();
    r7[0] = { v: clean(data.sellerDetails), s: styles.textNormal };
    r7[4] = { v: "DATE:", s: styles.labelBold };
    r7[5] = { v: data.invoiceDate, s: styles.textNormal };
    addRow(r7, 40); 
    merges.push({ s: {r:7, c:0}, e: {r:9, c:3} }); // Seller Addr merge down 3 rows
    merges.push({ s: {r:7, c:5}, e: {r:7, c:7} });

    // Row 8 - **HEIGHT INCREASED TO 45**
    let r8 = emptyRow();
    r8[4] = { v: "TERMS:", s: styles.labelBold };
    r8[5] = { v: data.terms, s: styles.textNormal };
    addRow(r8, 40);
    merges.push({ s: {r:8, c:5}, e: {r:8, c:7} });

    // Row 9 - **HEIGHT INCREASED TO 45**
    let r9 = emptyRow();
    r9[4] = { v: "PORT LOADING:", s: styles.labelBold };
    r9[5] = { v: data.portLoading, s: styles.textNormal };
    addRow(r9, 40);
    merges.push({ s: {r:9, c:5}, e: {r:9, c:7} });

    // Buyer Section
    let r10 = emptyRow();
    r10[0] = { v: "BUYER / CONSIGNEE:", s: styles.labelBold };
    r10[4] = { v: "PORT DISCHARGE:", s: styles.labelBold };
    r10[5] = { v: data.portDischarge, s: styles.textNormal };
    addRow(r10, 20);
    merges.push({ s: {r:10, c:5}, e: {r:10, c:7} });

    // Buyer Address Rows - **HEIGHT INCREASED TO 45 EACH**
    let r11 = emptyRow();
    r11[0] = { v: buyerFull, s: styles.textNormal };
    r11[4] = { v: "ORIGIN:", s: styles.labelBold };
    r11[5] = { v: data.countryOrigin, s: styles.textNormal };
    addRow(r11, 40);
    merges.push({ s: {r:11, c:0}, e: {r:13, c:3} }); // Buyer Addr merge
    merges.push({ s: {r:11, c:5}, e: {r:11, c:7} });

    addRow(emptyRow(), 40); // Filler for Buyer merge
    addRow(emptyRow(), 40); // Filler for Buyer merge

    addRow(emptyRow(), 20); // Gap

    // --- TABLE HEADER ---
    const headers = ["S. NO.", "DESCRIPTION OF ITEM", "HSN CODE", "QTY", "UOM", "M3", "RATE (US$)", "AMOUNT (US$)"];
    let headRow = headers.map(h => ({ v: h, s: styles.tableHeader }));
    addRow(headRow, 30);

    // --- TABLE ITEMS (Dynamic Height) ---
    data.items.forEach(item => {
        let desc = item.desc;
        if(item.comment) desc += `\n(${item.comment})`;

        // Calculate needed height roughly
        // Approx 60 chars per line roughly in that column width. 
        // 1 line = 20px. 
        const lineCount = desc.split('\n').length + Math.floor(desc.length / 50);
        const rowHeight = Math.max(25, lineCount * 18); // Min 25px

        let r = [
            { v: item.sno, s: styles.cellCenter },
            { v: desc, s: styles.cellBorder },
            { v: item.hsn, s: styles.cellCenter },
            { v: item.qty, s: styles.cellCenter },
            { v: item.uom, s: styles.cellCenter },
            { v: item.m3, s: styles.cellNum },
            { v: item.rate, s: styles.cellNum },
            { v: item.amount, s: styles.cellNum }
        ];
        addRow(r, rowHeight);
    });

    // --- TOTALS ---
    let totalRow = emptyRow();
    totalRow[0] = { v: "TOTAL", s: styles.totalRow };
    totalRow[1] = { v: "", s: styles.totalRow }; 
    totalRow[2] = { v: "", s: styles.totalRow };
    totalRow[3] = { v: document.getElementById('total-qty').textContent, s: styles.totalRow };
    totalRow[4] = { v: "", s: { border: borderAll } };
    totalRow[5] = { v: document.getElementById('total-m3').textContent, s: styles.totalRow };
    totalRow[6] = { v: "", s: { border: borderAll } };
    totalRow[7] = { v: document.getElementById('total-amount').textContent.replace('$',''), s: styles.totalRow };
    
    addRow(totalRow, 25);
    merges.push({ s: {r:row-1, c:0}, e: {r:row-1, c:2} });

    addRow(emptyRow(), 20);

    // --- FOOTER ---
    const addFooterLine = (label, val) => {
        let r = emptyRow();
        r[0] = { v: label, s: styles.labelBold };
        r[1] = { v: val, s: styles.textNormal };
        addRow(r, 20);
        merges.push({ s: {r:row-1, c:1}, e: {r:row-1, c:3} });
    };

    addFooterLine("CONTAINER NO:", data.containerNo);
    addFooterLine("SIZE:", data.containerSize);
    addFooterLine("TOTAL ITEMS:", data.totalItems);
    addFooterLine("GROSS WEIGHT:", data.grossWeight);
    addFooterLine("NET WEIGHT:", data.netWeight);

    addRow(emptyRow(), 20);

    let wordRow = emptyRow();
    wordRow[0] = { v: "AMOUNT IN WORDS: " + amountToWords(data.totalAmount), s: styles.labelBold };
    addRow(wordRow, 25);
    merges.push({ s: {r:row-1, c:0}, e: {r:row-1, c:7} });

    addRow(emptyRow(), 20);

    let bankTitle = emptyRow();
    bankTitle[0] = { v: "BANK DETAILS:", s: styles.labelBold };
    addRow(bankTitle, 20);

    const bankLines = data.bankDetails.split('\n');
    bankLines.forEach(line => {
        let r = emptyRow();
        r[0] = { v: line, s: styles.textNormal };
        addRow(r, 20);
        merges.push({ s: {r:row-1, c:0}, e: {r:row-1, c:5} });
    });

    addRow(emptyRow(), 20);
    addRow(emptyRow(), 20);

    let signRow = emptyRow();
    signRow[5] = { v: "For, OSWAL LUMBERS PVT. LTD.", s: { font: { bold: true }, alignment: { horizontal: "right" } } };
    addRow(signRow, 25);
    merges.push({ s: {r:row-1, c:5}, e: {r:row-1, c:7} });

    addRow(emptyRow(), 40); // Space for sign
    
    let authRow = emptyRow();
    authRow[5] = { v: "AUTHORISED SIGNATORY", s: { font: { bold: true }, alignment: { horizontal: "right" } } };
    addRow(authRow, 25);
    merges.push({ s: {r:row-1, c:5}, e: {r:row-1, c:7} });

    // --- FILE CREATION ---
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
    ws['!rows'] = rowHeights; // यह है वो जादू जो Row Height ठीक करेगा
    
   ws['!cols'] = [
        { wch: 25 }, // Col A: "SELLER/SHIPPER" के लिए चौड़ाई 8 से बढ़ाकर 25 कर दी है
        { wch: 50 }, // Col B: Description
        { wch: 12 }, // Col C: HSN
        { wch: 10 }, // Col D: Qty
        { wch: 25 }, // Col E: "PORT DISCHARGE" आदि के लिए चौड़ाई 8 से बढ़ाकर 25 कर दी है
        { wch: 12 }, // Col F: M3
        { wch: 12 }, // Col G: Rate
        { wch: 15 }  // Col H: Amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `Invoice_${data.invoiceNo.replace(/\//g, '-')}.xlsx`);
};

// ==========================================
// PACKING LIST EXPORT (Final Fixes)
// ==========================================

window.exportPackingListExcel = function() {
    const data = getFormData();
    const wb = XLSX.utils.book_new();

    // --- 1. Helper Functions ---
    // Date Format Converter (YYYY-MM-DD to DD-MM-YYYY)
    const formatDateIndian = (dateString) => {
        if (!dateString) return "";
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    };

    const clean = (txt) => txt ? txt.replace(/\n/g, "\n") : "";

    // --- 2. STYLES ---
    const thinBorder = { style: "thin", color: { rgb: "000000" } };
    const borderAll = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    const styles = {
        company: { font: { bold: true, sz: 18, name: "Arial" }, alignment: { horizontal: "center", vertical: "center" } },
        address: { font: { sz: 10, name: "Arial" }, alignment: { horizontal: "center", vertical: "center" } },
        titleBox: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" }, fill: { fgColor: { rgb: "D9D9D9" } }, border: borderAll },
        labelBold: { font: { bold: true, sz: 10 }, alignment: { horizontal: "left", vertical: "top" } },
        textNormal: { font: { sz: 10 }, alignment: { horizontal: "left", vertical: "top", wrapText: true } },
        tableHeader: { font: { bold: true, sz: 10 }, border: borderAll, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: { fgColor: { rgb: "F2F2F2" } } },
        cellBorder: { border: borderAll, alignment: { horizontal: "left", vertical: "top", wrapText: true } },
        cellCenter: { border: borderAll, alignment: { horizontal: "center", vertical: "top", wrapText: true } },
        cellNum: { border: borderAll, alignment: { horizontal: "right", vertical: "top" } },
        totalRow: { font: { bold: true }, border: borderAll, alignment: { horizontal: "right", vertical: "center" } }
    };

    let ws_data = [];
    let merges = [];
    let rowHeights = [];
    let row = 0;

    const addRow = (rowData, height = 20) => {
        ws_data.push(rowData);
        rowHeights.push({ hpx: height });
        row++;
    };
    const emptyRow = () => new Array(6).fill({ v: "", s: {} });

    // --- 3. HEADER SECTION ---
    
    // Row 0: Company Name
    let r0 = emptyRow(); r0[0] = { v: "OSWAL LUMBERS PVT. LTD.", s: styles.company };
    addRow(r0, 30);
    merges.push({ s: {r:0, c:0}, e: {r:0, c:5} });

    // Row 1: Company Address (जो पहले मिसिंग था)
    let r1 = emptyRow(); r1[0] = { v: "SURVEY NO 262, N H. 8/A, MITHIROHAR, GANDHIDHAM-370201-GUJARAT-INDIA", s: styles.address };
    addRow(r1, 20);
    merges.push({ s: {r:1, c:0}, e: {r:1, c:5} });

    // Row 2: Email (जो पहले मिसिंग था)
    let r2 = emptyRow(); r2[0] = { v: "E-MAIL: info@oswallumbers.com", s: styles.address };
    addRow(r2, 20);
    merges.push({ s: {r:2, c:0}, e: {r:2, c:5} });

    addRow(emptyRow(), 15);

    // Row 4: Title
    let r4 = emptyRow(); r4[0] = { v: "PACKING LIST", s: styles.titleBox };
    for(let i=1; i<=5; i++) r4[i] = { v: "", s: styles.titleBox };
    addRow(r4, 25);
    merges.push({ s: {r:4, c:0}, e: {r:4, c:5} });

    addRow(emptyRow(), 15);

    // --- 4. SELLER / BUYER & SHIPPING DETAILS ---
    // Layout: Col A-B (Left), Col C-F (Right)

    const buyerInfo = data.buyerName + (data.buyerDetails ? "\n" + clean(data.buyerDetails) : "");

    // Row 6: Seller Label | Invoice No
    let r6 = emptyRow();
    r6[0] = { v: "SELLER:", s: styles.labelBold };
    r6[2] = { v: "INVOICE NO:", s: styles.labelBold };
    r6[3] = { v: data.invoiceNo, s: styles.textNormal };
    addRow(r6, 20);
    merges.push({ s: {r:6, c:3}, e: {r:6, c:5} }); // Merge Invoice Value

    // Row 7: Seller Address | Date
    let r7 = emptyRow();
    r7[0] = { v: clean(data.sellerDetails), s: styles.textNormal };
    r7[2] = { v: "DATE:", s: styles.labelBold };
    r7[3] = { v: formatDateIndian(data.invoiceDate), s: styles.textNormal }; // Indian Date
    addRow(r7, 70); // HEIGHT INCREASED FOR SELLER ADDRESS
    merges.push({ s: {r:7, c:0}, e: {r:9, c:1} }); // Merge Seller Down (3 rows) & Across
    merges.push({ s: {r:7, c:3}, e: {r:7, c:5} });

    // Row 8: (Seller cont.) | Terms
    let r8 = emptyRow();
    r8[2] = { v: "TERMS:", s: styles.labelBold };
    r8[3] = { v: data.terms, s: styles.textNormal };
    addRow(r8, 25);
    merges.push({ s: {r:8, c:3}, e: {r:8, c:5} });

    // Row 9: (Seller cont.) | Port Loading
    let r9 = emptyRow();
    r9[2] = { v: "PORT LOADING:", s: styles.labelBold };
    r9[3] = { v: data.portLoading, s: styles.textNormal };
    addRow(r9, 25);
    merges.push({ s: {r:9, c:3}, e: {r:9, c:5} });

    // Row 10: Buyer Label | Port Discharge
    let r10 = emptyRow();
    r10[0] = { v: "BUYER:", s: styles.labelBold };
    r10[2] = { v: "PORT DISCHARGE:", s: styles.labelBold };
    r10[3] = { v: data.portDischarge, s: styles.textNormal };
    addRow(r10, 20);
    merges.push({ s: {r:10, c:3}, e: {r:10, c:5} });

    // Row 11: Buyer Address | Origin
    let r11 = emptyRow();
    r11[0] = { v: buyerInfo, s: styles.textNormal };
    r11[2] = { v: "ORIGIN:", s: styles.labelBold };
    r11[3] = { v: data.countryOrigin, s: styles.textNormal };
    addRow(r11, 70); // HEIGHT INCREASED FOR BUYER ADDRESS
    merges.push({ s: {r:11, c:0}, e: {r:12, c:1} }); // Merge Buyer Down
    merges.push({ s: {r:11, c:3}, e: {r:11, c:5} });

    // Spacer row for Buyer merge
    let r12 = emptyRow();
    addRow(r12, 20); // Dummy row for merge

    addRow(emptyRow(), 20);

    // --- 5. ITEMS TABLE ---
    const headers = ["S. NO.", "DESCRIPTION", "HSN", "QTY", "UOM", "M3"];
    let headRow = headers.map(h => ({ v: h, s: styles.tableHeader }));
    addRow(headRow, 30);

    data.items.forEach(item => {
        let desc = item.desc;
        if(item.comment) desc += `\n(${item.comment})`;

        // Dynamic Height
        const lineCount = desc.split('\n').length + Math.floor(desc.length / 50);
        const h = Math.max(25, lineCount * 18);

        let r = [
            { v: item.sno, s: styles.cellCenter },
            { v: desc, s: styles.cellBorder },
            { v: item.hsn, s: styles.cellCenter },
            { v: item.qty, s: styles.cellCenter },
            { v: item.uom, s: styles.cellCenter },
            { v: item.m3, s: styles.cellNum }
        ];
        addRow(r, h);
    });

    // --- 6. TOTALS ---
    let tot = emptyRow();
    tot[0] = { v: "TOTAL", s: styles.totalRow };
    tot[3] = { v: document.getElementById('total-qty').textContent, s: styles.totalRow };
    tot[4] = { v: "", s: { border: borderAll } }; // Empty border for UOM
    tot[5] = { v: document.getElementById('total-m3').textContent, s: styles.totalRow };
    
    addRow(tot, 25);
    merges.push({ s: {r:row-1, c:0}, e: {r:row-1, c:2} });

    addRow(emptyRow(), 20);

    // --- 7. WEIGHTS ---
    const addWeightRow = (lbl, val) => {
        let r = emptyRow();
        r[0] = { v: lbl, s: styles.labelBold };
        r[1] = { v: val, s: styles.textNormal };
        addRow(r, 20);
        merges.push({ s: {r:row-1, c:1}, e: {r:row-1, c:2} });
    };

    addWeightRow("GROSS WEIGHT:", data.grossWeight);
    addWeightRow("NET WEIGHT:", data.netWeight);

    addRow(emptyRow(), 20);

    // Signature
    let signRow = emptyRow();
    signRow[3] = { v: "For, OSWAL LUMBERS PVT. LTD.", s: { font: { bold: true }, alignment: { horizontal: "right" } } };
    addRow(signRow, 25);
    merges.push({ s: {r:row-1, c:3}, e: {r:row-1, c:5} });

    addRow(emptyRow(), 40);
    
    let authRow = emptyRow();
    authRow[3] = { v: "AUTHORISED SIGNATORY", s: { font: { bold: true }, alignment: { horizontal: "right" } } };
    addRow(authRow, 25);
    merges.push({ s: {r:row-1, c:3}, e: {r:row-1, c:5} });

    // --- 8. FILE CREATION ---
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = merges;
    ws['!rows'] = rowHeights;
    
    // Column Widths (Fixed)
    ws['!cols'] = [
        { wch: 25 }, // Col A: Seller Label / S.No (Increased width)
        { wch: 50 }, // Col B: Description / Address
        { wch: 18 }, // Col C: Labels (Inv No, Ports) / HSN
        { wch: 12 }, // Col D: Values / Qty
        { wch: 8 },  // Col E: UOM
        { wch: 15 }  // Col F: M3
    ];

    XLSX.utils.book_append_sheet(wb, ws, "PackingList");
    XLSX.writeFile(wb, `PackingList_${data.invoiceNo.replace(/\//g, '-')}.xlsx`);
};

function getFormData() {
    const items = [];
    let totalM3 = 0;
    
    // Allocation Map: किस Performa ID का कितना M3 इस इनवॉइस में है
    let performaAllocation = {}; 

    itemsBody.querySelectorAll('tr').forEach(row => {
        const m3 = parseFloat(row.querySelector('.item-m3').value) || 0;
        // Hidden input से source ID निकालें
        const sourceIdInput = row.querySelector('.item-source-id');
        const sourceId = sourceIdInput ? sourceIdInput.value : null;

        if (sourceId) {
            if (!performaAllocation[sourceId]) performaAllocation[sourceId] = 0;
            performaAllocation[sourceId] += m3;
        }

        items.push({
            sno: row.querySelector('.item-sno').value,
            desc: row.querySelector('.item-desc').value,
            comment: row.querySelector('.item-comment').value,
            hsn: row.querySelector('.item-hsn').value,
            qty: parseFloat(row.querySelector('.item-qty').value) || 0,
            uom: row.querySelector('.item-uom').value,
            m3: m3,
            rate: parseFloat(row.querySelector('.item-rate').value) || 0,
            amount: parseFloat(row.querySelector('.item-amount').value) || 0,
            sourcePerformaId: sourceId // आइटम लेवल पर भी सेव कर सकते हैं
        });
        totalM3 += m3;
    });

    const selectedBuyerName = buyerSelect.options[buyerSelect.selectedIndex].text;
    
    // sourcePerformaId को अब हम Array के रूप में सेव करेंगे अगर मल्टीपल हैं
    let sourceIdsValue = document.getElementById('source-performa-id').value;
    try {
        // अगर यह JSON string है (multi-select से), तो parse करें
        if(sourceIdsValue.startsWith('[')) {
            sourceIdsValue = JSON.parse(sourceIdsValue);
        }
    } catch(e) {}

    return {
        sourcePerformaId: sourceIdsValue, 
        performaAllocation: performaAllocation, // यह नया फील्ड डैशबोर्ड के लिए है
        buyerName: (buyerSelect.value && selectedBuyerName !== '-- Select or Add New Buyer --') ? selectedBuyerName : '',
        sellerDetails: document.getElementById('seller-details').value,
        buyerDetails: document.getElementById('buyer-details').value,
        invoiceNo: document.getElementById('invoice-no').value,
        invoiceDate: document.getElementById('invoice-date').value,
        terms: document.getElementById('terms').value,
        portLoading: document.getElementById('port-loading').value,
        portDischarge: document.getElementById('port-discharge').value,
        countryOrigin: document.getElementById('country-origin').value,
        containerNo: document.getElementById('container-no').value,
        containerSize: document.getElementById('container-size').value,
        totalItems: document.getElementById('total-items').value,
        grossWeight: document.getElementById('gross-weight').value,
        netWeight: document.getElementById('net-weight').value,
        bankDetails: document.getElementById('bank-details').value,
        remarks: document.getElementById('remarks').value,
        totalAmount: parseFloat(document.getElementById('total-amount').textContent.replace('$', '')) || 0,
        totalM3: totalM3,
        items: items
    };
}

    function loadBuyers() {
        // This function is unchanged.
        db.collection('buyers').orderBy('name').get().then(querySnapshot => {
            while (buyerSelect.options.length > 1) {
                buyerSelect.remove(1);
            }
            querySnapshot.forEach(doc => {
                const buyer = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = buyer.name;
                buyerSelect.appendChild(option);
            });
        }).catch(error => console.error("Error loading buyers: ", error));
    }

    function handleBuyerSelection() {
        // This function is unchanged.
        const buyerId = buyerSelect.value;
        if (!buyerId) {
            document.getElementById('buyer-details').value = '';
            document.getElementById('terms').value = '';
            document.getElementById('port-discharge').value = '';
            return;
        }

        db.collection('buyers').doc(buyerId).get().then(doc => {
            if (doc.exists) {
                const buyer = doc.data();
                document.getElementById('buyer-details').value = buyer.address || '';
                document.getElementById('terms').value = buyer.terms || '';
                document.getElementById('port-discharge').value = buyer.portOfDischarge || '';
            }
        }).catch(error => console.error("Error fetching buyer details: ", error));
    }

   
// --- Existing Event Listeners ---
        addBuyerBtn.addEventListener('click', () => { addBuyerModal.classList.remove('hidden'); });
        closeModalBtn.addEventListener('click', () => { addBuyerModal.classList.add('hidden'); });
        window.addEventListener('click', (event) => { if (event.target == addBuyerModal) { addBuyerModal.classList.add('hidden'); } });

    // This block is unchanged.
    newBuyerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBuyer = {
            name: document.getElementById('new-buyer-name').value,
            address: document.getElementById('new-buyer-address').value,
            terms: document.getElementById('new-buyer-terms').value,
            portOfDischarge: document.getElementById('new-buyer-port').value,
        };

        db.collection('buyers').add(newBuyer).then(docRef => {
            alert(`Buyer "${newBuyer.name}" added successfully.`);
            const option = document.createElement('option');
            option.value = docRef.id;
            option.textContent = newBuyer.name;
            option.selected = true;
            buyerSelect.appendChild(option);
            buyerSelect.dispatchEvent(new Event('change'));
            addBuyerModal.style.display = 'none';
            newBuyerForm.reset();
        }).catch(error => console.error("Error adding new buyer: ", error));
    });
    
    // These listeners are unchanged.
    addRowBtn.addEventListener('click', addRow);
    saveBtn.addEventListener('click', saveInvoice);
    buyerSelect.addEventListener('change', handleBuyerSelection);
 

    // This listener is unchanged.
    itemsBody.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-m3') || e.target.classList.contains('item-rate')) {
            const row = e.target.closest('tr');
            const m3 = parseFloat(row.querySelector('.item-m3').value) || 0;
            const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
            row.querySelector('.item-amount').value = (m3 * rate).toFixed(2);
        }
        updateTotals();
    });

    // This listener is unchanged.
    itemsBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row-btn')) {
            e.target.closest('tr').remove();
            itemCounter = itemsBody.querySelectorAll('tr').length;
            itemsBody.querySelectorAll('.item-sno').forEach((input, index) => { input.value = index + 1; });
            updateTotals();
        }
    });

    /**
     * **MODIFIED**
     * Adds a new row with both a description input and a comment input.
     */
    function addRow() {
    itemCounter++;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="px-2 py-1 align-top"><input type="text" class="item-sno w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemCounter}" readonly></td>
        <td class="px-2 py-1">
            <input type="text" class="item-desc w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" placeholder="8 INCHES X 8 INCHES X 12 FEET">
            <input type="text" class="item-comment w-full border-gray-300 rounded-md shadow-sm text-sm mt-1 px-2 py-1 text-gray-500" placeholder="Add comments/details...">
        </td>
        <td class="px-2 py-1 align-top"><input type="text" class="item-hsn w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="44071100"></td>
        <td class="px-2 py-1 align-top"><input type="number" class="item-qty w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="1" min="0"></td>
        <td class="px-2 py-1 align-top"><input type="text" class="item-uom w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="PCS"></td>
        <td class="px-2 py-1 align-top"><input type="number" class="item-m3 w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="0" step="0.001"></td>
        <td class="px-2 py-1 align-top"><input type="number" class="item-rate w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="0" step="0.01"></td>
        <td class="px-2 py-1 align-top"><input type="text" class="item-amount w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" readonly></td>
        <td class="px-2 py-1 align-top text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
    `;
    itemsBody.appendChild(row);
}

    function updateTotals() {
        // This function is unchanged.
        let totalQty = 0, totalM3 = 0, totalAmount = 0;
        itemsBody.querySelectorAll('tr').forEach(row => {
            totalQty += parseFloat(row.querySelector('.item-qty').value) || 0;
            totalM3 += parseFloat(row.querySelector('.item-m3').value) || 0;
            totalAmount += parseFloat(row.querySelector('.item-amount').value) || 0;
        });
        document.getElementById('total-qty').textContent = totalQty.toFixed(0);
        document.getElementById('total-m3').textContent = totalM3.toFixed(3);
        document.getElementById('total-amount').textContent = `$${totalAmount.toFixed(2)}`;
    }
    // ===== NEW FUNCTIONS TO LOAD FROM PERFORMA INVOICE =====

    function loadPerformaInvoices() {
        const select = document.getElementById('performa-select');
        db.collection('performaInvoices').orderBy('createdAt', 'desc').get().then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const pi = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${pi.performaInvoiceNo} - ${pi.buyerName}`;
                select.appendChild(option);
            });
        }).catch(error => console.error("Error loading performa invoices: ", error));
    }

// --- New Logic for Merging Multiple Proforma Invoices ---

document.getElementById('load-merge-btn').addEventListener('click', loadSelectedPerformaInvoices);

async function loadSelectedPerformaInvoices() {
    const select = document.getElementById('performa-select');
    const selectedOptions = Array.from(select.selectedOptions);
    
    if (selectedOptions.length === 0) {
        alert("Please select at least one Proforma Invoice.");
        return;
    }

    const selectedIds = selectedOptions.map(opt => opt.value);
    
    try {
        // सभी सेलेक्ट किए गए डॉक्यूमेंट्स को fetch करें
        const promises = selectedIds.map(id => db.collection('performaInvoices').doc(id).get());
        const snapshots = await Promise.all(promises);
        
        const performaDocs = snapshots.map(snap => ({ id: snap.id, ...snap.data() }));
        
        // वैलिडेशन: चेक करें कि सभी PI का बायर (Buyer) एक ही है या नहीं
        const firstBuyer = performaDocs[0].buyerName;
        const isSameBuyer = performaDocs.every(doc => doc.buyerName === firstBuyer);
        
        if (!isSameBuyer) {
            alert("Error: Selected Proforma Invoices belong to different buyers. You can only merge invoices for the same buyer.");
            return;
        }

        // फॉर्म को पहले PI के डिटेल्स से भरें (Seller, Buyer, Terms etc.)
        populateHeaderFromPerforma(performaDocs[0]);

        // आइटम्स टेबल को खाली करें और सभी PI के आइटम्स जोड़ें
        const itemsBody = document.getElementById('items-body');
        itemsBody.innerHTML = ''; 
        let currentSno = 0;

        // यह Hidden Input हमें ट्रैक करने में मदद करेगा कि कौन सा PI जुड़ा है
        document.getElementById('source-performa-id').value = JSON.stringify(selectedIds);

        performaDocs.forEach(doc => {
            doc.items.forEach(item => {
                currentSno++;
                addMergedRow(item, currentSno, doc.id, doc.performaInvoiceNo);
            });
        });

        updateTotals();
        alert(`Successfully merged ${selectedIds.length} Proforma Invoices.`);

    } catch (error) {
        console.error("Error merging invoices:", error);
        alert("Error loading data.");
    }
}

function populateHeaderFromPerforma(data) {
    // बायर और अन्य डिटेल्स सेट करें
    document.getElementById('buyer-details').value = data.buyerDetails || '';
    document.getElementById('terms').value = data.terms || '';
    
    const buyerSelect = document.getElementById('buyer-select');
    if (data.buyerName) {
        for (let i = 0; i < buyerSelect.options.length; i++) {
            if (buyerSelect.options[i].text === data.buyerName) {
                buyerSelect.selectedIndex = i;
                break;
            }
        }
    }
    buyerSelect.dispatchEvent(new Event('change'));
    
    // बाकी फील्ड्स को खाली करें जो मैनुअल भरने हैं
    document.getElementById('container-no').value = '';
    document.getElementById('gross-weight').value = '';
    document.getElementById('net-weight').value = '';
}

function addMergedRow(itemData, sno, sourceId, sourceNo) {
    const itemsBody = document.getElementById('items-body');
    const row = document.createElement('tr');
    
    // यहाँ हम एक hidden attribute 'data-source-id' जोड़ रहे हैं
    row.innerHTML = `
        <td class="px-2 py-1 align-top">
            <input type="text" class="item-sno w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${sno}" readonly>
            <input type="hidden" class="item-source-id" value="${sourceId}"> 
        </td>
        <td class="px-2 py-1">
            <input type="text" class="item-desc w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.dimension || ''}">
            <input type="text" class="item-comment w-full border-gray-300 rounded-md shadow-sm text-sm mt-1 px-2 py-1 text-gray-500" placeholder="Ref: ${sourceNo}" value="Ref: ${sourceNo}">
        </td>
        <td class="px-2 py-1 align-top"><input type="text" class="item-hsn w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.hsn || ''}"></td>
        <td class="px-2 py-1 align-top"><input type="number" class="item-qty w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="" min="0" placeholder="Qty"></td>
        <td class="px-2 py-1 align-top"><input type="text" class="item-uom w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="PCS"></td>
        <td class="px-2 py-1 align-top"><input type="number" class="item-m3 w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.m3 || 0}" step="0.001"></td>
        <td class="px-2 py-1 align-top"><input type="number" class="item-rate w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.rate || 0}" step="0.01"></td>
        <td class="px-2 py-1 align-top"><input type="text" class="item-amount w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${(itemData.m3 * itemData.rate).toFixed(2)}" readonly></td>
        <td class="px-2 py-1 align-top text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
    `;
    itemsBody.appendChild(row);
}

function populateFormFromPerforma(data) {
    // Populate buyer and shipment details
    document.getElementById('buyer-details').value = data.buyerDetails || '';
    document.getElementById('terms').value = data.terms || '';
    
    // Find and select the buyer in the dropdown
    if (data.buyerName) {
        for (let i = 0; i < buyerSelect.options.length; i++) {
            if (buyerSelect.options[i].text === data.buyerName) {
                buyerSelect.selectedIndex = i;
                break;
            }
        }
    }
    // Trigger change to load port of discharge if available
    buyerSelect.dispatchEvent(new Event('change'));

    // Clear existing items and populate from performa
    itemsBody.innerHTML = '';
    itemCounter = 0; // Reset counter
    data.items.forEach(itemData => {
        itemCounter++;
        const row = document.createElement('tr');
        
        // --- THIS IS THE CORRECTED HTML BLOCK ---
        row.innerHTML = `
            <td class="px-2 py-1 align-top"><input type="text" class="item-sno w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemCounter}" readonly></td>
            <td class="px-2 py-1">
                <input type="text" class="item-desc w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${data.mainItemDesc || 'PINE WOOD SAWN TIMBER (AD WITH ANTI STAIN):'}">
                <input type="text" class="item-comment w-full border-gray-300 rounded-md shadow-sm text-sm mt-1 px-2 py-1 text-gray-500" placeholder="Add comments/details..." value="${itemData.dimension || ''}">
            </td>
            <td class="px-2 py-1 align-top"><input type="text" class="item-hsn w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.hsn || ''}"></td>
            <td class="px-2 py-1 align-top"><input type="number" class="item-qty w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="" min="0" placeholder="Enter Qty"></td>
            <td class="px-2 py-1 align-top"><input type="text" class="item-uom w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="PCS"></td>
            <td class="px-2 py-1 align-top"><input type="number" class="item-m3 w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.m3 || 0}" step="0.001"></td>
            <td class="px-2 py-1 align-top"><input type="number" class="item-rate w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemData.rate || 0}" step="0.01"></td>
            <td class="px-2 py-1 align-top"><input type="text" class="item-amount w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${(itemData.m3 * itemData.rate).toFixed(2)}" readonly></td>
            <td class="px-2 py-1 align-top text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
        `;
        itemsBody.appendChild(row);
    });

    // Clear fields that need manual input
    document.getElementById('container-no').value = '';
    document.getElementById('gross-weight').value = '';
    document.getElementById('net-weight').value = '';
    
    updateTotals();
    alert('Form populated from Performa Invoice. Please enter Quantity, Container, and Weight details.');
}

    // This is the closing of the main DOMContentLoaded function
    form.addEventListener('submit', function (e) {
        // This function is unchanged.
        e.preventDefault();
        generatePDF();
    });
    
    /**
     * **MODIFIED**
     * Generates the PDF, combining the item description and comment into a single cell.
     */
    function generatePDF() {
        const doc = new jsPDF();
        // All PDF styling and header/footer code is unchanged.
        const font = 'Helvetica';
        doc.setFont(font, 'normal');
        doc.setTextColor('#000000');
        doc.setDrawColor('#000000');
        const margin = 10;
        const pageWidth = doc.internal.pageSize.width;
        const middleX = pageWidth / 2;
        let y = margin + 5;

        // --- HEADER --- (unchanged)
        doc.setFontSize(30);
        doc.setFont(font, 'bold');
        doc.text('OSWAL LUMBERS PVT. LTD.', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10);
        doc.setFont(font, 'normal');
        doc.text('SURVEY NO 262, N H. 8/A, MITHIROHAR, GANDHIDHAM-370201-GUJARAT-INDIA', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text('E-MAIL: info@oswallumbers.com', pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(16);
        doc.setFont(font, 'bold');
        doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
        y += 8;

        const borderStartY = y;
        const sellerBuyerDividerY = borderStartY + 40;

        // --- SELLER --- (unchanged)
        doc.setFontSize(10);
        doc.setFont(font, 'bold');
        doc.text('SELLER / SHIPPER:', margin + 2, borderStartY + 5);
        doc.setFont(font, 'normal');
        doc.text(document.getElementById('seller-details').value, margin + 2, borderStartY + 9, { lineHeightFactor: 1.3, maxWidth: middleX - margin - 4 });

        // --- BUYER --- (unchanged)
        doc.setFont(font, 'bold');
        doc.text('BUYER / CONSIGNEE:', margin + 2, sellerBuyerDividerY + 5);
        doc.setFont(font, 'normal');
        const selectedBuyerName = buyerSelect.options[buyerSelect.selectedIndex].text;
        const buyerAddress = document.getElementById('buyer-details').value;
        let fullBuyerText = '';
        if (buyerSelect.value && selectedBuyerName !== '-- Select or Add New Buyer --') {
            fullBuyerText = selectedBuyerName + '\n' + buyerAddress;
        } else {
            fullBuyerText = buyerAddress;
        }
        doc.text(fullBuyerText, margin + 2, sellerBuyerDividerY + 9, { lineHeightFactor: 1.3, maxWidth: middleX - margin - 4 });
        
        // --- INVOICE DETAILS (RIGHT SIDE) --- (unchanged)
        let rightSideY = borderStartY + 5;
        const invoiceNo = document.getElementById('invoice-no').value;
        const invoiceDate = new Date(document.getElementById('invoice-date').value).toLocaleDateString('en-GB');
        doc.setFont(font, 'bold');
        doc.text(`INVOICE NO: ${invoiceNo}`, middleX + 2, rightSideY);
        doc.text(`DATE: ${invoiceDate}`, pageWidth - margin - 2, rightSideY, { align: 'right' });
        rightSideY += 10;
        doc.setFont(font, 'normal');
        doc.text(`TERMS OF SHIPMENT: ${document.getElementById('terms').value}`, middleX + 2, rightSideY);
        rightSideY += 12;
        doc.text(`PORT OF LOADING: ${document.getElementById('port-loading').value}`, middleX + 2, rightSideY);
        rightSideY += 12;
        doc.text(`PORT OF DISCHARGE: ${document.getElementById('port-discharge').value}`, middleX + 2, rightSideY);
        rightSideY += 12;
        doc.text(`COUNTRY OF ORIGIN: ${document.getElementById('country-origin').value}`, middleX + 2, rightSideY);
        
        y = borderStartY + 68 + 11;
        doc.line(margin, y - 2, pageWidth - margin, y - 2);

        // --- ITEMS TABLE ---
        const head = [['S. NO.', 'DESCRIPTION OF ITEM', 'HSN CODE', 'QTY', 'UOM', 'M3', 'RATE IN US$\nCNF/M3', 'AMOUNT IN US$\nCNF']];
        const body = [];
        
        // **MODIFICATION START**: Loop now combines description and comment for PDF output.
        itemsBody.querySelectorAll('tr').forEach(row => {
            const description = row.querySelector('.item-desc').value;
            const comment = row.querySelector('.item-comment').value;

            // Combine description and comment, adding the comment on a new line if it exists.
            let fullDescription = description;
            if (comment && comment.trim() !== '') {
                fullDescription += `\n${comment}`;
            }

            body.push([
                row.querySelector('.item-sno').value,
                fullDescription, // Use the combined description and comment here
                row.querySelector('.item-hsn').value,
                row.querySelector('.item-qty').value,
                row.querySelector('.item-uom').value,
                parseFloat(row.querySelector('.item-m3').value).toFixed(3),
                parseFloat(row.querySelector('.item-rate').value).toFixed(2),
                parseFloat(row.querySelector('.item-amount').value).toFixed(2)
            ]);
        });
        // **MODIFICATION END**
        
        const totalQty = document.getElementById('total-qty').textContent;
        const totalM3 = document.getElementById('total-m3').textContent;
        const totalAmount = document.getElementById('total-amount').textContent.replace('$', '');
        
        body.push([
            { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: totalQty, styles: { fontStyle: 'bold' } }, '',
            { content: totalM3, styles: { fontStyle: 'bold' } }, '',
            { content: totalAmount, styles: { fontStyle: 'bold' } }
        ]);

        doc.autoTable({
            head: head, body: body, startY: y, theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            styles: { font: font, fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 }, 1: { cellWidth: 60 }, 2: { halign: 'center' }, 
                3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' }, 
                6: { halign: 'right' }, 7: { halign: 'right' }
            }
        });
        
        // --- The rest of the PDF generation code is unchanged ---
        let finalY = doc.autoTable.previous.finalY;
        const remarks = document.getElementById('remarks').value;
        if (remarks) {
            finalY += 6;
            doc.setFontSize(9);
            doc.setFont(font, 'normal');
            doc.text(remarks, margin + 2, finalY, { maxWidth: pageWidth - (margin * 2) - 4 });
            finalY += doc.getTextDimensions(remarks, { maxWidth: pageWidth - (margin * 2) - 4 }).h;
        }

        // REPLACE your old footer code with this entire block.

// --- FOOTER ---
// The left side starts below the "Amount in Words" box.
let leftSideY = finalY + 17;
doc.setFontSize(10);
doc.setFont(font, 'bold');
doc.text('CONTAINER NO.', margin + 2, leftSideY);
doc.setFont(font, 'bold');
doc.text(document.getElementById('container-no').value, margin + 35, leftSideY);
leftSideY += 5;

// This is the line we modified earlier.
doc.setFont(font, 'bold');
doc.text(`${document.getElementById('container-size').value} CONTAINER`, margin + 2, leftSideY);
leftSideY += 5;

doc.text('TOTAL ITEMS:', margin + 2, leftSideY);
doc.setFont(font, 'bold');
doc.text(document.getElementById('total-items').value, margin + 35, leftSideY);
leftSideY += 8;
doc.setFont(font, 'bold');
doc.text('TOTAL GROSS WEIGHT:', margin + 2, leftSideY);
doc.text(document.getElementById('gross-weight').value, margin + 45, leftSideY);
leftSideY += 5;
doc.text('TOTAL NET WEIGHT:', margin + 2, leftSideY);
doc.text(document.getElementById('net-weight').value, margin + 45, leftSideY);

// ADD THIS NEW, SIMPLER BLOCK in the same place.

// --- AMOUNT IN WORDS (Full Width, No Border) ---
const totalInWords = amountToWords(parseFloat(totalAmount)) + " ONLY.";
// Create the single line of text you want.
const fullAmountText = `Amounts in Word: ${totalInWords.toUpperCase()}`;

// Set the Y position to start, giving some space after the table.
let amountWordsY = finalY + 8;

// Print the text in a single, full-width line.
doc.setFont(font, 'bold');
doc.setFontSize(10);
doc.text(fullAmountText, margin + 2, amountWordsY, { 
    maxWidth: pageWidth - (margin * 2) - 4 
});

// IMPORTANT: Measure the height of the text we just printed.
const textBlockHeight = doc.getTextDimensions(fullAmountText, { 
    maxWidth: pageWidth - (margin * 2) - 4 
}).h;

// Update finalY so the content below starts after our text.
finalY = amountWordsY + textBlockHeight + 5;
// We define a new variable here instead of the old 'rightFooterY'.
let rightSideFooterY = finalY + 4;
doc.setFontSize(10);
doc.setFont(font, 'bold');
doc.text(document.getElementById('bank-details').value, middleX, rightSideFooterY, { lineHeightFactor: 1.5 });

// Calculate signature position based on the new rightSideFooterY variable.
let signatureY = rightSideFooterY + doc.getTextDimensions(document.getElementById('bank-details').value, { lineHeightFactor: 1.5 }).h + 25;
doc.setFont(font, 'bold');
doc.text('For, OSWAL LUMBERS PVT. LTD.', pageWidth - margin - 10, signatureY + 12, { align: 'right' });
doc.text('AUTHORISED SIGNATORY', pageWidth - margin - 10, signatureY + 35, { align: 'right' });

// This part for drawing the main border is unchanged.
const borderEndY = signatureY + 45; 
doc.setLineWidth(0.7);
doc.setDrawColor(0, 0, 0);
doc.line(margin, borderStartY, pageWidth - margin, borderStartY);
doc.line(margin, borderEndY, pageWidth - margin, borderEndY);
doc.line(margin, borderStartY, margin, borderEndY);
doc.line(pageWidth - margin, borderStartY, pageWidth - margin, borderEndY);
doc.line(middleX, borderStartY, middleX, borderStartY + 78);
doc.line(margin, sellerBuyerDividerY, middleX, sellerBuyerDividerY);

// The final doc.save() call should be after this block.

        doc.save('invoice.pdf');
    }
    
    // REPLACE your old amountToWords function with this complete, corrected version.
function amountToWords(amount) {
    // These helper arrays are the same as before.
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    // This helper function is the same as before and works correctly for numbers up to 999.
    function convertHundreds(n) {
        let str = '';
        if (n > 99) {
            str += ones[Math.floor(n / 100)] + ' HUNDRED ';
            n %= 100;
        }
        if (n > 19) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 9) {
            str += teens[n - 10] + ' ';
            return str;
        }
        if (n > 0) {
            str += ones[n] + ' ';
        }
        return str;
    }

    // --- NEW LOGIC START ---
    // This is the main logic that now handles thousands.
    const [dollars, cents] = amount.toFixed(2).split('.');
    let words = 'US DOLLARS ';

    const num = parseInt(dollars, 10);

    if (num === 0) {
        words += 'ZERO';
    } else {
        let numberInWords = '';
        
        // Handle thousands place
        if (num >= 1000) {
            // Convert the thousands part (e.g., for 8419, this converts the 8)
            numberInWords += convertHundreds(Math.floor(num / 1000)) + 'THOUSAND ';
        }

        // Handle the remaining hundreds part (e.g., for 8419, this converts the 419)
        const remainingHundreds = num % 1000;
        if (remainingHundreds > 0) {
            numberInWords += convertHundreds(remainingHundreds);
        }
        
        words += numberInWords;
    }

    // Handle cents part (this logic is the same as before)
    if (parseInt(cents, 10) > 0) {
        words += 'AND CENTS ' + convertHundreds(parseInt(cents, 10));
    }

    // Clean up extra spaces and return the final string.
    return words.trim().replace(/\s+/g, ' ');
    // --- NEW LOGIC END ---
}
}

);

