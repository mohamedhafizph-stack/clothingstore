import User from '../../model/User.js';

export const getWalletData = async (userId) => {
    // Fetch only the wallet and referralCode to keep it lightweight
    return await User.findById(userId);
};

export const addMoneyToWallet = async (userId, amount) => {
    return await User.findByIdAndUpdate(
        userId,
        { $inc: { wallet: amount } },
        { new: true }
    );
};