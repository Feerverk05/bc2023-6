const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const bodyParser = require('body-parser');
const { Validator } = require('jsonschema');
const port = 8000;
const upload = multer({ dest: 'uploads/' });

const template = fs.readFileSync('image.html').toString();

let devices = [];
let users = [];

function validateCreateDevice(body) {
    const createDeviceSchema = {
        type: 'object',
        properties: {
            name: { type: 'string' },
            desc: { type: 'string' },
            serial_number: { type: 'string' },
            manufacturer: { type: 'string' },
            image_path: { type: 'string' },
        },
        required: ['serial_number'],
        additionalProperties: false,
    };

    const validator = new Validator();
    const validationResult = validator.validate(body, createDeviceSchema);
    return validationResult.errors.length === 0;
}

function validateUpdateDevice(body) {
    const updateDeviceSchema = {
        type: 'object',
        properties: {
            name: { type: 'string' },
            desc: { type: 'string' },
            serial_number: { type: 'string' },
            manufacturer: { type: 'string' },
            image_path: { type: 'string' },
        },
        additionalProperties: false,
    };

    const validator = new Validator();
    const validationResult = validator.validate(body, updateDeviceSchema);
    return validationResult.errors.length === 0;
}

function validateCreateUser(body) {
    const createUserSchema = {
        type: 'object',
        properties: {
            username: { type: 'string' },
            name: { type: 'string' },
            surname: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
        },
        required: ['username'],
        additionalProperties: false,
    };

    const validator = new Validator();
    const validationResult = validator.validate(body, createUserSchema);
    return validationResult.errors.length === 0;
}

function validateUpdateUser(body) {
    const updateUserSchema = {
        type: 'object',
        properties: {
            username: { type: 'string' },
            name: { type: 'string' },
            surname: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
        },
        additionalProperties: false,
    };

    const validator = new Validator();
    const validationResult = validator.validate(body, updateUserSchema);
    return validationResult.errors.length === 0;
}

app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/images', express.static('uploads'));

// Devices
app.get('/devices', (req, res) => {
    res.status(200).send(devices);
});

app.post('/devices', (req, res) => {
    const isValid = validateCreateDevice(req.body);
    if (!isValid) {
        return res.status(400).json({ error: 'Invalid device data' });
    }
    const newDevice = req.body;
    newDevice.id = devices.length + 1;
    devices.push(newDevice);
    res.status(201).json({ id: newDevice.id });
});

app.get('/devices/:id', (req, res) => {
    const DeviceId = req.params.id; 
    const device = devices.find((device) => device.id == DeviceId); 

    if (!device) {
        res.sendStatus(404);
    } else {
        res.status(200).json(device);
    }
});

app.put('/devices/:id', (req, res) => {
    const isValidUpdate = validateUpdateDevice(req.body);

    if (!isValidUpdate) {
        res.status(400).json({ error: 'Invalid update data' });
        return;
    }

    const deviceId = parseInt(req.params.id);
    const deviceToUpdate = devices.find((device) => device.id === deviceId);

    if (!deviceToUpdate) {
        res.sendStatus(404);
        return;
    }

    const updatedDevice = { ...deviceToUpdate, ...req.body };
    devices[deviceId - 1] = updatedDevice;

    res.sendStatus(200);
});

app.delete('/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    const deviceIndex = devices.findIndex((device) => device.id == deviceId);
    if (deviceIndex === -1) {
        res.sendStatus(404);
    } else {
        devices.splice(deviceIndex, 1);
        res.sendStatus(200);
    }
});

app.post('/devices/:id/image', upload.single('image'), (req, res) => {
    const deviceId = parseInt(req.params.id);
    const deviceToUpdate = devices.find((device) => device.id === deviceId);

    if (!deviceToUpdate) {
        return res.sendStatus(404);
    }

    deviceToUpdate.image_path = req.file.filename;
    return res.sendStatus(200);
});

app.get('/devices/:id/image', (req, res) => {
    const deviceId = parseInt(req.params.id);
    const device = devices.find((device) => device.id === deviceId);

    if (!device || !device.image_path) {
        return res.sendStatus(404);
    }

    res.sendFile(path.join(__dirname, 'images', device.image_path));
});

app.put('/devices/:id/assign', (req, res) => {
    const deviceId = req.params.id;
    const device = devices.find(device => device.id == deviceId);

    if (!device) {
        return res.sendStatus(404);
    }

    if (device.assigned_to) {
        return res.status(400).json({ error: 'Device already assigned' });
    }

    device.assigned_to = req.body.username;
    return res.sendStatus(200);
});

app.put('/devices/:id/unassign', (req, res) => {
    const deviceId = req.params.id;
    const device = devices.find(device => device.id == deviceId);

    if (!device) {
        return res.sendStatus(404);
    }

    if (!device.assigned_to) {
        return res.sendStatus(400);
    }

    device.assigned_to = null;
    return res.sendStatus(200);
});


// Users
app.get('/users', (req, res) => {
    res.status(200).send(users);
});

app.post('/users', (req, res) => {
    const isValid = validateCreateUser(req.body);
    if (!isValid) {
        return res.status(400).json({ error: 'Bad JSON data for creating user' });
    }

    const { username } = req.body;
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }

    users.push(req.body);
    res.status(201).json({ username });
});

app.get('/users/:username', (req, res) => {
    const { username } = req.params;
    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
});

app.put('/users/:username', (req, res) => {
    const { username } = req.params;
    const userIndex = users.findIndex(user => user.username === username);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const isValidUpdate = validateUpdateUser(req.body);
    if (!isValidUpdate) {
        return res.status(400).json({ error: 'Bad JSON data for updating user' });
    }

    users[userIndex] = { ...users[userIndex], ...req.body };
    res.status(200).json({ message: 'User updated successfully' });
});

app.delete('/users/:username', (req, res) => {
    const { username } = req.params;
    const userIndex = users.findIndex(user => user.username === username);
    if (userIndex === -1) {
        res.status(404).json({ error: 'User not found' });
    } else {
        users.splice(userIndex, 1);
        res.status(200).json({ message: 'User deleted successfully' });
    }
});

app.get('/users/:username/devices', (req, res) => {
    const { username } = req.params;
    const userDevices = devices.filter(device => device.assigned_to === username);

    if (userDevices.length === 0) {
        return res.sendStatus(404);
    }

    res.status(200).json(userDevices);
});

app.listen(port, () => {
    console.log('Server is running on http://localhost:' + port + '/api-docs');
});