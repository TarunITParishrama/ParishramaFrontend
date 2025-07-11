import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/mainlogo.png";
import { format } from 'date-fns';

const ReportCard = {
  generatePDF: (studentData) => {
    const doc = new jsPDF({
      orientation: 'landscape' // Use landscape for better table fit
    });

    // Header with logo
    doc.addImage(logo, "PNG", 10, 10, 30, 20);
    
    // Academy info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Parishrama NEET Academy", 50, 15);
    doc.setFont("helvetica", "normal");
    doc.text("Omkar Hills, Dr. Vishnuvardan Road, Uttarahalli Main Road, Bengaluru - 560060", 50, 22);
    doc.text("Phone: 080-45912222, Email: officeparishrama@gmail.com", 50, 29);
    
    // Divider line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, 35, doc.internal.pageSize.width - 10, 35);

    // Report title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Student Performance Report", doc.internal.pageSize.width / 2, 45, { align: 'center' });

    // Student information
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${studentData.studentName}`, 15, 55);
    doc.text(`Roll No: ${studentData.rollNo}`, 15, 65);
    doc.text(`Class/Section: ${studentData.classSection}`, 15, 75);
    
    // Date range if filtered
    if (studentData.fromDate || studentData.toDate) {
      const fromDate = studentData.fromDate ? format(new Date(studentData.fromDate), 'dd/MM/yyyy') : 'All';
      const toDate = studentData.toDate ? format(new Date(studentData.toDate), 'dd/MM/yyyy') : 'Present';
      doc.text(`Date Range: ${fromDate} to ${toDate}`, 15, 85);
    }

    // Calculate starting Y position for table
    let startY = studentData.fromDate || studentData.toDate ? 95 : 85;

    // Prepare table data
    const tableData = studentData.reports.map(report => [
      report.testName,
      report.date,
      report.wrongAnswers,
      report.unattempted,
      report.correctAnswers,
      report.totalMarks,
      report.accuracy + '%',
      report.percentile + '%'
    ]);

    // Generate table with auto column widths
    autoTable(doc, {
      startY,
      head: [
        [
          'Test Name',
          'Date',
          'Wrong',
          'Unattempted',
          'Correct',
          'Total Marks',
          'Accuracy',
          'Percentile'
        ]
      ],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center'
      },
      headStyles: {
        fillColor: [234, 88, 12], // Orange header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: '20', halign: 'left', fillColor: [255, 247, 237]}, // Test Name
        1: { cellWidth: '40' }, // Date
        2: { cellWidth: '30', fillColor: [255, 0, 0] }, // Wrong
        3: { cellWidth: '30', fillColor: [254, 196, 54] }, // Unattempted
        4: { cellWidth: '30', fillColor: [144, 238, 144] }, // Correct
        5: { cellWidth: '30' }, // Total Marks
        6: { cellWidth: '30' }, // Accuracy
        7: { cellWidth: '30' }  // Percentile
      },
      margin: { horizontal: 10 }, // Add some margin on sides
      tableWidth: '100' // Auto-adjust table width
    });

    // Summary information below table
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Tests Attended: ${studentData.totalTestsAttended}`, 15, finalY);
    doc.text(`Total Marks: ${studentData.totalMarks}`, 15, finalY + 10);
    doc.text(`Average Marks: ${studentData.averageMarks.toFixed(2)}`, 15, finalY + 20);

    // Footer - fixed at bottom
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, footerY);
    doc.text("Parishrama NEET Academy - Confidential", 
      doc.internal.pageSize.width - 14, 
      footerY, 
      { align: 'right' }
    );

    // Save the PDF
    doc.save(`${studentData.studentName}_Performance_Report.pdf`);
  }
};

export default ReportCard;