const Admin = require('../../model/Admin');
const User = require('../../model/User'); 
const bcrypt = require('bcryptjs');


const loadLoginPage = (req, res) => {
  res.render('admin/login',{error:null});
};


const logingIn = async (req, res) => {
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

const loadUserList = async (req, res) => {
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



const toggleUserStatus = async (req, res) => {
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
module.exports={loadLoginPage,logingIn,loadUserList,toggleUserStatus}
