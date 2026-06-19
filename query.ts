import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://fuxlhuepfsumbrucqagk.supabase.co', 'sb_publishable_0yqXhhF9YuRXwSInuoqw5Q_dZI6lmlx');

async function run() {
    const { error } = await supabase.from('user_game_data').insert({ game_id: '7bb15041-7cb9-44cd-aed0-c7549ae19803', user_id: '5a7e6466-1e28-4a98-bdd9-6abeaf14f156', currency: 0, updated_at: new Date().toISOString() });
    console.log(error);
}

run();
