document.addEventListener('DOMContentLoaded', function () {
    const annexureBtn = document.getElementById('annexure-btn');
    if (annexureBtn) {
        annexureBtn.addEventListener('click', generateAnnexure);
    }
});

function generateAnnexure() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Annexure', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Office Of The Superintendent Of Central GST', 105, 30, { align: 'center' });
    doc.text('Division II Rajkot Commissionerate - Rajkot', 105, 35, { align: 'center' });
    doc.text('Examination Report For Factory Sealed Packages / Containers', 105, 40, { align: 'center' });

    // --- Add a simple table with required details ---
    const grossWeight = document.getElementById('gross-weight').value;
    const netWeight = document.getElementById('net-weight').value;
    const totalQty = document.getElementById('total-qty').textContent + " " + document.querySelector('.item-uom').value;
    const totalItems = document.getElementById('total-items').value;


    const head = [['Sr.No', 'Container No.', 'Size', 'Line Seal No.', 'E Seal No.', 'Factory', 'Qty', 'Boxes', 'Weight']];
    const body = [
        [
            '1',
            document.getElementById('container-no').value,
            document.getElementById('container-size').value.replace('1 X ', '').replace(' CONTAINER', ''), // Extracts '40\''
            '', // Line Seal No - Add a field for this in your HTML if needed
            '', // E Seal No - Add a field for this in your HTML if needed
            'OSWAL LUMBERS PVT LTD',
            totalQty,
            totalItems,
            `Nett: ${netWeight}\nGross: ${grossWeight}`
        ]
    ];

    doc.autoTable({
        head: head,
        body: body,
        startY: 60,
        theme: 'grid',
        headStyles: { fontStyle: 'bold', halign: 'center' },
        styles: { cellPadding: 2, fontSize: 9 }
    });

    doc.save('Annexure.pdf');
}
