// server/index.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import schedule from 'node-schedule';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cronParser from 'cron-parser';
import WebSocket, { WebSocketServer } from 'ws';

const { parseExpression } = cronParser;

// --- Konfiguracja ścieżek ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// --- Serwowanie statycznego frontendu ---
const frontendDistPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendDistPath));
console.log(`[INFO] Serwowanie plików frontendu z: ${frontendDistPath}`);

// --- Definicje zmiennych i funkcji pomocniczych API GARDENA ---
const GARDENA_CLIENT_ID = process.env.GARDENA_CLIENT_ID;
const GARDENA_CLIENT_SECRET = process.env.GARDENA_CLIENT_SECRET;
const GARDENA_API_KEY = process.env.GARDENA_API_KEY;
const GARDENA_AUTH_URL = 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/token';
const GARDENA_SMART_API_BASE_URL = 'https://api.smart.gardena.dev/v1';

// --- Definicje zmiennych i funkcji pomocniczych API OPEN WEATHER MAP ---

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

let accessToken = null;
let tokenExpiry = 0;
let devicesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 1000;

async function getAccessToken() {
	if (accessToken && Date.now() < tokenExpiry) return accessToken;
	try {
		const authData = new URLSearchParams({
			client_id: GARDENA_CLIENT_ID,
			client_secret: GARDENA_CLIENT_SECRET,
			grant_type: 'client_credentials',
		});
		const response = await axios.post(GARDENA_AUTH_URL, authData);
		accessToken = response.data.access_token;
		tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
		console.log('[INFO] Token API Gardena pomyślnie uzyskany/odświeżony!');
		return accessToken;
	} catch (error) {
		console.error('Błąd podczas uzyskania tokena API Gardena:', error.response?.data || error.message);
		throw new Error('Nie można uzyskać tokena autoryzacji Gardena.');
	}
}

async function updateDeviceName(serviceId, newName) {
    const token = await getAccessToken();
    const apiUrl = `${GARDENA_SMART_API_BASE_URL}/services/${serviceId}`;

    const payload = {
        data: {
            id: serviceId,
            type: "COMMON",
            attributes: {
                name: {
                    value: newName
                }
            }
        }
    };

    try {
        await axios.put(apiUrl, payload, {
            headers: {
				Authorization: `Bearer ${token}`,
				'Authorization-Provider': 'husqvarna',
				'X-Api-Key': GARDENA_API_KEY,
				'Content-Type': 'application/vnd.api+json',
			},
        });
        console.log(`Nazwa dla usługi ${serviceId} została zmieniona na "${newName}".`);
        devicesCache = null;
    } catch (error) {
        console.error(
			`Błąd podczas zmiany nazwy dla ${serviceId}:`,
			error.response ? error.response.data : error.message
		);
		throw error;
    }
}


async function sendControlCommand(commandPayload) {
	const { deviceId, action, value, deviceType, valveServiceId } = commandPayload;
	const token = await getAccessToken();
	const serviceIdToUse = valveServiceId || deviceId;
	const apiUrl = `${GARDENA_SMART_API_BASE_URL}/command/${serviceIdToUse}`;
	let commandType = '',
		commandData = {},
		controlResourceType = '';

	switch (action) {
		case 'start':
			commandType = 'START_SECONDS_TO_OVERRIDE';
			commandData = { seconds: parseInt(value, 10) * 60 };
			controlResourceType = 'MOWER_CONTROL';
			break;
		case 'parkUntilNextTask':
			commandType = 'PARK_UNTIL_NEXT_TASK';
			controlResourceType = 'MOWER_CONTROL';
			break;
		case 'parkUntilFurtherNotice':
			commandType = 'PARK_UNTIL_FURTHER_NOTICE';
			controlResourceType = 'MOWER_CONTROL';
			break;
		case 'startWatering':
			commandType = 'START_SECONDS_TO_OVERRIDE';
			commandData = { seconds: parseInt(value, 10) * 60 };
			controlResourceType = 'VALVE_CONTROL';
			break;
		case 'stopWatering':
			commandType = 'STOP_UNTIL_NEXT_TASK';
			controlResourceType = 'VALVE_CONTROL';
			break;
		case 'turnOn':
			commandType = 'START';
			controlResourceType = 'POWER_SOCKET_CONTROL';
			break;
		case 'turnOff':
			commandType = 'STOP';
			controlResourceType = 'POWER_SOCKET_CONTROL';
			break;
		default:
			throw new Error(`Nieznana akcja: ${action}`);
	}

	const payload = {
		data: { 
			type: controlResourceType, 
			id: uuidv4(), 
			attributes: { command: commandType, ...commandData }
		},
	};

	try {
		await axios.put(apiUrl, payload, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Authorization-Provider': 'husqvarna',
				'X-Api-Key': GARDENA_API_KEY,
				'Content-Type': 'application/vnd.api+json',
			},
		});
		console.log(`Komenda ${action} dla ${serviceIdToUse} wykonana pomyślnie.`);
	} catch (error) {
		console.error(
			`Błąd podczas wykonywania komendy dla ${serviceIdToUse}:`,
			error.response ? error.response.data : error.message
		);
		throw error;
	}
}

