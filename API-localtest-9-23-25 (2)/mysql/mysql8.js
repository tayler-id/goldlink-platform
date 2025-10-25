let mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    connectionLimit : parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    host     : process.env.DB_HOST || 'localhost',
    user     : process.env.DB_USER || 'bmapi',
    password : process.env.DB_PASSWORD || 'local54321',
    database : process.env.DB_NAME || 'bmvapi',
    debug    :  false
});
pool.getConnection((err,connection)=> {
    if(err) throw err;
    console.log("Connected to MySQL database!");
    connection.release();
});
module.exports = pool;