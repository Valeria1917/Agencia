const connection = require('../connection');
const bcrypt = require('bcrypt');
const { json } = require('express');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const nodemailer = require('nodemailer');

// Configuración del transportador con una cuenta de Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL, // tu correo electrónico
        pass: process.env.PASSWORD // tu contraseña de correo electrónico o contraseña de aplicación
    }
});

// Verificar la configuración del transportador
transporter.verify(function(error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('Server is ready to take our messages:', success);
    }
});

const requestPasswordReset = (req, res) => {
    const { email_usr } = req.body;
    const query = "SELECT updated_at FROM Usuario WHERE email_usr = ?";

    connection.query(query, [email_usr], (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }

        if (results.length <= 0) {
            return res.status(400).json({ message: "Email no encontrado" });
        } else {
            const lastRequest = results[0].updated_at;
            
            // Obtener la hora actual del servidor de la base de datos
            connection.query("SELECT CURRENT_TIMESTAMP as currentTime", (err, timeResults) => {
                if (err) {
                    return res.status(500).json(err);
                }

                const currentTime = new Date(timeResults[0].currentTime);
                const lastRequestTime = new Date(lastRequest);
                const diffInHours = (currentTime - lastRequestTime) / (1000 * 60 * 60);

                if (lastRequest && diffInHours < 1) {
                    console.log('Recuperación de contraseña denegada. Intento dentro de una hora.');
                    return res.status(429).json({ message: "Por favor, espere una hora antes de solicitar nuevamente" });
                }

                const token = jwt.sign({ email: email_usr }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                const resetLink = `http://localhost:4200/reestablecer-contraseña?token=${token}`;

                const mailOptions = {
                    from: process.env.EMAIL,
                    to: email_usr,
                    subject: 'Restablecimiento de Contraseña',
                    html: `<h1>Restablecer Contraseña</h1>
                           <p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${resetLink}">Restablecer Contraseña</a></p>`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return res.status(500).json({ message: "Error sending email", error: error });
                    } else {
                        console.log('Email sent: ' + info.response);

                        // Actualizar la hora de la última solicitud
                        const updateQuery = "UPDATE Usuario SET updated_at = CURRENT_TIMESTAMP WHERE email_usr = ?";
                        connection.query(updateQuery, [email_usr], (err) => {
                            if (err) {
                                return res.status(500).json({ message: "Error al actualizar la solicitud", error: err });
                            }

                            return res.status(200).json({ message: "Password reset link sent to your email." });
                        });
                    }
                });
            });
        }
    });
};

// Controlador para restablecer la contraseña
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
        const email = decoded.email;

        const query = "SELECT * FROM Usuario WHERE email_usr = ?";
        connection.query(query, [email], async (err, results) => {
            if (err) {
                return res.status(500).json(err);
            }

            if (results.length <= 0) {
                return res.status(400).json({ message: "User not found" });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updateQuery = "UPDATE Usuario SET passwd_usr = ?, updated_at = CURRENT_TIMESTAMP WHERE email_usr = ?";
            connection.query(updateQuery, [hashedPassword, email], (err, results) => {
                if (err) {
                    return res.status(500).json(err);
                }
                return res.status(200).json({ message: "Password successfully updated" });
            });
        });
    } catch (error) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }
};

const registerUser = async (req, res) => {
    let usuario = req.body;
    const query = "SELECT email_usr FROM Usuario WHERE email_usr = ?";

    connection.query(query, [usuario.email_usr], async (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }

        if (results.length <= 0) {
            // Encriptar la contraseña
            usuario.passwd_usr = await bcrypt.hash(usuario.passwd_usr, 10);

            const insertQuery = "INSERT INTO Usuario (nom_usr, app_usr, passwd_usr, nacionalidad_usr, sexo_usr, edad_usr, email_usr, ciudad_usr, status, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'false', 'usuario')";

            connection.query(insertQuery, [usuario.nom_usr, usuario.app_usr, usuario.passwd_usr, usuario.nacionalidad_usr, usuario.sexo_usr, usuario.edad_usr, usuario.email_usr, usuario.ciudad_usr], (err, results) => {
                if (err) {
                    return res.status(500).json(err);
                }

                // Enviar correo de confirmación
                const token = jwt.sign({ email: usuario.email_usr }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
                const mailOptions = {
                    from: process.env.EMAIL,
                    to: usuario.email_usr,
                    subject: 'Validación de Correo en Agencias Dolores Hidalgo',
                    html: `<h1>Confirmación de email</h1>
                           <p>Ignora este correo si no fuiste tú</p>
                           <p>Click <a href="http://localhost:8090/usuario/confirm/${token}">aquí</a> para confirmar tu correo electrónico.</p>`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });

                return res.status(200).json({ message: "Successfully Registered. Please confirm your email." });
            });
        } else {
            return res.status(400).json({ message: "Email Already Exists" });
        }
    });
};

