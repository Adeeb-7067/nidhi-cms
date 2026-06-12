import { createExportPdf, reserveFooterY, runAutoTableExport } from '@/lib/pdf-export';
import { generateBugPDF } from '@/lib/bug-report';
import type { Bug } from '@/api/generated/api.schemas';

export class PDFService {
  static generateBugReportPDF(projectName: string, _clientName: string, bugs: Bug[]) {
    generateBugPDF(bugs, projectName);
  }

  /**
   * Generates developer's chronological workloads and monthly output metrics.
   */
  static generateDeveloperLogsPDF(devName: string, monthName: string, logs: any[]) {
    const columnCount = 5;
    const doc = createExportPdf(columnCount);

    // Header Banner
    doc.setFillColor(17, 24, 39); // Darker Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFillColor(16, 185, 129); // Emerald Active Ribbon
    doc.rect(0, 40, 210, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CMS WORKSPACE', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(209, 213, 219);
    doc.text('Official Developer Productivity & Timesheet Chronology', 15, 24);

    doc.setFontSize(8);
    doc.text(`Printed On: ${new Date().toLocaleString()}`, 15, 32);

    // Body Titles
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DEVELOPER TIMESHEET DOSSIER', 15, 55);

    // Summary Card
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(15, 60, 180, 25, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Assigned Resource:', 20, 70);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(devName, 55, 70);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Reporting Interval:', 20, 78);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(monthName || 'Total Cumulative History', 55, 78);

    const totalHours = logs.reduce((sum, log) => sum + (parseFloat(log.hoursSpent) || 0), 0);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Total Hours Logged:', 125, 74);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text(`${totalHours.toFixed(1)} hrs`, 162, 75);

    const rows = logs.map((log) => [
      new Date(log.logDate).toLocaleDateString(),
      log.projectName || 'N/A',
      log.taskTitle || 'Generic Development',
      `${log.hoursSpent} hrs`,
      `${log.completionPct || 0}%`,
    ]);

    runAutoTableExport(doc, {
      columnCount,
      startY: 95,
      head: [['Date Logged', 'Project', 'Task Description', 'Duration', 'Complete %']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81],
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 38 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
      },
    });

    const finalY = reserveFooterY(doc, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('I hereby declare these hours represent genuine project efforts.', 15, finalY);
    
    doc.setFontSize(9);
    doc.text('_______________________________', 15, finalY + 12);
    doc.text('Developer Electronic Attestation', 15, finalY + 17);

    doc.text('_______________________________', 130, finalY + 12);
    doc.text('Authorized Supervisor Signature', 130, finalY + 17);

    doc.save(`Timesheet-${devName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
  }
}
