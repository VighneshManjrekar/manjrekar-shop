const mongoose = require('mongoose');
const Scheama = mongoose.Schema;
const Product = require('./product');

const userSchema = new Scheama({
    userName: {
        type: String,
        required: true
    },
    
    email: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },
    
    resetToken: String,

    resetTokenExpiry: Date,

    cart: {
        items: [
            {
                productId: { type: Scheama.Types.ObjectId, ref: 'Product', required: true },
                quantity: { type: Number, required: true }
            }
        ]
    }
})

userSchema.methods.deleteProduct = function(productId){
    const newCartItemArray = this.cart.items.filter(item => {
        return item.productId.toString() !== productId.toString()
    });
    this.cart.items = newCartItemArray;
    return this.save().then(()=>{
        return Product.findByIdAndRemove(productId);
    })
}

userSchema.methods.deleteFromCart = function(productId){
    const newCartItemArray = this.cart.items.filter(item => {
        return item.productId.toString() !== productId.toString()
    });
    this.cart.items = newCartItemArray;
    return this.save();
}

userSchema.methods.addToCart = function(product) {
    const productIndex = this.cart.items.findIndex(prod => {
        return prod.productId.toString() === product._id.toString();
    });
    let newQuantity = 1
    const cartItems = [...this.cart.items];
    if (productIndex >= 0) {
        newQuantity = this.cart.items[productIndex].quantity + 1;
        cartItems[productIndex].quantity = newQuantity;
    } else {
        cartItems.push({
            productId: product._id,
            quantity: newQuantity
        })
    }
    
    this.cart.items = cartItems;
    return this.save();
}

userSchema.methods.clearCart = function(){
    this.cart.items = [];
    return this.save();
}

module.exports = mongoose.model('User', userSchema);