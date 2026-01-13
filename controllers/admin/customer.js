
import User from '../../model/User.js'

export const blockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: 'blocked'
    });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/users');
  }
};

export const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: 'active'
    });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/users');
  }
};


const user ={
    blockUser,
    unblockUser
}
export default user;