exports.getError = (req, res) => {
    res.status(404).render('error', {
        pageTitle: 'Error 404',
        path:'',
    });
};

exports.get500Error = (error,req,res,next)=>{
    res.status(500).render('500',{
        pageTitle: 'Error 500',
        path:'',
    })
}

exports.getLinkSent = (req,res,next) => {
    res.render('link-sent',{
        pageTitle: 'Link Sent',
        path: 'sign-up'
    })
}