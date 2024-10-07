const express = require('express');
const cors = require('cors');
const usuarioRoute = require('./routes/usuarioRoutes');
const adminRoute = require('./routes/adminRoutes');
const gestorRoute = require('./routes/gestorRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use('/usuario', usuarioRoute);
app.use('/admin', adminRoute);
app.use('/gestor', gestorRoute); 

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;
