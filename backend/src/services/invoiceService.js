const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const BookingRoom = require('../models/BookingRoom');
const FoodOrder = require('../models/FoodOrder');
const FoodOrderItem = require('../models/FoodOrderItem');
const Payment = require('../models/Payment');
const env = require('../config/env');
const qrService = require('./qrService');
const referenceGeneratorService = require('./referenceGeneratorService');

const INVOICE_DIR = path.join(__dirname, '..', '..', 'uploads', 'invoices');

const ensureInvoiceDir = () => {
  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }
};

/**
 * drawInvoicePDF
 * Renders the actual PDF content using pdfkit and writes it to disk.
 */
const drawInvoicePDF = ({ filePath, invoiceNumber, guestSnapshot, roomDetailsSnapshot, foodItemsSnapshot, paymentDetailsSnapshot, hotelInfoSnapshot, subtotalAmount, discountAmount, taxAmount, totalAmount, qrDataUrl }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(hotelInfoSnapshot.name, { align: 'left' });
    doc.fontSize(10).fillColor('#555').text(hotelInfoSnapshot.address);
    doc.text(`${hotelInfoSnapshot.phone}  |  ${hotelInfoSnapshot.email}`);
    doc.moveDown(1);

    doc.fillColor('#000').fontSize(16).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(`Invoice No: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(1.5);

    // Guest Info
    doc.fontSize(12).text('Guest Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${guestSnapshot.fullName}`);
    doc.text(`CNIC: ${guestSnapshot.cnic}`);
    doc.text(`Contact: ${guestSnapshot.contactNumber}`);
    if (guestSnapshot.email) doc.text(`Email: ${guestSnapshot.email}`);
    if (guestSnapshot.address) doc.text(`Address: ${guestSnapshot.address}`);
    doc.moveDown(1);

    // Room details
    if (roomDetailsSnapshot && roomDetailsSnapshot.length > 0) {
      doc.fontSize(12).text('Room Details', { underline: true });
      doc.fontSize(10);
      roomDetailsSnapshot.forEach((r) => {
        doc.text(
          `${r.roomType} (${r.roomNumber})  |  ${new Date(r.checkIn).toLocaleDateString()} - ${new Date(r.checkOut).toLocaleDateString()}  |  ${r.nights} night(s) x ${r.pricePerNight} = ${r.subtotal}`
        );
      });
      doc.moveDown(1);
    }

    // Food items
    if (foodItemsSnapshot && foodItemsSnapshot.length > 0) {
      doc.fontSize(12).text('Food Order Details', { underline: true });
      doc.fontSize(10);
      foodItemsSnapshot.forEach((f) => {
        doc.text(`${f.name}  x${f.quantity}  @ ${f.unitPrice} = ${f.subtotal}`);
      });
      doc.moveDown(1);
    }

    // Payment summary
    doc.fontSize(12).text('Payment Summary', { underline: true });
    doc.fontSize(10);
    doc.text(`Subtotal: PKR ${subtotalAmount}`);
    if (discountAmount > 0) doc.text(`Discount: -PKR ${discountAmount}`);
    if (taxAmount > 0) doc.text(`Tax: PKR ${taxAmount}`);
    doc.fontSize(12).text(`Total: PKR ${totalAmount}`, { underline: false });
    doc.fontSize(10);
    if (paymentDetailsSnapshot?.paymentMethod) {
      doc.text(`Payment Method: ${paymentDetailsSnapshot.paymentMethod}`);
    }
    if (paymentDetailsSnapshot?.transactionId) {
      doc.text(`Transaction ID: ${paymentDetailsSnapshot.transactionId}`);
    }
    if (paymentDetailsSnapshot?.advancePaymentPercent) {
      doc.text(`Advance Paid: ${paymentDetailsSnapshot.advancePaymentPercent}%`);
      doc.text(`Remaining Due: PKR ${paymentDetailsSnapshot.remainingAmountDue || 0}`);
    }
    doc.moveDown(1.5);

    // QR Code
    if (qrDataUrl) {
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');
      doc.fontSize(10).text('Scan to verify this invoice:', { align: 'left' });
      doc.image(qrBuffer, { width: 100 });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#888').text('This is a system-generated invoice from White Forest Hotel.', { align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

/**
 * generateInvoiceForBooking
 */
const generateInvoiceForBooking = async (bookingId) => {
  ensureInvoiceDir();

  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw new Error('Booking not found');

  const bookingRooms = await BookingRoom.find({ booking: bookingId }).lean();
  const payment = await Payment.findOne({ bookingId, paymentStatus: 'paid' }).sort({ paidAt: -1 }).lean();

  const invoiceNumber = await referenceGeneratorService.generateInvoiceReference();
  const { dataUrl, payload } = await qrService.generateQRCodeDataURL(booking.bookingReference);

  const fileName = `${invoiceNumber}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  const guestSnapshot = booking.guestInfo;
  const roomDetailsSnapshot = bookingRooms.map((r) => ({
    roomNumber: r.roomNumber,
    roomType: r.roomType,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    nights: r.nights,
    pricePerNight: r.pricePerNight,
    subtotal: r.subtotal,
  }));

  const paymentDetailsSnapshot = {
    paymentMethod: payment?.paymentMethod || null,
    transactionId: payment?.transactionId || null,
    amountPaid: payment?.amount || 0,
    advancePaymentPercent: booking.advancePaymentRequired ? booking.advancePaymentPercent : 100,
    remainingAmountDue: booking.remainingAmountDue,
    paidAt: payment?.paidAt || null,
  };

  const hotelInfoSnapshot = {
    name: env.HOTEL_NAME,
    address: env.HOTEL_ADDRESS,
    phone: env.HOTEL_PHONE,
    email: env.HOTEL_EMAIL,
  };

  await drawInvoicePDF({
    filePath,
    invoiceNumber,
    guestSnapshot,
    roomDetailsSnapshot,
    foodItemsSnapshot: [],
    paymentDetailsSnapshot,
    hotelInfoSnapshot,
    subtotalAmount: booking.subtotalAmount,
    discountAmount: booking.discountAmount,
    taxAmount: booking.taxAmount,
    totalAmount: booking.totalAmount,
    qrDataUrl: dataUrl,
  });

  const invoice = await Invoice.create({
    invoiceNumber,
    booking: booking._id,
    guestSnapshot,
    roomDetailsSnapshot,
    foodItemsSnapshot: [],
    paymentDetailsSnapshot,
    hotelInfoSnapshot,
    subtotalAmount: booking.subtotalAmount,
    discountAmount: booking.discountAmount,
    taxAmount: booking.taxAmount,
    totalAmount: booking.totalAmount,
    qrCodeData: payload,
    pdfUrl: `/uploads/invoices/${fileName}`,
  });

  return invoice;
};

/**
 * generateInvoiceForFoodOrder
 */
const generateInvoiceForFoodOrder = async (foodOrderId) => {
  ensureInvoiceDir();

  const order = await FoodOrder.findById(foodOrderId).lean();
  if (!order) throw new Error('Food order not found');

  const orderItems = await FoodOrderItem.find({ foodOrder: foodOrderId }).lean();
  const payment = await Payment.findOne({ orderId: foodOrderId, paymentStatus: 'paid' }).sort({ paidAt: -1 }).lean();

  const invoiceNumber = await referenceGeneratorService.generateInvoiceReference();
  const { dataUrl, payload } = await qrService.generateQRCodeDataURL(order.orderReference);

  const fileName = `${invoiceNumber}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  const guestSnapshot = order.guestInfo;
  const foodItemsSnapshot = orderItems.map((i) => ({
    name: i.name,
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    subtotal: i.subtotal,
  }));

  const paymentDetailsSnapshot = {
    paymentMethod: payment?.paymentMethod || null,
    transactionId: payment?.transactionId || null,
    amountPaid: payment?.amount || 0,
    advancePaymentPercent: null,
    remainingAmountDue: 0,
    paidAt: payment?.paidAt || null,
  };

  const hotelInfoSnapshot = {
    name: env.HOTEL_NAME,
    address: env.HOTEL_ADDRESS,
    phone: env.HOTEL_PHONE,
    email: env.HOTEL_EMAIL,
  };

  await drawInvoicePDF({
    filePath,
    invoiceNumber,
    guestSnapshot,
    roomDetailsSnapshot: [],
    foodItemsSnapshot,
    paymentDetailsSnapshot,
    hotelInfoSnapshot,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    qrDataUrl: dataUrl,
  });

  const invoice = await Invoice.create({
    invoiceNumber,
    foodOrder: order._id,
    guestSnapshot,
    roomDetailsSnapshot: [],
    foodItemsSnapshot,
    paymentDetailsSnapshot,
    hotelInfoSnapshot,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    qrCodeData: payload,
    pdfUrl: `/uploads/invoices/${fileName}`,
  });

  return invoice;
};

module.exports = {
  generateInvoiceForBooking,
  generateInvoiceForFoodOrder,
};
