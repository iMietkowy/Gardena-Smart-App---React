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

// Middleware
// ================== OSTATECZNA POPRAWKA ==================
// Adres URL w 'origin' musi idealnie pasować do adresu Twojego frontendu z błędu w konsoli
app.use(cors({
    origin: 'https://gardena-smart-app.onrender.com', 
    credentials: true,
}));
// =======================================================
app.use(express.json());

//Konfiguracja sesji.
const sessionParser = session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: { 
        secure: true, 
        sameSite: 'none',
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

	db.schedules = updateLogic(db.schedules ||