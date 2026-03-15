import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

async function createBucket() {
    console.log('Creating product-images bucket...');
    const { data, error } = await supabaseAdmin.storage.createBucket('product-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Bucket already exists — good to go!');
        } else {
            console.error('❌ Failed to create bucket:', error.message);
        }
    } else {
        console.log('✅ Bucket created:', data);
    }
}

createBucket();
