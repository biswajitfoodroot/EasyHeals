import axios from 'axios';

const API = 'http://localhost:3000/v1';

async function test() {
    try {
        console.log('Logging in...');
        const login = await axios.post(`${API}/auth/login`, {
            email: 'biswajit_saha@easyheals.com',
            password: 'Admin@123'
        });
        const token = login.data.token;
        console.log('Token received.');

        console.log('Fetching users...');
        const users = await axios.get(`${API}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Users found:', users.data.length);

        console.log('Fetching agents...');
        const agents = await axios.get(`${API}/agents`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Agents found:', agents.data.data.length);

    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();
