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
import session from 'express-session';
import bcrypt from 'bcryptjs';
import http from 'http';

const { parseExpression } = cronParser;

// --- Konfiguracja ścieżek ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// --- Serwowanie statycznego frontendu ---
const frontendDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(frontendDistPath));

// Middleware
// Konfiguracja CORS dla produkcji i deweloperki
const allowedOrigins = [
	'http://localhost:3000', // Dev jeśli zmienisz konfigurację protu w Vite wprowadz zmiany

	// --- Dodaj tutaj nowy, główny adres URL Twojego serwisu Render.com ---
	'https://gardena-smart-app.onrender.com',
];

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true,
	})
);

app.use(express.json());

//Konfiguracja sesji.
const sessionParser = session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
	},
});
app.use(sessionParser);

app.get('/healthz', (req, res) => {
	res.status(200).send('OK');
});

//Uproszczona "baza danych" użytkowników
const users = [{ id: '1', username: 'admin', passwordHash: await bcrypt.hash('admin123', 10) }];

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
			attributes: { command: commandType, ...commandData },
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
		throw error;
	}
}

//Middleware do sprawdzania uwierzytelnienia
const isAuthenticated = (req, res, next) => {
	if (req.session.userId) {
		return next();
	}

	res.status(401).json({ message: 'Brak autoryzacji. Proszę się zalogować.' });
};

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
			throw new Error(`Nie można załadować harmonogramów z bazy danych: ${error.message}`);
		}
	}
}

// Funkcja pomocnicza do aktualizacji harmonogramów
async function updateSchedules(updateLogic) {
	const data = await fs.readFile(DB_PATH, 'utf8');
	const db = JSON.parse(data);

	db.schedules = updateLogic(db.schedules || []);

	await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
	await loadSchedulesAndRun();
	return db.schedules;
}

// --- Definicja wszystkich ścieżek API ---
// Endpointy do autoryzacji
app.post('/api/login', async (req, res, next) => {
	try {
		const { username, password } = req.body;
		const user = users.find(u => u.username === username);

		if (!user) {
			return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
		}

		const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
		if (!isPasswordValid) {
			return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
		}

		req.session.userId = user.id;
		req.session.username = user.username;
		res.status(200).json({ message: 'Zalogowano pomyślnie!', username: user.username });
	} catch (error) {
		next(error);
	}
});

app.post('/api/logout', (req, res, next) => {
	req.session.destroy(err => {
		if (err) {
			return next(err);
		}
		res.status(200).json({ message: 'Wylogowano.' });
	});
});

app.get('/api/check-auth', (req, res) => {
	if (req.session.userId) {
		return res.status(200).json({ isAuthenticated: true, username: req.session.username });
	}
	res.status(401).json({ isAuthenticated: false });
});

// Chronione endpointy
app.get('/api/gardena/devices', isAuthenticated, async (req, res, next) => {
	try {
		if (devicesCache && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
			return res.json(devicesCache);
		}
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
		next(error);
	}
});

app.get('/api/weather', isAuthenticated, async (req, res, next) => {
	try {
		const { lat, lon } = req.query;
		if (!lat || !lon) {
			return res.status(400).json({ error: 'Brak danych o lokalizacji.' });
		}
		if (!OPENWEATHERMAP_API_KEY) {
			throw new Error('Klucz API pogodowego nie jest skonfigurowany');
		}
		const weatherResponse = await axios.get(OPENWEATHERMAP_BASE_URL, {
			params: { lat, lon, appid: OPENWEATHERMAP_API_KEY, units: 'metric', lang: 'pl' },
		});
		res.json(weatherResponse.data);
	} catch (error) {
		next(error);
	}
});

app.post('/api/gardena/devices/:deviceId/control', isAuthenticated, async (req, res, next) => {
	try {
		const commandPayload = { ...req.body, deviceId: req.params.deviceId };
		await sendControlCommand(commandPayload);
		res.json({ message: 'Komenda wysłana pomyślnie!' });
	} catch (error) {
		next(error);
	}
});

app.get('/api/schedules', isAuthenticated, async (req, res, next) => {
	try {
		const data = await fs.readFile(DB_PATH, 'utf8');
		res.json(JSON.parse(data).schedules || []);
	} catch (error) {
		if (error.code === 'ENOENT') return res.json([]);
		next(error);
	}
});

app.get('/api/schedules/next/:deviceId', isAuthenticated, async (req, res, next) => {
	try {
		const { deviceId } = req.params;
		const data = await fs.readFile(DB_PATH, 'utf8');
		const db = JSON.parse(data);
		const deviceSchedules = db.schedules.filter(
			job => (job.deviceId === deviceId || job.valveServiceId === deviceId) && job.enabled
		);
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
		next(error);
	}
});

app.post('/api/schedules', isAuthenticated, async (req, res, next) => {
	try {
		const newJob = { ...req.body, id: uuidv4() };
		await updateSchedules(schedules => [...schedules, newJob]);
		res.status(201).json(newJob);
	} catch (error) {
		next(error);
	}
});

