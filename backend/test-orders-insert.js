import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function test() {
    console.log("Testing Orders Table Insert...");
    const { data, error } = await supabase
        .from('orders')
        .insert([{
            total_amount: 100.0,
            status: 'pending',
            payment_screenshot_url: 'test_url'
        }])
        .select('*');

    if (error) {
        console.error("INSERT ERROR:", error);
    } else {
        console.log("INSERT SUCCESS:", data);
        // Clean up
        await supabase.from('orders').delete().eq('id', data[0].id);
    }
}

test();
