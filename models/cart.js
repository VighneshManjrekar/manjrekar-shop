const Sequelize = require('sequelize');

const sequelize = require('../utils/db');

const Cart = sequelize.define('cart',{
    id:{
        type: Sequelize.INTEGER,
        allowNull:false,
        autoIncrement: true,
        primaryKey: true,
        unique: true
    }
})

module.exports = Cart;