app.patch('/api/schedules/:id/toggle', isAuthenticated, async (req, res, next) => {
	try {
		const { id } = req.params;
		const { enabled } = req.body;
		if (typeof enabled !== 'boolean') {
			return res.status(400).json({ error: 'Nieprawidłowy status "enabled". Oczekiwano wartości boolean.' });
		}
		let updatedJob = null;
		await updateSchedules(schedules => {
			const jobIndex = schedules.findIndex(job => job.id === id);
			if (jobIndex === -1) {
				const err = new Error('Nie znaleziono harmonogramu.');
				err.statusCode = 404;
				throw err;
			}
			schedules[jobIndex].enabled = enabled;
			updatedJob = schedules[jobIndex];
			return schedules;
		});
		res.status(200).json(updatedJob);
	} catch (error) {
		next(error);
	}
});

const setAllSchedulesEnabled = async (res, next, enabled, filterFn = () => true) => {
	try {
		await updateSchedules(schedules => {
			schedules.filter(filterFn).forEach(job => (job.enabled = enabled));
			return schedules;
		});
		const messageAction = enabled ? 'wznowione' : 'wstrzymane';
		res.status(200).json({ message: `Harmonogramy zostały ${messageAction}.` });
	} catch (error) {
		next(error);
	}
};

app.patch('/api/schedules/all/disable', isAuthenticated, (req, res, next) => setAllSchedulesEnabled(res, next, false));
app.patch('/api/schedules/all/enable', isAuthenticated, (req, res, next) => setAllSchedulesEnabled(res, next, true));

app.patch('/api/schedules/device/:deviceId/disable', isAuthenticated, (req, res, next) => {
	setAllSchedulesEnabled(res, next, false, job => job.deviceId === req.params.deviceId);
});
app.patch('/api/schedules/device/:deviceId/enable', isAuthenticated, (req, res, next) => {
	setAllSchedulesEnabled(res, next, true, job => job.deviceId === req.params.deviceId);
});

const deleteSchedules = async (res, next, filterFn) => {
	try {
		await updateSchedules(schedules => schedules.filter(filterFn));
		res.status(200).json({ message: 'Wybrane harmonogramy zostały usunięte.' });
	} catch (error) {
		next(error);
	}
};

app.delete('/api/schedules/all', isAuthenticated, (req, res, next) => deleteSchedules(res, next, () => false));
app.delete('/api/schedules/device/:deviceId', isAuthenticated, (req, res, next) =>
	deleteSchedules(res, next, job => job.deviceId !== req.params.deviceId)
);
app.delete('/api/schedules/:id', isAuthenticated, (req, res, next) =>
	deleteSchedules(res, next, job => job.id !== req.params.id)
);

// --- Centralny Error Handler ---
const errorHandler = (err, req, res, next) => {
	console.error(`[BŁĄD SERWERA] ${new Date().toISOString()}`);
	console.error('Ścieżka:', req.path);
	console.error('Wiadomość:', err.message);

	// Logujemy stos wywołań tylko w trybie deweloperskim
	if (process.env.NODE_ENV !== 'production') {
		console.error('Stos:', err.stack);
	}

	const statusCode = err.statusCode || 500;

	// Specjalna obsługa błędów z Axios (np. API Gardena)
	if (err.isAxiosError && err.response) {
		const axiosStatusCode = err.response.status;
		return res.status(axiosStatusCode).json({
			error: 'Wystąpił błąd podczas komunikacji z zewnętrznym serwisem. Spróbuj ponownie.',
		});
	}

	// Generyczna odpowiedź dla wszystkich innych błędów
	res.status(statusCode).json({
		error: 'Wystąpił nieoczekiwany błąd serwera. Skontaktuj się z administratorem.',
	});
};

app.use(errorHandler);

// --- Uruchomienie serwera HTTP i WebSocket ---
const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
	if (!req.session?.userId) {
		console.log('[WSS] Odrzucono połączenie WebSocket - brak autoryzacji.');
		ws.close(1008, 'Unauthorized');
		return;
	}
	console.log('[WSS] Nowy klient (użytkownik: ' + req.session.username + ') połączony.');
	ws.on('close', () => console.log('[WSS] Klient (przeglądarka) rozłączony.'));
	ws.on('error', console.error);
});

server.on('upgrade', function upgrade(request, socket, head) {
	console.log('[WSS] Przechwycono żądanie uaktualnienia protokołu.');

	sessionParser(request, {}, () => {
		if (!request.session?.userId) {
			console.log('[WSS] Odrzucono połączenie WebSocket - brak sesji HTTP.');
			socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
			socket.destroy();
			return;
		}
		console.log('[WSS] Zezwolono na połączenie WebSocket - sesja autoryzowana.');
		wss.handleUpgrade(request, socket, head, function done(ws) {
			wss.emit('connection', ws, request);
		});
	});
});

app.get('*', (req, res) => {
	res.sendFile(path.join(frontendDistPath, 'index.html'));
});

server.listen(PORT, () => {
	console.log(`Serwer aplikacji i API działa na porcie ${PORT}`);
	loadSchedulesAndRun();
	startGardenaLiveStream();
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
	try {
		console.log('[Gardena WS] Próba nawiązania połączenia z API czasu rzeczywistego...');
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
			data: { type: 'WEBSOCKET', id: uuidv4(), attributes: { locationId } },
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
			}, 150000);
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
