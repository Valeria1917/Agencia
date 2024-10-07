const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

// Rutas para registro, confirmación de correo, login, perfil y recuperación de contraseña

router.get('/confirm', authMiddleware.verifyToken, adminMiddleware.isAdmin, (req, res) => {
    return res.status(200).json({ message: 'Permiso de admin' });
  });

//Crud de transportista
router.post('/transportista',adminController.createTransportista);
router.get('/transportistas',adminController.getAllTransportistas);
router.get('/transportista/:id_trans',adminController.getTransportistaById);
router.put('/transportista',adminController.updateTransportista);
router.delete('/transportista/:id_trans',adminController.deleteTransportista);


router.post('/guia',adminController.createGuia); //jala
router.get('/guias',adminController.getAllGuia); //jala
router.put('/guia',adminController.updateGuia);  //jala
router.get('/guia/:id_guia',adminController.getGuiaById); //jala
router.delete('/guia/:id_guia',adminController.deleteGuia); //jala

router.post('/hosteleria',adminController.createHosteleria); //jala
router.get('/hostelerias',adminController.getAllHosteleria); //jala
router.get('/hosteleria/:id_hosteleria',adminController.getHosteleriaById); //jala
router.put('/hosteleria',adminController.updateHosteleria); //jala
router.delete('/hosteleria/:id_hosteleria',adminController.deleteHosteleria); //Jala

router.post('/atractivo',adminController.createAtracTuristico); //jala
router.get('/atractivos',adminController.getAllAtracTuristico); //Jala
router.get('/atractivo/:id_atracTuris',adminController.getAtracTuristiconById); //Jala
router.put('/atractivo',adminController.updateAtracTuristico); //Jala
router.delete('/atractivo/:id_atracTuris',adminController.deleteAtracTuristico); //Jala

//Usuarios registrados
router.get('/usuarios',adminController.getTodosUsuarios);
router.get('/usuario/:id_usr',adminController.getUsuarioById); //Este no se usa

// Rutas para el manejo de paquetes 
router.get('/paquete', verifyToken, isAdmin, adminController.getAllPaquetes);

router.get('/paquete/:id/completo', verifyToken, isAdmin, adminController.getPaqueteCompleto);
router.post('/paquete', verifyToken, isAdmin, adminController.createPaquete);
router.put('/paquete/:id', verifyToken, isAdmin, adminController.updatePaquete);
router.delete('/paquete/:id', verifyToken, isAdmin, adminController.deletePaquete);

// Para asignar el paquete al turista
router.post('/paquete/asignar-usuario', verifyToken, isAdmin, adminController.assignUserToPaquete);

router.get('/paqueteUsuarios', verifyToken, isAdmin,adminController.getAllUsuarios);
router.get('/paquete/:id/usuarios-asignados', verifyToken, isAdmin, adminController.getUsuariosAsignados);

router.delete('/paquete/desasignar-paquete/:idPaquete/:idUsuario', verifyToken, isAdmin, adminController.desasignarUsuarioPaquete);

//Para observar las consultas realizadas por parte del usario
router.get('/consultas', verifyToken, isAdmin , adminController.getAllConsultas) 

//para obtener la tabla admin Agencias

//Para obtener experiencias Lupitas #Lol






// Rutas
router.get('/experiencias', adminController.getAllExperiencias);
router.get('/experiencia/:id_Experiencia', adminController.getExperienciaById);
router.delete('/experiencia/:id_Experiencia', adminController.deleteExperiencia);
router.post('/experiencia', adminController.createExperiencia);
router.put('/experiencia', adminController.updateExperiencia);

module.exports = router;





module.exports = router;


