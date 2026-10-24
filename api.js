import axios from 'axios';
const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export const api = axios.create({ baseURL: `${baseURL}/api`, headers: { 'Content-Type': 'application/json' } });
