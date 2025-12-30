document.addEventListener('DOMContentLoaded', function () {
    const { jsPDF } = window.jspdf;
    const form = document.getElementById('performa-invoice-form');
    const addRowBtn = document.getElementById('add-row-btn');
    const itemsBody = document.getElementById('items-body');
    const saveBtn = document.getElementById('save-btn');
    const buyerSelect = document.getElementById('buyer-select');
    const addBuyerBtn = document.getElementById('add-buyer-btn');
    const addBuyerModal = document.getElementById('add-buyer-modal');
    const closeModalBtn = addBuyerModal.querySelector('.close-btn');
    const newBuyerForm = document.getElementById('new-buyer-form');
    let itemCounter = 0;

    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');

    function formatNumber(num) {
        if (isNaN(num)) return '0.00';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }
    
    async function initializePage() {
        await loadBuyers();
        if (invoiceId) {
            try {
                const doc = await db.collection('performaInvoices').doc(invoiceId).get();
                if (doc.exists) {
                    populateForm(doc.data());
                } else {
                    console.error("No such document!");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            }
        } else {
            const invoiceNoInput = document.getElementById('performa-invoice-no');
            invoiceNoInput.value = 'Will be generated on save';
            document.getElementById('performa-invoice-date').valueAsDate = new Date();
            addRow();
        }
    }

    initializePage();

    function populateForm(data) {
        document.getElementById('seller-details').value = data.sellerDetails;
        document.getElementById('buyer-details').value = data.buyerDetails;
        document.getElementById('performa-invoice-no').value = data.performaInvoiceNo;
        document.getElementById('performa-invoice-date').value = data.performaInvoiceDate;
        // CHANGE: This now populates the correct 'port-of-discharge' field
        document.getElementById('port-of-discharge').value = data.portOfDischarge || '';
        document.getElementById('shipment-details').value = data.shipmentDetails;
        document.getElementById('payment-terms').value = data.paymentTerms;
        document.getElementById('freight').value = data.freight;
        document.getElementById('partial-shipment').value = data.partialShipment;
        document.getElementById('main-item-desc').value = data.mainItemDesc;
        document.getElementById('bank-details').value = data.bankDetails;
        document.getElementById('calculation-note').value = data.calculationNote || '';
        document.getElementById('group-items-checkbox').checked = data.groupItems || false;

        if (data.buyerName) {
            for (let i = 0; i < buyerSelect.options.length; i++) {
                if (buyerSelect.options[i].text === data.buyerName) {
                    buyerSelect.selectedIndex = i;
                    break;
                }
            }
        }

        itemsBody.innerHTML = '';
        data.items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td class="px-2 py-1"><input type="text" class="item-sno w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.sno}" readonly></td>
            <td class="px-2 py-1"><input type="text" class="item-hsn w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.hsn}"></td>
            <td class="px-2 py-1"><input type="text" class="item-dimension w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.dimension}"></td>
            <td class="px-2 py-1"><input type="number" class="item-m3 w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.m3}" step="0.001"></td>
            <td class="px-2 py-1"><input type="number" class="item-rate w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.rate}" step="0.01"></td>
            <td class="px-2 py-1"><input type="text" class="item-amount w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${item.amount.toFixed(2)}" readonly></td>
            <td class="px-2 py-1 text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
`;
            itemsBody.appendChild(row);
        });
        itemCounter = data.items.length;
        updateTotals();
    }
    
    async function autoGeneratePerformaInvoiceNumber() {
        const settingsRef = db.collection('settings').doc('performaCounter');
        try {
            const nextNumber = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(settingsRef);
                if (!doc.exists) {
                    transaction.set(settingsRef, { nextPerformaNumber: 2 });
                    return 1;
                }
                const newNextNumber = doc.data().nextPerformaNumber;
                transaction.update(settingsRef, { nextPerformaNumber: newNextNumber + 1 });
                return newNextNumber;
            });

            const year = new Date().getFullYear();
            const formattedNumber = nextNumber.toString().padStart(3, '0');
            return `OLPL/P/${formattedNumber}/${year}`;
        } catch (e) {
            console.error("Transaction failed: ", e);
            alert("Could not generate Performa Invoice number. Please try again.");
            return null;
        }
    }

    async function savePerformaInvoice() {
        const data = getFormData();
        
        if (invoiceId) {
            db.collection('performaInvoices').doc(invoiceId).update(data)
                .then(() => {
                    alert('Performa Invoice updated successfully!');
                    window.location.href = 'dashboard.html';
                })
                .catch(error => console.error("Error updating document: ", error));
        } else {
            const newInvoiceNo = await autoGeneratePerformaInvoiceNumber();
            if (!newInvoiceNo) return;
            data.performaInvoiceNo = newInvoiceNo;
            
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            db.collection('performaInvoices').add(data)
                .then(() => {
                    alert(`Performa Invoice ${newInvoiceNo} saved successfully!`);
                    window.location.href = 'dashboard.html';
                })
                .catch(error => console.error("Error adding document: ", error));
        }
    }

    function getFormData() {
        const items = [];
        let totalM3 = 0;
        itemsBody.querySelectorAll('tr').forEach(row => {
            const m3 = parseFloat(row.querySelector('.item-m3').value) || 0;
            items.push({
                sno: row.querySelector('.item-sno').value,
                hsn: row.querySelector('.item-hsn').value,
                dimension: row.querySelector('.item-dimension').value,
                m3: m3,
                rate: parseFloat(row.querySelector('.item-rate').value) || 0,
                amount: parseFloat(row.querySelector('.item-amount').value) || 0
            });
            totalM3 += m3;
        });

        const selectedBuyerName = buyerSelect.options[buyerSelect.selectedIndex].text;

        return {
            groupItems: document.getElementById('group-items-checkbox').checked,
            buyerName: (buyerSelect.value && selectedBuyerName !== '-- Select or Add New Buyer --') ? selectedBuyerName : '',
            sellerDetails: document.getElementById('seller-details').value,
            buyerDetails: document.getElementById('buyer-details').value,
            performaInvoiceNo: document.getElementById('performa-invoice-no').value,
            performaInvoiceDate: document.getElementById('performa-invoice-date').value,
            // CHANGE: Reading from the correct 'port-of-discharge' field and removed 'terms'
            portOfDischarge: document.getElementById('port-of-discharge').value,
            shipmentDetails: document.getElementById('shipment-details').value,
            paymentTerms: document.getElementById('payment-terms').value,
            freight: document.getElementById('freight').value,
            partialShipment: document.getElementById('partial-shipment').value,
            mainItemDesc: document.getElementById('main-item-desc').value,
            bankDetails: document.getElementById('bank-details').value,
            calculationNote: document.getElementById('calculation-note').value,
            totalAmount: parseFloat(document.getElementById('total-amount').textContent.replace('$', '').replace(/,/g, '')) || 0,
            totalM3: totalM3,
            items: items
        };
    }

    async function loadBuyers() {
        return db.collection('buyers').orderBy('name').get().then(querySnapshot => {
            while (buyerSelect.options.length > 1) { buyerSelect.remove(1); }
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
        const buyerId = buyerSelect.value;
        const portOfDischargeInput = document.getElementById('port-of-discharge');
        if (!buyerId) {
            document.getElementById('buyer-details').value = '';
            // CHANGE: Clear the new 'port-of-discharge' field
            portOfDischargeInput.value = '';
            return;
        }
        db.collection('buyers').doc(buyerId).get().then(doc => {
            if (doc.exists) {
                const buyer = doc.data();
                document.getElementById('buyer-details').value = buyer.address || '';
                // CHANGE: Populate the new 'port-of-discharge' field from buyer data
                portOfDischargeInput.value = buyer.portOfDischarge || '';
            }
        }).catch(error => console.error("Error fetching buyer details: ", error));
    }
    
    addBuyerBtn.addEventListener('click', () => { addBuyerModal.classList.remove('hidden'); });
    closeModalBtn.addEventListener('click', () => { addBuyerModal.classList.add('hidden'); });
    window.addEventListener('click', (event) => { if (event.target == addBuyerModal) { addBuyerModal.classList.add('hidden'); } });

    newBuyerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBuyer = {
            name: document.getElementById('new-buyer-name').value,
            address: document.getElementById('new-buyer-address').value,
            // CHANGE: Saving the correct field when adding a new buyer
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
            addBuyerModal.classList.add('hidden');
            newBuyerForm.reset();
        }).catch(error => console.error("Error adding new buyer: ", error));
    });

    addRowBtn.addEventListener('click', addRow);
    saveBtn.addEventListener('click', savePerformaInvoice);
    buyerSelect.addEventListener('change', handleBuyerSelection);

    itemsBody.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-m3') || e.target.classList.contains('item-rate')) {
            const row = e.target.closest('tr');
            const m3 = parseFloat(row.querySelector('.item-m3').value) || 0;
            const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
            row.querySelector('.item-amount').value = (m3 * rate).toFixed(2);
        }
        updateTotals();
    });

    itemsBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row-btn')) {
            e.target.closest('tr').remove();
            itemCounter = itemsBody.querySelectorAll('tr').length;
            itemsBody.querySelectorAll('.item-sno').forEach((input, index) => { input.value = index + 1; });
            updateTotals();
        }
    });

    function addRow() {
        itemCounter++;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-2 py-1"><input type="text" class="item-sno w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="${itemCounter}" readonly></td>
            <td class="px-2 py-1"><input type="text" class="item-hsn w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="44071100"></td>
            <td class="px-2 py-1"><input type="text" class="item-dimension w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" placeholder="e.g., 92 MM X 92 MM X 3.9 METER"></td>
            <td class="px-2 py-1"><input type="number" class="item-m3 w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="0" step="0.001"></td>
            <td class="px-2 py-1"><input type="number" class="item-rate w-full border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" value="0" step="0.01"></td>
            <td class="px-2 py-1"><input type="text" class="item-amount w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-sm px-2 py-2" readonly></td>
            <td class="px-2 py-1 text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
        `;
        itemsBody.appendChild(row);
    }

    function updateTotals() {
        let totalAmount = 0;
        itemsBody.querySelectorAll('tr').forEach(row => {
            totalAmount += parseFloat(row.querySelector('.item-amount').value) || 0;
        });
        document.getElementById('total-amount').textContent = `$${formatNumber(totalAmount)}`;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        generatePDF();
    });
    
   function generatePDF() {
        const doc = new jsPDF();
        const data = getFormData();
        const font = 'times';
        doc.setFont(font, 'normal');
        const margin = 13;
        const pageWidth = doc.internal.pageSize.width;
        let y = margin;

        // --- Header Section ---
        doc.setFontSize(27); // Slightly smaller to prevent huge header
        doc.setFont(font, 'bold');
        doc.text('OSWAL LUMBERS PVT. LTD.', pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(12);
        doc.setFont(font, 'normal');
        doc.text('SURVEY NO 262, N H. 8/A, MITHIROHAR, GANDHIDHAM-370201-GUJARAT-INDIA', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text('E-MAIL: info@oswallumbers.com', pageWidth / 2, y, { align: 'center' });

        y += 10;
        const piDate = new Date(data.performaInvoiceDate).toLocaleDateString('en-GB'); // DD/MM/YYYY
        doc.setFont(font, 'bold');
        doc.text(`Sales Contract No: ${data.performaInvoiceNo}`, margin, y);
        doc.setFont(font, 'normal');
        doc.text(`Date: ${piDate}`, margin, y + 5);
        y += 15;

        // --- Buyer Section ---
        doc.setFont(font, 'bold');
        doc.text('Buyer:', margin, y);
        y += 5;
        doc.setFont(font, 'normal');
        
        // Combine Name and Address
        const fullBuyerText = data.buyerName + '\n' + data.buyerDetails;
        // FIX: Ensure address wraps properly and pushes 'y' down safely
        const buyerTextDims = doc.getTextDimensions(fullBuyerText, { maxWidth: 100 });
        doc.text(fullBuyerText, margin, y, { maxWidth: 100 });
        
        // FIX: Add extra buffer (+8) to prevent overlap with "Dear Sir"
        y += buyerTextDims.h + 8; 
        
        doc.text('Dear Sir,', margin, y);
        y += 5;
        doc.text(`We are pleased to confirm having sold to you ${data.mainItemDesc}`, margin, y, { maxWidth: pageWidth - (margin * 2) });
        
        // Calculate dynamic height for main description too in case it's long
        const descDims = doc.getTextDimensions(`We are pleased to confirm having sold to you ${data.mainItemDesc}`, { maxWidth: pageWidth - (margin * 2) });
        y += descDims.h + 5; 
        
        // --- Table Section ---
        const head = [['NO.', 'HSN', 'DIMENSION', 'QUANTITY ABOUT M3', 'CNF PRICE US$/M3', 'AMOUNT US$']];
        let body;
        const totalM3 = data.items.reduce((sum, item) => sum + (parseFloat(item.m3) || 0), 0);
        const totalAmount = data.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        if (data.groupItems && data.items.length > 0) {
            body = [];
            const avgRate = totalM3 > 0 ? totalAmount / totalM3 : 0;
            const numItems = data.items.length;
            data.items.forEach((item, index) => {
                const row = [item.sno, item.hsn, item.dimension];
                if (index === 0) {
                    row.push({ content: totalM3.toFixed(3), rowSpan: numItems, styles: { valign: 'middle', halign: 'center' } });
                    row.push({ content: `$${formatNumber(avgRate)}`, rowSpan: numItems, styles: { valign: 'middle', halign: 'center' } });
                    row.push({ content: `$${formatNumber(totalAmount)}`, rowSpan: numItems, styles: { valign: 'middle', halign: 'center' } });
                }
                body.push(row);
            });
        } else {
            body = data.items.map(item => [
                item.sno,
                item.hsn,
                item.dimension,
                parseFloat(item.m3).toFixed(3),
                `$${formatNumber(item.rate)}`,
                `$${formatNumber(item.amount)}`
            ]);
        }
        
        const foot = [[
            { content: 'TOTAL:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: totalM3.toFixed(3), styles: { halign: 'center', fontStyle: 'bold' } },
            '',
            { content: `$${formatNumber(totalAmount)}`, styles: { halign: 'center', fontStyle: 'bold' } }
        ]];

        doc.autoTable({
            head: head, body: body, foot: foot, startY: y, theme: 'grid',
            headStyles: { 
                fontStyle: 'bold', 
                halign: 'center',
                fillColor: [240, 240, 240], // Light gray header
                textColor: [0, 0, 0],
                lineWidth: 0.1
            },
            footStyles: { fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255], textColor: [0,0,0] },
            // FIX: Added 'halign: center' and 'valign: middle' for all body cells
            bodyStyles: { 
                fontSize: 9, 
                halign: 'center', 
                valign: 'middle',
                textColor: [0, 0, 0] 
            },
            styles: { 
                lineColor: [0, 0, 0], 
                lineWidth: 0.1 
            },
        });
        
        // FIX: Ensure y updates from the end of table
        y = doc.autoTable.previous.finalY + 8;

        // --- Terms Section ---
        const addTerm = (label, value) => {
            if (value) {
                // Check for page break if needed (simple check)
                if (y > 270) { doc.addPage(); y = margin; }
                
                doc.setFont(font, 'bold');
                doc.text(label, margin, y, { maxWidth: 45 });
                doc.setFont(font, 'normal');
                
                // Calculate height of the value text
                const textDims = doc.getTextDimensions(value, { maxWidth: pageWidth - margin * 2 - 45 });
                doc.text(value, margin + 45, y, { maxWidth: pageWidth - margin * 2 - 45 });
                
                // Increase y by the text height + padding
                y += textDims.h + 3;
            }
        };

        addTerm('Port of Loading:', 'MUNDRA PORT, INDIA');
        addTerm('Port of Discharge:', data.portOfDischarge);
        addTerm('Terms of Shipment:', data.shipmentDetails);
        addTerm('Payment:', data.paymentTerms);
        addTerm('Freight:', data.freight);
        addTerm('Partial Shipment:', data.partialShipment);
        addTerm('Documents:', 'Invoice, Packing List, BL & COO(CEPA)');
        
        // --- Bank Details ---
        if (y > 250) { doc.addPage(); y = margin; } // Check space before bank details
        
        y += 4; 
        doc.setFont(font, 'bold');
        doc.text('Our Bank details:', margin, y);
        y += 5;
        doc.setFont(font, 'normal');
        
        const bankDetailsText = data.bankDetails;
        const bankDetailsDims = doc.getTextDimensions(bankDetailsText, { lineHeightFactor: 1.15, maxWidth: pageWidth - margin * 2 });
        doc.text(bankDetailsText, margin + 5, y, { lineHeightFactor: 1.15, maxWidth: pageWidth - margin * 2 });
        
        // FIX: Add buffer to prevent overlap with Note box
        y += bankDetailsDims.h + 5;

        // --- Calculation Note ---
        if (data.calculationNote) {
            const noteText = data.calculationNote;
            const maxBoxWidth = pageWidth - margin * 2 - 6;
            const textDims = doc.getTextDimensions(noteText, { maxWidth: maxBoxWidth });
            
            // Check for page break if note is large
            if (y + textDims.h + 20 > 280) { doc.addPage(); y = margin; }

            const paddingX = 3;
            const paddingY = 3;
            const boxWidth = maxBoxWidth + paddingX * 2; // Fixed width style
            const boxHeight = textDims.h + paddingY * 2;

            doc.setDrawColor(0);
            doc.rect(margin, y, boxWidth, boxHeight);
            doc.text(noteText, margin + paddingX, y + paddingY + 3, { maxWidth: maxBoxWidth });

            // FIX: Update y properly after box
            y += boxHeight + 10;
        } else {
             y += 5;
        }

        // --- Signatures ---
        // Ensure we don't print signatures at the very bottom edge
        if (y > 275) { doc.addPage(); y = margin + 20; }

        doc.text('Best Regards,', margin, y);
        
        // FIX: INCREASE GAP for Director/Buyer sign (Previously 14, now 35)
        y += 25; 

        const signatureY = y;

        // Director Name & Line
        const companyLineX1 = margin;
        const companyLineX2 = margin + 80;
        doc.setDrawColor(0);
        doc.line(companyLineX1, signatureY, companyLineX2, signatureY); 
        
        doc.setFont(font, 'bold');
        doc.setFontSize(9);
        doc.text('DEEPAK PAREKH', margin, signatureY + 5);
        doc.text('DIRECTOR', margin, signatureY + 10);
        
        // Buyer Name & Line
        const lineX1 = pageWidth - margin - 70;
        const lineX2 = pageWidth - margin;      
        doc.setDrawColor(0);
        doc.line(lineX1, signatureY, lineX2, signatureY); 
        doc.text('BUYER', (lineX1 + lineX2) / 2, signatureY + 5, { align: 'center' });

        doc.save(`Performa-Invoice-${data.performaInvoiceNo.replace(/\//g, '-')}.pdf`);
    }
});





