import { verifyAccessToken } from "$lib/server/jwt";
import { get_user_profile } from "$lib/server/supabase";
import { json, type RequestHandler } from "@sveltejs/kit";


export const POST: RequestHandler = async ({ request }) => {
    const auth_header = request.headers.get('Authorization');
    const access_token = auth_header?.replace("Bearer ",'');

    if(!access_token) {
        return json({ message: "Unauthorized Action - DUND23" }, {status: 401 });
    }

    try {

        const payload = verifyAccessToken(access_token);
        const user_id = payload.sub;

        const user = await get_user_profile(user_id);
        if(!user){
            return json({ message: "Invalid DUND24"}, {status: 401})
        }
        
        return json({ user: user }, { status: 200 });
        
    } catch( error: any ){
        return json({ message: error || "Server Error - DUND25" }, {status: 500 });
    }

}