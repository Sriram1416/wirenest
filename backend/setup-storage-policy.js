/**
 * setup-storage-policy.js - simplified version
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function setup() {
    console.log('Updating bucket to public...');
    const { error: bucketErr } = await supabaseAdmin.storage.updateBucket('product-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 10485760
    });
    if (bucketErr) console.error('Bucket update error:', bucketErr.message);
    else console.log('✅ Bucket updated');

    // Test anon upload
    console.log('\nTesting anon upload...');
    const testBuffer = Buffer.from('test');
    const testPath = `test/policy-test-${Date.now()}.txt`;
    const { error: testErr } = await anonClient.storage
        .from('product-images')
        .upload(testPath, testBuffer, { contentType: 'text/plain', upsert: true });

    if (testErr) {
        console.log('❌ Anon upload test failed:', testErr.message);
        console.log('\n👉 Please run this SQL in your Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/qcyrfudyumcfdbcorcrc/sql\n');
        console.log(`-- Paste and run this:
CREATE POLICY "allow_anon_insert" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "allow_anon_select" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'product-images');
`);
    } else {
        console.log('✅ Anon upload WORKS — direct browser uploads are enabled!');
        await supabaseAdmin.storage.from('product-images').remove([testPath]);
    }
}
setup().catch(console.error);
