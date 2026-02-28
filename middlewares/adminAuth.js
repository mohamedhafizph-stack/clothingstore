export const adminAuth = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.session.admin) {
        return next();
    }
    res.redirect('/admin/login');
};
export default adminAuth