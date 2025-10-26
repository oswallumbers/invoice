document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('annexure-modal');
    const openModalBtn = document.getElementById('open-annexure-modal-btn');
    const closeModalSpan = document.getElementById('close-annexure-modal');
    const addRowBtn = document.getElementById('add-annexure-row-btn');
    const tableBody = document.getElementById('annexure-items-body');
    const generateBtn = document.getElementById('generate-print-annexure-btn');

    let srNoCounter = 0;

    // --- Modal Controls ---
    openModalBtn.onclick = function() {
        if (tableBody.rows.length === 0) {
            addAnnexureRow();
        }
        modal.classList.remove('hidden');
    }
    closeModalSpan.onclick = function() {
        modal.classList.add('hidden');
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.classList.add('hidden');
        }
    }

    // --- Table Row Management ---
    addRowBtn.addEventListener('click', addAnnexureRow);

    function addAnnexureRow() {
        srNoCounter++;
        const newRow = tableBody.insertRow();
        const prefilledContainerNo = document.getElementById('container-no').value || '';
        const prefilledQty = document.getElementById('total-items').value || '';
        const prefilledNett = document.getElementById('net-weight').value || '';
        const prefilledGross = document.getElementById('gross-weight').value || '';

        newRow.innerHTML = `
            <td><span class="sr-no">${srNoCounter}</span></td>
            <td><input type="text" class="container-no form-input w-full text-sm" value="${prefilledContainerNo}"></td>
            <td><input type="text" class="size form-input w-full text-sm" value="40'"></td>
            <td><input type="text" class="line-seal-no form-input w-full text-sm" value=""></td>
            <td><input type="text" class="e-seal-no form-input w-full text-sm" value=""></td>
            <td><input type="text" class="factory-name form-input w-full text-sm" value="${document.getElementById('seller-details').value.split('\n')[0] || ''}"></td>
            <td><input type="text" class="qty-pcs form-input w-full text-sm" value="${prefilledQty}"></td>
            <td><input type="text" class="weight-nett form-input w-full text-sm" value="${prefilledNett}"></td>
            <td><input type="text" class="weight-gross form-input w-full text-sm" value="${prefilledGross}"></td>
            <td><button type="button" class="delete-row-btn text-red-500 hover:text-red-700">&times;</button></td>
        `;
    }

    tableBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row-btn')) {
            e.target.closest('tr').remove();
            const allSrNo = tableBody.querySelectorAll('.sr-no');
            allSrNo.forEach((span, index) => {
                span.textContent = index + 1;
            });
            srNoCounter = allSrNo.length;
        }
    });
    
    // --- Generation Logic ---
    generateBtn.addEventListener('click', generateAndPrintAnnexure);

    function generateAndPrintAnnexure() {
        try {
            const templateNode = document.getElementById('annexure-html-template');
            
            // --- THIS IS THE CORRECTED PART ---
            // We get the content of the template, find the main printable div inside it,
            // and then get its full HTML. This is more reliable than .innerHTML.
            const printElement = templateNode.content.querySelector('.print-template');
            if (!printElement) {
                alert('Error: Could not find the printable template content.');
                return;
            }
            let template = printElement.outerHTML;
            // --- END OF CORRECTION ---

            const sellerDetails = document.getElementById('seller-details').value.split('\n');
            const sellerName = sellerDetails[0] || '';
            const sellerAddress = sellerDetails.slice(1, 4).join(' ');
            const sellerGstin = (sellerDetails.find(line => line.startsWith('GSTIN:')) || '').replace('GSTIN:', '').trim();

            const invoiceData = {
                exporter_name: sellerName,
                iec_no: document.getElementById('iec-no').value,
                manufacturer_name: sellerName,
                manufacturer_address: sellerAddress,
                manufacturer_gst: sellerGstin,
                date: new Date(document.getElementById('invoice-date').value).toLocaleDateString('en-GB'),
                invoice_no: document.getElementById('invoice-no').value,
                total_items: document.getElementById('total-items').value,
                division: document.getElementById('annexure-division').value,
                commissionerate: document.getElementById('annexure-commissionerate').value,
                permission_no: document.getElementById('annexure-permission-no').value || '&nbsp;',
                bond_no: document.getElementById('annexure-bond-no').value || '&nbsp;'
            };

            for (const key in invoiceData) {
                template = template.replace(new RegExp(`{{${key}}}`, 'g'), invoiceData[key]);
            }

            let containersHtml = '';
            const containerRows = tableBody.querySelectorAll('tr');
            containerRows.forEach(row => {
                containersHtml += `
                    <tr>
                        <td style="padding: 4px;">${row.querySelector('.sr-no').textContent}</td>
                        <td style="padding: 4px;">${row.querySelector('.container-no').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.size').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.line-seal-no').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.e-seal-no').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.factory-name').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.qty-pcs').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.weight-nett').value}</td>
                        <td style="padding: 4px;">${row.querySelector('.weight-gross').value}</td>
                    </tr>
                `;
            });

            template = template.replace('<tbody></tbody>', `<tbody>${containersHtml}</tbody>`);
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Print Annexure</title></head><body>');
            printWindow.document.write(template);
            printWindow.document.write('</body></html>');
            
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);

        } catch (error) {
            console.error("Error generating annexure:", error);
            alert('Could not generate annexure. See console for details.');
        }
    }
});
