const fs = require('fs');

exports.deleteImg = (filePath) => {
    fs.unlink(filePath,(err)=>{
        if(err){
            throw new Error('Operation Failed!')
        }
    })
}