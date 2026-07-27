import type { PageLoad } from './$types';

// The page fetches the match bundle client-side (with the client cache) and
// the header reads from it too, so the load just surfaces the matchId param.
export const load: PageLoad = async ({ params }) => {
    return { matchId: params.matchId };
};