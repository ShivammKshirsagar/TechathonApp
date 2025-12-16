import { SanctionLetter } from '../loan-flow/types';

/**
 * Generate PDF from sanction letter using jsPDF and html2canvas
 * This will be dynamically imported to reduce bundle size
 */
export const generatePDF = async (sanctionLetter: SanctionLetter): Promise<void> => {
  try {
    // Dynamically import libraries
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(mod => mod.default),
      import('html2canvas').then(mod => mod.default)
    ]);

    // Get the sanction letter element
    const element = document.getElementById('sanction-letter');
    if (!element) {
      throw new Error('Sanction letter element not found');
    }

    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    
    // Handle multi-page if content is too long
    const pageHeight = 297; // A4 height in mm
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Generate filename
    const filename = `Sanction_Letter_${sanctionLetter.referenceNumber}.pdf`;

    // Download PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Alternative: Generate simple text-based PDF without html2canvas
 * Lighter but less styled
 */
export const generateSimplePDF = async (sanctionLetter: SanctionLetter): Promise<void> => {
  try {
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF();
    
    const { referenceNumber, applicantName, loanDetails } = sanctionLetter;
    
    // Add header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('XYZ FINANCE', 105, 20, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.text('SANCTION LETTER', 105, 30, { align: 'center' });
    
    // Add reference
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Reference No: ${referenceNumber}`, 20, 45);
    
    // Add applicant name
    pdf.setFontSize(12);
    pdf.text(`Dear ${applicantName},`, 20, 60);
    
    // Add loan details
    pdf.setFontSize(10);
    let yPos = 75;
    
    pdf.text('Your loan has been sanctioned with the following details:', 20, yPos);
    yPos += 10;
    
    pdf.text(`Loan Amount: ₹${loanDetails.amount.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 7;
    pdf.text(`Interest Rate: ${loanDetails.interestRate}% p.a.`, 20, yPos);
    yPos += 7;
    pdf.text(`Tenure: ${loanDetails.tenure} months`, 20, yPos);
    yPos += 7;
    pdf.text(`Monthly EMI: ₹${loanDetails.emi.toLocaleString('en-IN')}`, 20, yPos);
    yPos += 7;
    pdf.text(`Processing Fee: ₹${loanDetails.processingFee.toLocaleString('en-IN')}`, 20, yPos);
    
    // Download
    pdf.save(`Sanction_Letter_${referenceNumber}.pdf`);
  } catch (error) {
    console.error('Error generating simple PDF:', error);
    throw error;
  }
};