const confirmEmail = (req, res) => {
    const token = req.params.token;

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(400).json({ error: 'No se pudo confirmar el correo. Verifica el enlace e inténte registrarse de nuevo.' }); //REMPLAZAR
        }

        const email = decoded.email;

        const queryCheck = "SELECT * FROM Usuario WHERE email_usr = ? AND status = 'true'";
        connection.query(queryCheck, [email], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la verificación del estado del usuario.' });
            }
            if (results.length > 0) {
                res.redirect('http://localhost:4200?message=Email El correo ya ha sido confirmado.');
            }

            const query = "UPDATE Usuario SET status = 'true' WHERE email_usr = ?";
            connection.query(query, [email], (err, result) => {
                if (err) {
                  return res.status(500).json({ error: 'Error al validar. Inténtelo de nuevo más tarde.' });  //REMPLAZAR
                 }

                 // Redirect to the frontend after successful email confirmation
                res.redirect('http://localhost:4200?message=Email confirmado, ahora puede iniciar sesión');
             });
        });
    });
};

const loginUser = (req, res) => {
    const { email_usr, passwd_usr } = req.body;
    const query = "SELECT * FROM Usuario WHERE email_usr = ?";

    connection.query(query, [email_usr], async (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }

        if (results.length === 0 || results[0].status !== 'true') {
            return res.status(401).json({ message: 'Invalid email or password, or email not confirmed' });
        }

        const usuario = results[0];

        const validPassword = await bcrypt.compare(passwd_usr, usuario.passwd_usr);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: usuario.id_usr, email: usuario.email_usr, role: usuario.role }, process.env.ACCESS_TOKEN, { expiresIn: '8h' });

        res.status(200).json({ token });
    });
};

//se puede usar para crear el perfil supongo
const getProfile = (req, res) => {
    const query = "SELECT * FROM Usuario WHERE id_usr = ?";

    connection.query(query, [req.usuarioId], (err, results) => {
        //el valor de req.usuarioId es any
        if (err) {
            return res.status(500).json(err);
        }

        res.status(200).json(results[0]);
    });
};

const getAllAgencias = (req, res) => {
    connection.query('SELECT * FROM Agencia', (error, results) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.status(200).json(results);
    });
  };

  const getAllHoteles = (req, res) => {
    connection.query(`SELECT * FROM Hosteleria where tipo_hs = 'Hotel'`, (error, results) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.status(200).json(results);
    });
  };

  const getAllRestaurantes = (req, res) => {
    connection.query(`SELECT * FROM Hosteleria where tipo_hs = 'Restaurante'`, (error, results) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.status(200).json(results);
    });
  };
  
  const mandarConsulta = (req, res) => {
    const id_usr = req.usuarioId;
    const { adults_18_36, adults_37_64, ninos_0_8, ninos_9_17, travel_with, budget, actividades, lugar_deseado, hotel, restaurante, experiencia, nom_agencia } = req.body;
    const { llegada_cons, salida_cons } = req.body;

    // Verificar si el usuario ha enviado una consulta en la última semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    connection.query('SELECT * FROM Consulta WHERE id_usr = ? AND fecha_creacion >= ?', [id_usr, oneWeekAgo], (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (results.length > 0) {
            return res.status(429).json({ error: 'Solo puedes enviar una consulta cada semana.' });
        }

        // Obtener id_agencia
        connection.query('SELECT id_agencia FROM Agencia WHERE nom_ag = ?', [nom_agencia], (error, agenciaResults) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            if (agenciaResults.length === 0) {
                return res.status(404).json({ error: 'Agencia no encontrada' });
            }

            const id_agencia = agenciaResults[0].id_agencia;

            // Insertar nueva consulta
            connection.query(
                'INSERT INTO Consulta (llegada_cons, salida_cons, adults_18_36, adults_37_64, ninos_0_8, ninos_9_17, travel_with, budget, actividades, lugar_deseado, hotel, restaurante, experiencia, id_agencia, id_usr, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [llegada_cons, salida_cons, adults_18_36, adults_37_64, ninos_0_8, ninos_9_17, travel_with, budget, actividades, lugar_deseado, hotel, restaurante, experiencia, id_agencia, id_usr],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    res.status(200).json({ 
                        id_consulta: result.insertId, 
                        llegada_cons, 
                        salida_cons, 
                        adults_18_36, 
                        adults_37_64, 
                        ninos_0_8, 
                        ninos_9_17, 
                        travel_with, 
                        budget, 
                        actividades, 
                        lugar_deseado, 
                        hotel, 
                        restaurante, 
                        experiencia, 
                        id_agencia, 
                        id_usr 
                    });
                }
            );
        });
    });
};



  const getAllAtracTuristico = (req, res) => {
    connection.query('SELECT * FROM AtracTuristico', (error, results) => {
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(200).json(results);
    });
  };

module.exports = {
    registerUser,
    confirmEmail,
    loginUser,
    getProfile, //No se si se vaya a usar
    requestPasswordReset,
    resetPassword,
    getAllAgencias,
    getAllHoteles,
    getAllRestaurantes,
    mandarConsulta,
    getAllAtracTuristico,
};
