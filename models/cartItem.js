const Sequelize = require('sequelize');

const sequelize = require('../utils/db');

const CartItem = sequelize.define('cartItem',{
    id:{
        type: Sequelize.INTEGER,
        allowNull:false,
        autoIncrement: true,
        primaryKey: true,
        unique: true
    },
    qty: Sequelize.INTEGER
})

module.exports = CartItem;