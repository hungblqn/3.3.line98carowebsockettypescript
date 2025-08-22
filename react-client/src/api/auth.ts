import axios from 'axios';

const API_URL = 'http://localhost:3000/auth';

export async function login(username: string, password: string) {
  const res = await axios.post(`${API_URL}/login`, { username, password });
  return res.data; // { token: '...' }
}

export async function register(username: string, password: string) {
  const res = await axios.post(`${API_URL}/register`, { username, password });
  return res.data;
}

export async function updateEmail(payload: { token: string; email: string }) {
  const res = await axios.put(`${API_URL}/email`, payload);
  return res.data;
}

export async function updateUsername(payload: { token: string; username: string }) {
  const res = await axios.put(`${API_URL}/username`, payload);
  return res.data;
}