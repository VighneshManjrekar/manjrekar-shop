const fs = require("fs");

exports.createInvoice = (doc, invoice, path) => {
  generateHeader(doc);
  generateCustomerInformation(doc, invoice);
  generateInvoiceTable(doc, invoice);

  doc.pipe(fs.createWriteStream(path));
  doc.end();
};

const formatDate = (date) => {
  let day = date.getDate();
  let month = date.getMonth();
  let year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const generateHr = (doc, y) => {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
};

const generateHeader = (doc) => {
  doc
    .fontSize(25)
    .text("Manjrekar's Shop", 50, 57)
    .fontSize(10)
    .text("Manjrekar's Shop", 200, 50, { align: "right" })
    .text("Sector 4, Airoli", 200, 65, { align: "right" })
    .text("Navi Mumbai 400708", 200, 80, { align: "right" })
    .moveDown();
};

const generateCustomerInformation = (doc, invoice) => {
  doc.fillColor("#444444").fontSize(20).text("Invoice", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Order Id", 50, customerInformationTop)
    .text("Name", 50, customerInformationTop + 15)
    .text("Invoice Date", 50, customerInformationTop + 30)
    .font("Helvetica")
    .text(`${invoice.id}`, 150, customerInformationTop)
    .text(`${invoice.name}`, 150, customerInformationTop + 15)
    .text(`${formatDate(new Date())}`, 150, customerInformationTop + 30);

  generateHr(doc, 252);
};

const generateTableRow = (doc, y, item, qty, price, total) => {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(qty, 250, y)
    .text(price, 300, y, { width: 90, align: "right" })
    .text(total, 390, y, { width: 90, align: "right" });
};

const generateInvoiceTable = (doc, invoice) => {
  let i = 0;
  let invoiceTableTop = 330;
  let position;

  doc.font("Helvetica-Bold");
  generateTableRow(doc, invoiceTableTop, "Item", "Quantity", "Price", "Total");
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  invoice.items.forEach((item) => {
    i += 1;
    position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.title,
      item.qty,
      item.price,
      item.qty * item.price
    );
    generateHr(doc, position + 20);
  });

  const subtotalPosition = position + 40;
  doc
    .moveDown()
    .font("Helvetica-Bold")
    .text("Subtotal", 300, subtotalPosition, { width: 90, align: "right" })
    .text(`Rs ${invoice.total}`, 390, subtotalPosition, {
      width: 90,
      align: "right",
    });
};