const scheduledJobs = new Map();
async function loadSchedulesAndRun() {
	try {
        for (const job of scheduledJobs.values()) {
			job.cancel();
		}
		scheduledJobs.clear();

		const data = await fs.readFile(DB_PATH, 'utf8');
		const db = JSON.parse(data);
		if (db && db.schedules) {
			console.log(`[INFO] Znaleziono ${db.schedules.length} harmonogramów w bazie danych.`);
			db.schedules.forEach(job => {
				if (job.enabled) {
                    const scheduledJob = schedule.scheduleJob(job.cron, () => sendControlCommand(job));
				    scheduledJobs.set(job.id, scheduledJob);
                }
			});
            console.log(`[INFO] Załadowano i uruchomiono ${scheduledJobs.size} włączonych zadań.`);
		}
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log('Plik db.json nie istnieje, tworzenie nowego.');
			await fs.writeFile(DB_PATH, JSON.stringify({ schedules: [] }, null, 2));
		} else {
			console.error('Nie można załadować harmonogramów z bazy danych:', error);
		}
	}
}

// --- Definicja wszystkich ścieżek API ---

app.get('/api/gardena/devices', async (req, res) => {
	if (devicesCache && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
		return res.json(devicesCache);
	}
	try {
		const token = await getAccessToken();
		const headers = {
			Authorization: `Bearer ${token}`,
			'Authorization-Provider': 'husqvarna',
			'X-Api-Key': GARDENA_API_KEY,
		};
		const locationsResponse = await axios.get(`${GARDENA_SMART_API_BASE_URL}/locations`, { headers });
		if (!locationsResponse.data?.data?.length)
			return res.status(404).json({ message: 'Nie znaleziono lokalizacji Gardena.' });
		const locationId = locationsResponse.data.data[0].id;
		const devicesResponse = await axios.get(`${GARDENA_SMART_API_BASE_URL}/locations/${locationId}`, { headers });
		devicesCache = devicesResponse.data;
		cacheTimestamp = Date.now();
		res.json(devicesResponse.data);
	} catch (error) {
		console.error('!!! Wystąpił krytyczny błąd w /api/gardena/devices:', error.response?.data || error.message);
		res.status(500).json({ error: 'Nie udało się pobrać urządzeń Gardena.' });
	}
});

app.get('/api/weather', async (req, res) => {
	const {lat, lon} = req.query; // Przyjęcie z frontendu danych o szerokości i długości geograficznej
	
	if (!lat || !lon) {
		return res.status(400).json({ error: 'Brak danych o lokalizacji.'});
	}
	if (!OPENWEATHERMAP_API_KEY) {
		console.error('[Weather API] Brak Klucza API OPENWEATHERMAP w .env!');
		return res.status(500).json({ error: 'Klucz API pogodowego nie jest skonfigurowany'})
	}

	try {
		const weatherResponse = await axios.get(OPENWEATHERMAP_BASE_URL, {
			params: {
				lat: lat,
				lon: lon,
				appid: OPENWEATHERMAP_API_KEY,
				units: 'metric',
				lang: 'pl',
			}
		});
		console.log(`[Weather API] Pogoda dla ${lat}, ${lon} pobrana pomyślnie`);
		res.json(weatherResponse.data);
		} catch (error) {
			console.error('[Weather API] Błąd pobierania danych pogodowych:', error.response?.data || error.message);
			res.status(500).json({ error: `Nie udało się pobrać danych pogodowych: ${error.response?.data?.message || error.message}` });
}
});


app.post('/api/gardena/devices/:deviceId/control', async (req, res) => {
	try {
		const commandPayload = { ...req.body, deviceId: req.params.deviceId };
		await sendControlCommand(commandPayload);
		res.json({ message: 'Komenda wysłana pomyślnie!' });
	} catch (error) {
		if (error.response && error.response.data) {
			console.error('Błąd z API Gardena:', error.response.data);
			const gardenaError = error.response.data.errors?.[0]?.title || JSON.stringify(error.response.data);
			const statusCode = error.response.status >= 400 && error.response.status < 500 ? error.response.status : 500;
			return res.status(statusCode).json({ error: `Błąd API Gardena: ${gardenaError}` });
		}
		console.error('Błąd ogólny serwera:', error);
		res.status(500).json({ error: `Wewnętrzny błąd serwera: ${error.message}` });
	}
});

