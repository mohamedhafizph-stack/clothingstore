export const loadAboutUs = async(req,res)=>{
    res.render('user/about-us')
}
export const loadcontact = async(req,res)=>{
    res.render('user/contact')
}

const homeController = {loadAboutUs,loadcontact}

export default homeController