
import Admin from '../../model/Admin.js'

import User from '../../model/User.js'

import bcrypt from "bcryptjs";



export const loadLoginPage = (req, res) => {
  res.render('admin/login',{error:null});
};


export const logingIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.render('admin/login', { error: 'Invalid email or password' });
     console.log(req.body)
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render('admin/login', { error: 'Invalid email or password' });
      console.log(req.body)
    }

    req.session.admin = admin._id;
    res.redirect('/admin/dashboard');
    console.log(req.body)

  } catch (error) {
    console.log(error);
  }
};

export const loadUserList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalUsers / limit);

    res.render('admin/usermanagment', {
      users,
      currentPage: page,
      totalPages,
      search
    });

  } catch (error) {
    console.log(error);
    res.send('Error loading users');
  }
};



export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.redirect('/admin/users');

    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save();
    res.redirect('/admin/users');
  } catch (error) {
    console.log(error);
    res.send('Error updating user status');
  }
};
const authController={loadLoginPage,logingIn,loadUserList,toggleUserStatus}
export default authController