app.patch('/api/gardena/devices/:serviceId/name', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Nazwa jest wymagana.' });
        }

        await updateDeviceName(serviceId, name.trim());
        res.json({ message: 'Nazwa urządzenia została pomyślnie zaktualizowana.' });
    } catch (error) {
        res.status(500).json({ error: `Nie udało się zmienić nazwy: ${error.message}`});
    }
});


app.get('/api/schedules', async (req, res) => {
	try {
		const data = await fs.readFile(DB_PATH, 'utf8');
		res.json(JSON.parse(data).schedules || []);
	} catch (error) {
		if (error.code === 'ENOENT') return res.json([]);
		res.status(500).json({ error: 'Nie można odczytać harmonogramów.' });
	}
});

app.get('/api/schedules/next/:deviceId', async (req, res) => {
	const { deviceId } = req.params;
	try {
		const data = await fs.readFile(DB_PATH, 'utf8');
		const db = JSON.parse(data);
		const deviceSchedules = db.schedules.filter(job => (job.deviceId === deviceId || job.valveServiceId === deviceId) && job.enabled);
		if (deviceSchedules.length === 0) {
			return res.json({ nextInvocation: null });
		}
		let nextInvocation = null;
		deviceSchedules.forEach(job => {
			try {
				const interval = parseExpression(job.cron);
				const nextDate = interval.next().toDate();
				if (!nextInvocation || nextDate < nextInvocation) {
					nextInvocation = nextDate;
				}
			} catch (err) {
				console.error(`Błąd parsowania cron "${job.cron}" dla zadania ${job.id}:`, err);
			}
		});
		res.json({ nextInvocation });
	} catch (error) {
		if (error.code === 'ENOENT') return res.json({ nextInvocation: null });
		res.status(500).json({ error: 'Nie udało się pobrać informacji o harmonogramie.' });
	}
});

app.post('/api/schedules', async (req, res) => {
	const newJob = { ...req.body, id: uuidv4() };
	try {
		const data = await fs.readFile(DB_PATH, 'utf8');
		const db = JSON.parse(data);
		db.schedules.push(newJob);
		await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
		await loadSchedulesAndRun();
		res.status(201).json(newJob);
	} catch (error) {
		res.status(500).json({ error: 'Nie można zapisać harmonogramu.' });
	}
});

app.patch('/api/schedules/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Nieprawidłowy status "enabled". Oczekiwano wartości boolean.' });
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        const jobIndex = db.schedules.findIndex(job => job.id === id);

        if (jobIndex === -1) {
            return res.status(404).json({ error: 'Nie znaleziono harmonogramu.' });
        }

        db.schedules[jobIndex].enabled = enabled;
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        
        await loadSchedulesAndRun();

        res.status(200).json(db.schedules[jobIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Nie można zaktualizować harmonogramu.' });
    }
});

app.patch('/api/schedules/all/disable', async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        db.schedules.forEach(job => job.enabled = false);
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        await loadSchedulesAndRun();
        res.status(200).json({ message: 'Wszystkie harmonogramy zostały wstrzymane.' });
    } catch (error) {
        res.status(500).json({ error: 'Nie udało się wstrzymać harmonogramów.' });
    }
});

app.patch('/api/schedules/device/:deviceId/disable', async (req, res) => {
    const { deviceId } = req.params;
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        db.schedules.forEach(job => {
            if (job.deviceId === deviceId) {
                job.enabled = false;
            }
        });
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        await loadSchedulesAndRun();
        res.status(200).json({ message: `Harmonogramy dla urządzenia ${deviceId} zostały wstrzymane.` });
    } catch (error) {
        res.status(500).json({ error: 'Nie udało się wstrzymać harmonogramów dla urządzenia.' });
    }
});

// NOWE ENDPOINTY: Do masowego wznawiania harmonogramów
app.patch('/api/schedules/all/enable', async (req, res) => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        db.schedules.forEach(job => job.enabled = true);
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        await loadSchedulesAndRun();
        res.status(200).json({ message: 'Wszystkie harmonogramy zostały wznowione.' });
    } catch (error) {
        res.status(500).json({ error: 'Nie udało się wznowić harmonogramów.' });
    }
});

app.patch('/api/schedules/device/:deviceId/enable', async (req, res) => {
    const { deviceId } = req.params;
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        db.schedules.forEach(job => {
            if (job.deviceId === deviceId) {
                job.enabled = true;
            }
        });
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        await loadSchedulesAndRun();
        res.status(200).json({ message: `Harmonogramy dla urządzenia ${deviceId} zostały wznowione.` });
    } catch (error) {
        res.status(500).json({ error: 'Nie udało się wznowić harmonogramów dla urządzenia.' });
    }
});


