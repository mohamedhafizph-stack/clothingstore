import Order from '../../model/Orders.js';

export const loadReportPage = async (req, res) => {
    try {
        let { filter, startDate, endDate, page } = req.query;
        
        const currentPage = parseInt(page) || 1;
        const limit = 10; 
        const skip = (currentPage - 1) * limit;

        let dateRange = {};
        const now = new Date();

        if (filter === 'daily') {
            dateRange = { 
                $gte: new Date(now.setHours(0, 0, 0, 0)), 
                $lte: new Date(now.setHours(23, 59, 59, 999)) 
            };
        } else if (filter === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateRange = { $gte: startOfWeek };
        } else if (filter === 'monthly') {
            dateRange = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        } else if (filter === 'yearly') {
            dateRange = { $gte: new Date(now.getFullYear(), 0, 1) };
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
                {
                    $group: {
                        _id: null,
                        totalSalesCount: { $sum: 1 },
                        totalOrderAmount: { $sum: "$totalPrice" },
                        totalDiscount: { $sum: { $add: [{ $ifNull: ["$couponDiscount", 0] }] } } 
                    }
                }
            ]),
            Order.countDocuments(query),
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
        ]);

        const totalPages = Math.ceil(totalOrdersCount / limit);

        res.render('admin/sales-report', {
            report: reportData[0] || { totalSalesCount: 0, totalOrderAmount: 0, totalDiscount: 0 },
            orders,
            filter: filter || 'all',
            startDate: startDate || '',
            endDate: endDate || '',
            currentPage,
            totalPages,
            title: 'Sales Report'
        });

    } catch (error) {
        console.error("Report Page Error:", error);
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
        
        let dateRange = {};
        const now = new Date();

        if (filter === 'daily') {
            dateRange = { 
                $gte: new Date(now.setHours(0, 0, 0, 0)), 
                $lte: new Date(now.setHours(23, 59, 59, 999)) 
            };
        } else if (filter === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateRange = { $gte: startOfWeek };
        } else if (filter === 'monthly') {
            dateRange = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        } else if (filter === 'yearly') {
            dateRange = { $gte: new Date(now.getFullYear(), 0, 1) };
        } else if (filter === 'custom' && startDate && endDate) {
            dateRange = { 
                $gte: new Date(startDate), 
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        const query = dateRange.$gte ? { createdAt: dateRange } : {};
        const statsQuery = { ...query, status: { $nin: ['Cancelled', 'Returned'] } };
        const orders = await getFilteredOrders(query);

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Sales-Report.pdf');
        doc.pipe(res);

        doc.fontSize(20).text('Wearify Sales Report', { align: 'center' });
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const table = {
            title: `Filter: ${filter.toUpperCase()}`,
            headers: ['Date', 'Order ID', 'Customer', 'Status', 'Total'],
            rows: orders.map(o => [
                new Date(o.createdAt).toLocaleDateString(),
                o.orderId,
                o.shippingAddress.fullName,
                o.status,
                `INR ${o.totalPrice.toFixed(2)}`
            ])
        };

        await doc.table(table, { prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10) });
        doc.end();
    } catch (error) {
    
        res.status(500).send('Error generating PDF',error);
    }
};

export const downloadExcel = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        
        let dateRange = {};
        const now = new Date();

        if (filter === 'daily') {
            dateRange = { 
                $gte: new Date(now.setHours(0, 0, 0, 0)), 
                $lte: new Date(now.setHours(23, 59, 59, 999)) 
            };
        } else if (filter === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateRange = { $gte: startOfWeek };
        } else if (filter === 'monthly') {
            dateRange = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        } else if (filter === 'yearly') {
            dateRange = { $gte: new Date(now.getFullYear(), 0, 1) };
        } else if (filter === 'custom' && startDate && endDate) {
            dateRange = { 
                $gte: new Date(startDate), 
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        const query = dateRange.$gte ? { createdAt: dateRange } : {};
        const statsQuery = { ...query, status: { $nin: ['Cancelled', 'Returned'] } };
        const orders = await getFilteredOrders(query);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Order ID', key: 'id', width: 15 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Payment', key: 'method', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 }
        ];

        orders.forEach(o => {
            worksheet.addRow({
                date: new Date(o.createdAt).toLocaleDateString(),
                id: o.orderId,
                customer: o.shippingAddress.fullName,
                method: o.paymentMethod,
                status: o.status,
                amount: o.totalPrice
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Sales-Report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).send('Error generating Excel');
    }
};


const reportController = {loadReportPage,downloadExcel,downloadPDF}
export default reportController