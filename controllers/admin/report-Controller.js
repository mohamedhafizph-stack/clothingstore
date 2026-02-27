import Order from '../../model/Orders.js';

export const loadReportPage = async (req, res) => {
    try {
        let { filter, startDate, endDate, page } = req.query;
        const currentPage = parseInt(page) || 1;
        const limit = 10;
        const skip = (currentPage - 1) * limit;

        let dateRange = { $lte: new Date() };
        const now = new Date();

        if (filter === 'daily') {
            dateRange = { 
                $gte: new Date(now.setHours(0, 0, 0, 0)), 
                $lte: new Date(now.setHours(23, 59, 59, 999)) 
            };
        } else if (filter === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startOfWeek.setHours(0,0,0,0);
            dateRange.$gte = startOfWeek;
        } else if (filter === 'monthly') {
            dateRange.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filter === 'yearly') {
            dateRange.$gte = new Date(now.getFullYear(), 0, 1);
        } else if (filter === 'custom' && startDate && endDate) {
            dateRange = { 
                $gte: new Date(startDate), 
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        const query = dateRange.$gte ? { createdAt: dateRange } : {};
        
        const statsQuery = { ...query, status: { $nin: ['Cancelled', 'Returned'] } };

        const [reportData, totalOrdersCount, orders] = await Promise.all([
            Order.aggregate([
                { $match: statsQuery },
                { $unwind: "$items" }, 
                {
                    $group: {
                        _id: "$_id",
                        orderTotalPrice: { $first: "$totalPrice" },
                        orderCouponDiscount: { $first: "$couponDiscount" },
                        totalProductOffers: { $sum: { $multiply: [{ $subtract: ["$items.realPrice", "$items.price"] }, "$items.quantity"] } }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSalesCount: { $sum: 1 },
                        totalRevenue: { $sum: "$orderTotalPrice" },
                        totalCoupons: { $sum: { $ifNull: ["$orderCouponDiscount", 0] } },
                        totalProductOffers: { $sum: "$totalProductOffers" }
                    }
                }
            ]),
            Order.countDocuments(query),
            Order.find(query).populate('items.product').sort({ createdAt: -1 }).skip(skip).limit(limit)
        ]);

        const report = reportData[0] || { totalSalesCount: 0, totalRevenue: 0, totalCoupons: 0, totalProductOffers: 0 };

        res.render('admin/sales-report', {
            report,
            orders,
            filter: filter || 'all',
            startDate: startDate || '',
            endDate: endDate || '',
            currentPage,
            totalPages: Math.ceil(totalOrdersCount / limit),
            title: 'Sales Report'
        });

    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).redirect('/admin/dashboard');
    }
};

import PDFDocument from 'pdfkit-table';
import ExcelJS from 'exceljs';

const getFilteredOrders = async (query) => {
    return await Order.find(query).sort({ createdAt: -1 });
};

export const downloadPDF = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateRange = { $lte: new Date() };
        const now = new Date();

        if (filter === 'daily') {
            dateRange = { $gte: new Date(now.setHours(0,0,0,0)), $lte: new Date(now.setHours(23,59,59,999)) };
        } else if (filter === 'weekly') {
            dateRange.$gte = new Date(now.setDate(now.getDate() - now.getDay()));
        } else if (filter === 'monthly') {
            dateRange.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filter === 'custom' && startDate && endDate) {
            dateRange = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
        }

        const query = dateRange.$gte ? { createdAt: dateRange } : {};
        const orders = await Order.find(query).sort({ createdAt: -1 });

        // Accurate Math
        let totalCouponDiscount = 0;
        let totalNetRevenue = 0;
        orders.forEach(o => {
            if (!['Cancelled', 'Returned'].includes(o.status)) {
                totalNetRevenue += o.totalPrice;
                totalCouponDiscount += (o.couponDiscount || 0);
            }
        });

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Sales-Report-${filter}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text('Wearify Sales Report', { align: 'center' });
        doc.fontSize(10).text(`Report Type: ${filter.toUpperCase()} | Period: ${new Date(dateRange.$gte || orders[orders.length-1]?.createdAt).toLocaleDateString()} to ${new Date(dateRange.$lte).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();

        const table = {
            headers: ['Date', 'Order ID', 'Customer', 'Status', 'Amount'],
            rows: [
                ...orders.map(o => [
                    new Date(o.createdAt).toLocaleDateString(),
                    o.orderId,
                    o.shippingAddress.fullName.substring(0, 15),
                    o.status,
                    `INR ${o.totalPrice.toFixed(2)}`
                ]),
                ['', '', '', 'TOTAL DISCOUNT', `INR ${totalCouponDiscount.toFixed(2)}`],
                ['', '', '', 'NET REVENUE', `INR ${totalNetRevenue.toFixed(2)}`]
            ]
        };

        await doc.table(table, { 
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
            prepareRow: (row, i, j, rectRow) => {
                doc.font('Helvetica').fontSize(9);
                if (j >= table.rows.length - 2) doc.font('Helvetica-Bold').fontSize(10); 
            }
        });

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating PDF');
    }
};

export const downloadExcel = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let dateRange = { $lte: new Date() };
        const now = new Date();

        if (filter === 'daily') {
            dateRange = { $gte: new Date(now.setHours(0,0,0,0)), $lte: new Date(now.setHours(23,59,59,999)) };
        } else if (filter === 'weekly') {
            dateRange.$gte = new Date(now.setDate(now.getDate() - now.getDay()));
        } else if (filter === 'monthly') {
            dateRange.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filter === 'custom' && startDate && endDate) {
            dateRange = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23,59,59,999)) };
        }

        const query = dateRange.$gte ? { createdAt: dateRange } : {};
        const orders = await Order.find(query).sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Order ID', key: 'id', width: 15 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Coupon Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'amount', width: 15 }
        ];

        let grandTotalNet = 0;
        let grandTotalDiscount = 0;

        orders.forEach(o => {
            const isCountable = !['Cancelled', 'Returned'].includes(o.status);
            if (isCountable) {
                grandTotalNet += o.totalPrice;
                grandTotalDiscount += (o.couponDiscount || 0);
            }

            worksheet.addRow({
                date: new Date(o.createdAt).toLocaleDateString(),
                id: o.orderId,
                customer: o.shippingAddress.fullName,
                status: o.status,
                discount: o.couponDiscount || 0,
                amount: o.totalPrice
            });
        });

        worksheet.addRow([]);
        const discountRow = worksheet.addRow({ status: 'TOTAL DISCOUNTS', amount: grandTotalDiscount });
        const netRow = worksheet.addRow({ status: 'NET REVENUE', amount: grandTotalNet });

        // Styling
        [discountRow, netRow].forEach(row => {
            row.font = { bold: true };
            row.getCell('amount').numFmt = '₹#,##0.00';
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Sales-Report-${filter}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating Excel');
    }
};


const reportController = {loadReportPage,downloadExcel,downloadPDF}
export default reportController