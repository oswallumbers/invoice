document.addEventListener('DOMContentLoaded', function () {
    const packingListBtn = document.getElementById('packing-list-btn');
    if (packingListBtn) {
        packingListBtn.addEventListener('click', generatePackingList);
    }
});

function generatePackingList() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const font = 'Helvetica';
    doc.setFont(font, 'normal');
    const margin = 10;
    const pageWidth = doc.internal.pageSize.width;
    const middleX = pageWidth / 2;
    let y = margin + 5;

    // --- Header Text ---
    doc.setFontSize(30);
    doc.setFont(font, 'bold');
    doc.text('OSWAL LUMBERS PVT. LTD.', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(10);
    doc.setFont(font, 'normal');
    doc.text('SURVEY NO 262, N H. 8/A, MITHIROHAR, GANDHIDHAM-370201-GUJARAT-INDIA', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('E-MAIL: info@oswallumbers.com', pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(16);
    doc.setFont(font, 'bold');
    doc.text('PACKING LIST', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    const borderStartY = y;

    // --- Party and Document Details ---
    const sellerText = document.getElementById('seller-details').value;
    
    const buyerSelect = document.getElementById('buyer-select');
    const selectedBuyerName = buyerSelect.options[buyerSelect.selectedIndex].text;
    const buyerAddress = document.getElementById('buyer-details').value;
    let fullBuyerText = '';
    if (buyerSelect.value && selectedBuyerName !== '-- Select or Add New Buyer --') {
        fullBuyerText = selectedBuyerName + '\n' + buyerAddress;
    } else {
        fullBuyerText = buyerAddress;
    }
    
    const invoiceNo = document.getElementById('invoice-no').value;
    const invoiceDate = new Date(document.getElementById('invoice-date').value).toLocaleDateString('en-GB');

    // --- Left Side ---
    doc.setFontSize(9);
    doc.setFont(font, 'bold');
    doc.text('SELLER / SHIPPER:', margin + 2, y + 5);
    doc.setFont(font, 'normal');
    doc.text(sellerText, margin + 2, y + 9, { lineHeightFactor: 1.3, maxWidth: middleX - margin - 4 });
    
    const dividerY = y + 53;
    doc.line(margin, dividerY, middleX, dividerY);

    doc.setFont(font, 'bold');
    doc.text('BUYER / CONSIGNEE:', margin + 2, y + 58);
    doc.setFont(font, 'normal');
    doc.text(fullBuyerText, margin + 2, y + 62, { lineHeightFactor: 1.3, maxWidth: middleX - margin - 4 });

    // --- Right Side (CORRECTED) ---
    let rightSideY = y + 5;
    doc.setFont(font, 'bold');
    doc.text(`INVOICE NO: ${invoiceNo}`, middleX + 2, rightSideY);
    doc.text(`DATE: ${invoiceDate}`, pageWidth - margin - 2, rightSideY, { align: 'right' });
    
    rightSideY += 10;
    doc.setFont(font, 'normal');
    doc.text(`TERMS OF SHIPMENT: ${document.getElementById('terms').value}`, middleX + 2, rightSideY, { maxWidth: middleX - margin - 4 });

    rightSideY += 10;
    doc.text(`PORT OF LOADING: ${document.getElementById('port-loading').value}`, middleX + 2, rightSideY, { maxWidth: middleX - margin - 4 });
    
    rightSideY += 10;
    doc.text(`PORT OF DISCHARGE: ${document.getElementById('port-discharge').value}`, middleX + 2, rightSideY, { maxWidth: middleX - margin - 4 });

    rightSideY += 10;
    doc.text(`COUNTRY OF ORIGIN: ${document.getElementById('country-origin').value}`, middleX + 2, rightSideY, { maxWidth: middleX - margin - 4 });

    const tableStartY = y + 100;
    doc.line(middleX, borderStartY, middleX, tableStartY); // Vertical divider line

    // --- Items Table ---
    const head = [['S. NO.', 'DESCRIPTION OF ITEM', 'HSN CODE', 'QTY', 'UOM', 'M3']];
    const body = [];
    const itemsBody = document.getElementById('items-body');

    itemsBody.querySelectorAll('tr').forEach(row => {
        body.push([
            row.querySelector('.item-sno').value,
            row.querySelector('.item-desc').value,
            row.querySelector('.item-hsn').value,
            row.querySelector('.item-qty').value,
            row.querySelector('.item-uom').value,
            parseFloat(row.querySelector('.item-m3').value).toFixed(3),
        ]);
    });
    
    const totalQty = document.getElementById('total-qty').textContent;
    const totalM3 = document.getElementById('total-m3').textContent;

    body.push([
        { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: totalQty, styles: { fontStyle: 'bold', halign: 'center' } }, '',
        { content: totalM3, styles: { fontStyle: 'bold', halign: 'right' } }
    ]);

    doc.autoTable({
        head: head, 
        body: body, 
        startY: tableStartY, 
        theme: 'grid',
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            lineWidth: 0.1, 
            lineColor: [0, 0, 0], 
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: { 
            font: font, 
            fontSize: 9, 
            lineColor: [0, 0, 0], 
            lineWidth: 0.1 
        },
        columnStyles: {
            0: { halign: 'center' },
            1: { cellWidth: 80 },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'right' }
        }
    });

    let finalY = doc.autoTable.previous.finalY + 10;

    // --- Footer Details ---
    doc.setFontSize(9);
    doc.setFont(font, 'normal');
    doc.text(`CONTAINER NO. ${document.getElementById('container-no').value}`, margin + 2, finalY);
    finalY += 5;
    doc.text(document.getElementById('container-size').value, margin + 2, finalY);
    finalY += 5;
    doc.text(`TOTAL ITEMS: ${document.getElementById('total-items').value}`, margin + 2, finalY);
    finalY += 8;
    doc.text(`TOTAL GROSS WEIGHT: ${document.getElementById('gross-weight').value}`, margin + 2, finalY);
    finalY += 5;
    doc.text(`TOTAL NET WEIGHT: ${document.getElementById('net-weight').value}`, margin + 2, finalY);
    
    const signatureY = finalY + 40;
    doc.setFont(font, 'bold');
    doc.text('For, OSWAL LUMBERS PVT. LTD.', pageWidth - margin - 10, signatureY, { align: 'right' });
    doc.text('AUTHORISED SIGNATORY', pageWidth - margin - 10, signatureY + 25, { align: 'right' });
    
    const borderEndY = signatureY + 35;
    
    // --- Outer Border (Explicitly Black) ---
    doc.setDrawColor(0, 0, 0); 
    doc.setLineWidth(0.7);
    doc.line(margin, borderStartY, pageWidth - margin, borderStartY); // Top
    doc.line(margin, borderEndY, pageWidth - margin, borderEndY); // Bottom
    doc.line(margin, borderStartY, margin, borderEndY); // Left
    doc.line(pageWidth - margin, borderStartY, pageWidth - margin, borderEndY); // Right

    doc.save('PackingList.pdf');
}
