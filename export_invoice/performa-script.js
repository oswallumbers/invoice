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
        const font = 'Helvetica';
        doc.setFont(font, 'normal');
        const margin = 15;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        let y = margin;

        doc.setFontSize(30);
        doc.setFont(font, 'bold');
        doc.text('OSWAL LUMBERS PVT. LTD.', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(11);
        doc.setFont(font, 'normal');
        doc.text('SURVEY NO 262, N H. 8/A, MITHIROHAR, GANDHIDHAM-370201-GUJARAT-INDIA', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text('E-MAIL: info@oswallumbers.com', pageWidth / 2, y, { align: 'center' });

        y += 8;
        const piDate = new Date(data.performaInvoiceDate).toLocaleDateString('en-GB');
        doc.setFont(font, 'bold');
        doc.text(`Sales Contract No: ${data.performaInvoiceNo}`, margin, y);
        doc.setFont(font, 'normal');
        doc.text(`Date: ${piDate}`, margin, y + 5);
        y += 15;

        doc.setFont(font, 'bold');
        doc.text('Buyer:', margin, y);
        y += 5;
        doc.setFont(font, 'normal');
        const fullBuyerText = data.buyerName + '\n' + data.buyerDetails;
        const buyerTextDims = doc.getTextDimensions(fullBuyerText, { maxWidth: 100 });
        doc.text(fullBuyerText, margin, y, { maxWidth: 100 });
        y += buyerTextDims.h + 5;
        
        doc.text('Dear Sir,', margin, y);
        y += 4;
        doc.text(`We are pleased to confirm having sold to you ${data.mainItemDesc}`, margin, y, { maxWidth: pageWidth - (margin * 2) });
        y += 8;
        
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
            headStyles: { fontStyle: 'bold', halign: 'center' },
            footStyles: { fontStyle: 'bold' },
            styles: { fontSize: 9 },
        });
        y = doc.autoTable.previous.finalY + 5;

        const addTerm = (label, value) => {
            if (value) {
                doc.setFont(font, 'bold');
                doc.text(label, margin, y, { maxWidth: 40 });
                doc.setFont(font, 'normal');
                const textHeight = doc.getTextDimensions(value, { maxWidth: pageWidth - margin * 2 - 45 }).h;
                doc.text(value, margin + 45, y, { maxWidth: pageWidth - margin * 2 - 45 });
                y += textHeight + 3;
            }
        };

        // CHANGE: The order of printing is confirmed here.
        addTerm('Port of Loading:', 'MUNDRA PORT, INDIA');
        addTerm('Port of Discharge:', data.portOfDischarge);
        addTerm('Terms of Shipment:', data.shipmentDetails);
        addTerm('Payment:', data.paymentTerms);
        addTerm('Freight:', data.freight);
        addTerm('Partial Shipment:', data.partialShipment);
        addTerm('Documents:', 'Invoice, Packing List, BL & COO(CEPA)');
        
        // --- Code Start ---
// --- Code Start ---

        // 1. Bank Details (गैप और कम किया ताकि जगह बचे)
        y += 2; 
        doc.setFont(font, 'bold');
        doc.text('Our Bank details:', margin, y);
        y += 4;
        doc.setFont(font, 'normal');
        
        const bankDetailsText = data.bankDetails;
        // लाइन हाइट फैक्टर थोड़ा कम किया (1.15)
        const bankDetailsDims = doc.getTextDimensions(bankDetailsText, { lineHeightFactor: 1.15, maxWidth: pageWidth - margin * 2 });
        doc.text(bankDetailsText, margin + 5, y, { lineHeightFactor: 1.15, maxWidth: pageWidth - margin * 2 });
        y += bankDetailsDims.h;

       if (data.calculationNote) {
            const noteText = data.calculationNote;
            const boxWidth = pageWidth - (margin * 2);
            const textWidth = boxWidth - 6; 
            
            // पहले हाइट कैलकुलेट करें
            doc.setFont(font, 'normal');
            const textDims = doc.getTextDimensions(noteText, { maxWidth: textWidth });
            
            // बॉक्स की अनुमानित हाइट (थोड़ी कम की है)
            const estimatedBoxHeight = textDims.h + 10; 

            // चेक करें: क्या जगह बची है? (Page Break Logic)
            if (y + estimatedBoxHeight > pageHeight - margin) {
                doc.addPage();
                y = 40; // हेडर से बचने के लिए नीचे से शुरू करें
            } else {
                y += 2; // अगर उसी पेज पर है तो थोड़ा गैप
            }

            const startX = margin;
            const startY = y;
            
            // हेडिंग
            y += 3; 
            doc.setFont(font, 'bold');
            doc.text("Calculation Note:", startX + 3, y);
            
            // टेक्स्ट
            y += 3; 
            doc.setFont(font, 'normal');
            doc.text(noteText, startX + 3, y, { maxWidth: textWidth });
            
            // *** BOX HEIGHT FIX ***
            // पहले (textDims.h) पूरा जुड़ रहा था जिससे नीचे जगह छूट रही थी।
            // अब इसमें से '-2' करके बॉक्स को टाइट कर दिया है।
            const boxHeight = (y - startY) + textDims.h - 2; 
            
            doc.rect(startX, startY, boxWidth, boxHeight);
            
            // *** GAP REDUCED ***
            // बॉक्स के बाद "Best Regards" के लिए गैप (पहले +3 या +5 था, अब +2 है)
            y = startY + boxHeight + 2; 
        }
        
        // 3. Signature Block
        const signatureHeightNeeded = 30; 
        
        // चेक करें: क्या सिग्नेचर के लिए जगह है?
        if (y + signatureHeightNeeded > pageHeight - margin) {
             doc.addPage();
             y = 40; 
        } 
        
        // Best Regards
        // ध्यान दें: y अब बॉक्स के बहुत पास है
        doc.text('Best Regards,', margin, y + 3); // y+3 ताकि बॉर्डर से न चिपके (Text Baseline Adjustment)
        
        y += 8; // Best Regards और Name के बीच गैप (Compact)

        const signatureY = y; 

        // Director Name & Line
        const companyLineX1 = margin;
        const companyLineX2 = margin + 80;
        doc.setDrawColor(0);
        doc.line(companyLineX1, signatureY, companyLineX2, signatureY); 
        
        doc.setFont(font, 'bold');
        doc.setFontSize(9);
        doc.text('DEEPAK PAREKH', margin, signatureY + 4);
        doc.text('DIRECTOR', margin, signatureY + 8);
        
        // Buyer Name & Line
        const lineX1 = pageWidth - margin - 70;
        const lineX2 = pageWidth - margin;      
        doc.setDrawColor(0);
        doc.line(lineX1, signatureY, lineX2, signatureY); 
        doc.setFont(font, 'bold');
        doc.setFontSize(9);
        doc.text('BUYER', (lineX1 + lineX2) / 2, signatureY + 4, { align: 'center' });

        doc.save(`Performa-Invoice-${data.performaInvoiceNo.replace(/\//g, '-')}.pdf`);
    }
});






