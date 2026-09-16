import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ForecastUnitType } from "@/actions/forecast";

interface GeneratePdfOptions {
  unit: ForecastUnitType;
  month: number;
  year: number;
  items: any[];
  stats: {
    confirmTotal: number;
    tentativeTotal: number;
    cancelTotal: number;
    grandTotal: number;
    totalPax: number;
    totalRoomCount: number;
    totalEntries: number;
  };
  targetAmount?: number;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const formatCurrency = (val: number | null | undefined) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDateStr = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Failed to load logo image for PDF:", err);
    return null;
  }
};

export async function generateForecastPdfReport(options: GeneratePdfOptions) {
  const { unit, month, year, items, stats, targetAmount = 0 } = options;

  // 1. Initialize PDF document in A4 Landscape
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;

  // 2. Load Logo Image
  const logoBase64 = await getBase64ImageFromUrl("/logotlm.png");

  // Colors
  const primaryColor = "#0f4d39"; // Deep Forest Green
  const secondaryColor = "#1e293b"; // Dark Slate

  let startY = margin;

  // --- HEADER SECTION ---
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, startY, 35, 22);
    } catch (e) {
      console.warn("Error rendering image on PDF:", e);
    }
  }

  // Document Titles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(primaryColor);
  doc.text("EXECUTIVE SUMMARY LAPORAN FORECAST RESERVASI", margin + 40, startY + 6);

  doc.setFontSize(11);
  doc.setTextColor(secondaryColor);
  const unitText =
    unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "Kawasan Wisata The Lodge Park";
  doc.text(`Unit Operational: ${unitText}`, margin + 40, startY + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#64748b");
  const monthName = MONTH_NAMES[month - 1] || "";
  const nowStr = new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });
  doc.text(`Periode: ${monthName} ${year}   |   Dicetak pada: ${nowStr}`, margin + 40, startY + 17);

  // Top Right Tag
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor("#0f4d39");
  doc.setFillColor("#e6f4ea");
  doc.roundedRect(pageWidth - margin - 45, startY + 2, 45, 12, 2, 2, "F");
  doc.text("CONFIDENTIAL", pageWidth - margin - 37, startY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#0f4d39");
  doc.text("Direksi & Management Use", pageWidth - margin - 42, startY + 11);

  startY += 24;

  // Header Decorative Line
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.8);
  doc.line(margin, startY, pageWidth - margin, startY);

  startY += 6;

  // --- EXECUTIVE KPI CARDS SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text("RINGKASAN EKSEKUTIF & PENCAPAIAN REVENUE", margin, startY);

  startY += 4;

  const cardWidth = (pageWidth - margin * 2 - 12) / 4; // 4 cards
  const cardHeight = 16;

  // Calculated KPI Values
  const confirmPct = stats.grandTotal > 0 ? ((stats.confirmTotal / stats.grandTotal) * 100).toFixed(1) : "0";
  const tentativePct = stats.grandTotal > 0 ? ((stats.tentativeTotal / stats.grandTotal) * 100).toFixed(1) : "0";
  
  // Closing Rate: Confirm / (Confirm + Tentative)
  const totalActive = stats.confirmTotal + stats.tentativeTotal;
  const closingRate = totalActive > 0 ? ((stats.confirmTotal / totalActive) * 100).toFixed(1) : "0";

  // Target Achievement
  const targetPct = targetAmount > 0 ? ((stats.confirmTotal / targetAmount) * 100).toFixed(1) : "N/A";

  const cardsData = [
    {
      title: "TOTAL ESTIMASI REVENUE",
      value: formatCurrency(stats.grandTotal),
      sub: `${stats.totalEntries} Booking  |  ${stats.totalPax} Pax`,
      bgColor: "#f1f5f9",
      borderColor: "#cbd5e1",
      textColor: "#0f172a",
    },
    {
      title: "CONFIRM (REALISASI)",
      value: formatCurrency(stats.confirmTotal),
      sub: `${confirmPct}% dari Total Revenue`,
      bgColor: "#ecfdf5",
      borderColor: "#a7f3d0",
      textColor: "#047857",
    },
    {
      title: "TENTATIVE (PROSPEK)",
      value: formatCurrency(stats.tentativeTotal),
      sub: `${tentativePct}%  |  Closing Rate: ${closingRate}%`,
      bgColor: "#fffbeb",
      borderColor: "#fde68a",
      textColor: "#b45309",
    },
    {
      title: "TARGET REVENUE",
      value: targetAmount > 0 ? formatCurrency(targetAmount) : "Belum Set Target",
      sub: targetAmount > 0 ? `Pencapaian: ${targetPct}%` : "Target Bulanan",
      bgColor: "#eff6ff",
      borderColor: "#bfdbfe",
      textColor: "#1d4ed8",
    },
  ];

  cardsData.forEach((card, index) => {
    const x = margin + index * (cardWidth + 4);

    doc.setFillColor(card.bgColor);
    doc.setDrawColor(card.borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor("#64748b");
    doc.text(card.title, x + 3, startY + 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(card.textColor);
    doc.text(card.value, x + 3, startY + 9.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor("#475569");
    doc.text(card.sub, x + 3, startY + 14);
  });

  startY += cardHeight + 8;

  // --- TABLE BREAKDOWN SECTION ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text(`RINCIAN DATA FORECAST (${items.length} RESERVASI)`, margin, startY);

  startY += 3;

  // Define Table Columns
  const tableHeaders =
    unit === "CAMP_VILLAGE"
      ? [
          "No",
          "Company / Instansi",
          "Res. Date",
          "Check In",
          "Check Out",
          "Event Type",
          "Pax",
          "Room",
          "Total Revenue (Rp)",
          "Status",
          "Status DP",
          "Nominal DP",
          "Jatuh Tempo",
          "PIC",
        ]
      : [
          "No",
          "Company / Instansi",
          "Res. Date",
          "Event Date",
          "Event Type",
          "Venue",
          "Pax",
          "Rate (Rp)",
          "Total Revenue (Rp)",
          "Status",
          "Status DP",
          "Nominal DP",
          "Jatuh Tempo",
          "PIC",
        ];

  const tableRows = items.map((item, index) => {
    const dpStatusText =
      item.dpStatus === "LUNAS"
        ? "Lunas"
        : item.dpStatus === "DP_30"
        ? "DP 30%"
        : item.dpStatus === "DP_50"
        ? "DP 50%"
        : item.dpStatus === "DP_CUSTOM"
        ? "Sudah DP"
        : "Belum DP";

    if (unit === "CAMP_VILLAGE") {
      return [
        index + 1,
        item.company || "-",
        formatDateStr(item.reservationDate),
        formatDateStr(item.checkIn),
        formatDateStr(item.checkOut),
        item.eventType || "-",
        item.pax || 0,
        item.room || "-",
        formatCurrency(item.total),
        item.status || "TENTATIVE",
        dpStatusText,
        item.dpAmount > 0 ? formatCurrency(item.dpAmount) : "-",
        formatDateStr(item.dueDate),
        item.pic || "-",
      ];
    } else {
      return [
        index + 1,
        item.company || "-",
        formatDateStr(item.reservationDate),
        formatDateStr(item.eventDate),
        item.eventType || "-",
        item.venue || "-",
        item.pax || 0,
        formatCurrency(item.rate),
        formatCurrency(item.total),
        item.status || "TENTATIVE",
        dpStatusText,
        item.dpAmount > 0 ? formatCurrency(item.dpAmount) : "-",
        formatDateStr(item.dueDate),
        item.pic || "-",
      ];
    }
  });

  autoTable(doc, {
    startY: startY,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: margin, right: margin, bottom: 28 },
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 77, 57], // Deep Forest Green #0f4d39
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 }, // No
      1: { cellWidth: "auto" }, // Company
      6: { halign: "center", cellWidth: 12 }, // Pax
      8: { halign: "right", fontStyle: "bold", cellWidth: 26 }, // Total Revenue
      9: { halign: "center", fontStyle: "bold", cellWidth: 18 }, // Status
      10: { halign: "center", cellWidth: 16 }, // Status DP
      11: { halign: "right", cellWidth: 22 }, // Nominal DP
      12: { halign: "center", cellWidth: 20 }, // Due Date
    },
    didParseCell: (data) => {
      // Style Status Cell
      if (data.section === "body" && data.column.index === 9) {
        const val = String(data.cell.raw);
        if (val === "CONFIRM") {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val === "TENTATIVE") {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
          data.cell.styles.fillColor = [254, 243, 199];
        } else if (val === "CANCEL") {
          data.cell.styles.textColor = [190, 18, 60]; // Rose
          data.cell.styles.fillColor = [255, 228, 230];
        }
      }
    },
  });

  // --- SIGNATURE BLOCK & FOOTER ---
  const finalY = (doc as any).lastAutoTable.finalY || startY + 40;
  let signY = finalY + 10;

  // Check if signatures fit on current page
  if (signY + 35 > pageHeight) {
    doc.addPage();
    signY = margin + 10;
  }

  // Draw Signatures Block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text(
    "* Dokumen Laporan ini merupakan Executive Summary resmi The Lodge Group untuk kebutuhan Rapat Direksi & Manajerial.",
    margin,
    signY
  );

  signY += 6;

  const signWidth = 65;
  const col1X = margin + 10;
  const col2X = margin + 110;
  const col3X = pageWidth - margin - signWidth - 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(secondaryColor);

  // Column 1: Sales PIC
  doc.text("Dibuat Oleh,", col1X, signY);
  doc.text("Sales & Marketing Team", col1X, signY + 4);

  // Column 2: Head of Sales
  doc.text("Mengetahui,", col2X, signY);
  doc.text("Head of Sales & Marketing", col2X, signY + 4);

  // Column 3: Direksi / General Manager
  doc.text("Disetujui Oleh,", col3X, signY);
  doc.text("General Manager / Direksi", col3X, signY + 4);

  // Signature underline lines
  doc.setDrawColor("#cbd5e1");
  doc.setLineWidth(0.4);
  doc.line(col1X, signY + 22, col1X + 50, signY + 22);
  doc.line(col2X, signY + 22, col2X + 50, signY + 22);
  doc.line(col3X, signY + 22, col3X + 50, signY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#64748b");
  doc.text("Tanggal: ____/____/2026", col1X, signY + 26);
  doc.text("Tanggal: ____/____/2026", col2X, signY + 26);
  doc.text("Tanggal: ____/____/2026", col3X, signY + 26);

  // Page Numbers Footer on All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor("#94a3b8");

    // Left footer
    doc.text(
      "The Lodge Maribaya - Executive Summary Forecast System",
      margin,
      pageHeight - 6
    );

    // Right footer
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 6
    );
  }

  // Save the PDF
  const filename = `Forecast_Executive_Summary_${unit}_${monthName}_${year}.pdf`;
  doc.save(filename);
}
