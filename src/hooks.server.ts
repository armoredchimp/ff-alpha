import axios from "axios";
import type { Handle } from "@sveltejs/kit";

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const API_TOKEN = import.meta.env.VITE_SPORTSMONK_KEY

export const handle: Handle = async ({ event, resolve }) => {
    if (event.url.pathname.startsWith('/api')){
        try {
            const endpoint = event.url.pathname.replace('/api','')
            const queryParams = new URLSearchParams(event.url.searchParams)

            queryParams.set('api_token', API_TOKEN)

            console.log('Proxied URL:', `${BASE_URL}${endpoint}?${queryParams.toString()}`);

            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                params: queryParams
            })

            return new Response(JSON.stringify(response.data), {
                headers: {
                    'Content-Type': 'application/json',
                }
            })
        } catch(err){
            console.error('Error fetching data: ', err)

            return new Response(JSON.stringify({error: err.message}), {
                status: err.response?.status || 500,
                headers: {
                    'Content-Type': 'application/json',
                }
            })
        }
    }

    return resolve(event)
}