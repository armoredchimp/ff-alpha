import axios from "axios";

export async function getPlayerPicture(id) {
    try {
        const lad = await axios.get(`/api/players/${id}`);
        if(lad){
            return lad.data.data.image_path;
        }
    } catch(err){
        console.error(err)
    }
}