app.delete('/api/schedules/all', async (req, res) => {
	try {
		for (const job of scheduledJobs.values()) {
			job.cancel();
		}
		scheduledJobs.clear();
		await fs.writeFile(DB_PATH, JSON.stringify({ schedules: [] }, null, 2));
		res.status(200).json({ message: 'Wszystkie harmonogramy zostały pomyślnie usunięte.' });
	} catch (error) {
		res.status(500).json({ error: 'Nie udało się usunąć wszystkich harmonogramów.' });
	}
});

app.delete('/api/schedules/device/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        const schedulesToKeep = db.schedules.filter(job => job.deviceId !== deviceId);
        db.schedules = schedulesToKeep;
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        await loadSchedulesAndRun();
		res.status(200).json({ message: `Harmonogramy dla urządzenia ${deviceId} zostały usunięte.` });
    } catch (error) {
        res.status(500).json({ error: 'Nie można usunąć harmonogramów dla urządzenia.' });
    }
});

app.delete('/api/schedules/:id', async (req, res) => {
	const { id } = req.params;
	try {
		const data = await fs.readFile(DB_PATH, 'utf8');
		const db = JSON.parse(data);
		db.schedules = db.schedules.filter(job => job.id !== id);
		await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
		
        await loadSchedulesAndRun();
		res.status(200).json({ message: 'Harmonogram usunięty.' });
	} catch (error) {
		res.status(500).json({ error: 'Nie można usunąć harmonogramu.' });
	}
});

// --- Ścieżka "catch-all" ---
app.get('*', (req, res) => {
	res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// --- Uruchomienie serwera HTTP i dołączenie serwera WebSocket ---
const server = app.listen(PORT, () => {
	console.log(`Serwer aplikacji i API działa na porcie ${PORT}`);
	loadSchedulesAndRun();
	startGardenaLiveStream();
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
	console.log('[WSS] Nowy klient (przeglądarka) połączony.');
	ws.on('close', () => console.log('[WSS] Klient (przeglądarka) rozłączony.'));
	ws.on('error', console.error);
});

function broadcast(data) {
	const jsonData = JSON.stringify(data);
	wss.clients.forEach(client => {
		if (client.readyState === client.OPEN) {
			client.send(jsonData);
		}
	});
}

// --- Kompletna logika połączenia z Gardena Realtime API ---
async function startGardenaLiveStream() {
	console.log('[Gardena WS] Próba nawiązania połączenia z API czasu rzeczywistego...');
	try {
		const token = await getAccessToken();
		const headers = {
			'Content-Type': 'application/vnd.api+json',
			'x-api-key': GARDENA_API_KEY,
			Authorization: 'Bearer ' + token,
		};

		const locationsResponse = await axios.get(`${GARDENA_SMART_API_BASE_URL}/locations`, { headers });
		if (!locationsResponse.data?.data?.length) {
			console.error('[Gardena WS] Nie znaleziono lokalizacji. Nie można uruchomić WebSocket.');
			return;
		}
		const locationId = locationsResponse.data.data[0].id;
		console.log(`[Gardena WS] Uzyskano Location ID: ${locationId}`);

		const wsPayload = {
			data: {
				type: 'WEBSOCKET',
				id: uuidv4(),
				attributes: { locationId },
			},
		};
		const wsUrlResponse = await axios.post(`${GARDENA_SMART_API_BASE_URL}/websocket`, wsPayload, { headers });
		const websocketUrl = wsUrlResponse.data.data.attributes.url;
		console.log('[Gardena WS] Otrzymano tymczasowy adres WebSocket. Łączenie...');

		const gardenaSocket = new WebSocket(websocketUrl);

		gardenaSocket.on('open', () => {
			console.log('[Gardena WS] Połączono z Gardena Realtime API! Nasłuchiwanie na zmiany...');
			setInterval(() => {
				if (gardenaSocket.readyState === WebSocket.OPEN) {
					gardenaSocket.ping();
				}
			}, 150000); // Ping co 150 sekund
		});

		gardenaSocket.on('message', data => {
			const message = JSON.parse(data.toString());
			console.log('[Gardena WS] Otrzymano wiadomość:', message);
			broadcast(message);
		});

		gardenaSocket.on('close', (code, reason) => {
			console.log(
				`[Gardena WS] Połączenie z Gardena zostało zamknięte. Kod: ${code}. Próba ponownego połączenia za 15 sekund...`
			);
			setTimeout(startGardenaLiveStream, 15000);
		});

		gardenaSocket.on('error', error => {
			console.error('[Gardena WS] Wystąpił błąd połączenia:', error);
		});
	} catch (error) {
		console.error(
			'[Gardena WS] Nie udało się zainicjować połączenia WebSocket:',
			error.response?.data || error.message
		);
		console.log('[Gardena WS] Ponowna próba za 15 minut...');
		setTimeout(startGardenaLiveStream, 900000);
	}
}