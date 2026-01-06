const Admin = require('../../model/Admin');
const User = require('../../model/User'); 
const bcrypt = require('bcryptjs');

// load login page
const loadLoginPage = (req, res) => {
  res.render('admin/login',{error:null});
};

// handle login
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






// Load User List Page
const loadUserList = async (req, res) => {
  try {
    const users = await User.find().lean(); // lean() returns plain JS objects
    res.render('admin/usermanagment', { users });
  } catch (error) {
    console.log(error);
    res.send('Error loading users');
  }
};

// Block / Unblock User
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
