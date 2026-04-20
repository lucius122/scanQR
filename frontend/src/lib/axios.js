import axios from 'axios'

/*
 * Axios instance untuk FORGE Gym OS
 *
 * baseURL     : kosong karena Vite proxy meneruskan /api/* ke Laravel
 * withCredentials : WAJIB true agar browser menyertakan cookie Sanctum
 *                   pada setiap request (SPA authentication)
 * X-Requested-With: memberi tahu Laravel bahwa ini AJAX request,
 *                   bukan navigasi browser biasa
 */
const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
})

export default api
