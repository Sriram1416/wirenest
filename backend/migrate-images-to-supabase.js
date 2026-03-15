/**
 * migrate-images-to-supabase.js
 * 
 * Downloads all product images from Render's filesystem (while still accessible)
 * and re-uploads them to Supabase Storage, then updates the database URLs.
 * Run with: node migrate-images-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

const BUCKET = 'product-images';
const BACKEND_PROD = 'https://wirenest-backend.onrender.com';

async function downloadAndUpload(sourceUrl) {
    const ext = path.extname(sourceUrl.split('?')[0]) || '.jpg';
    const fileName = `products/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
        console.warn(`  ⚠️  Could not fetch ${sourceUrl} (${res.status}) — skipping`);
        return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType, upsert: false });

    if (error) {
        console.warn(`  ⚠️  Supabase upload failed: ${error.message}`);
        return null;
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
}

function needsMigration(url) {
    if (!url) return false;
    // Migrate Render disk URLs and localhost URLs — not Supabase or picsum
    return url.includes('onrender.com/uploads/') || url.includes('localhost');
}

async function migrateTable(tableName) {
    console.log(`\n📦 Migrating ${tableName}...`);
    const { data: rows, error } = await supabaseAdmin.from(tableName).select('id, name, images');
    if (error) return console.error('Fetch error:', error.message);

    for (const row of rows) {
        if (!row.images || row.images.length === 0) continue;

        let changed = false;
        const newImages = [];

        for (const imgUrl of row.images) {
            if (needsMigration(imgUrl)) {
                console.log(`  🔄 Migrating: ${imgUrl.split('/').pop()}`);
                const newUrl = await downloadAndUpload(imgUrl);
                if (newUrl) {
                    console.log(`  ✅ → ${newUrl}`);
                    newImages.push(newUrl);
                    changed = true;
                } else {
                    newImages.push(imgUrl); // keep original if failed
                }
                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 500));
            } else {
                newImages.push(imgUrl);
            }
        }

        if (changed) {
            const { error: updateError } = await supabaseAdmin
                .from(tableName)
                .update({ images: newImages })
                .eq('id', row.id);

            if (updateError) {
                console.error(`  ❌ DB update failed for "${row.name}":`, updateError.message);
            } else {
                console.log(`  💾 Updated DB for "${row.name}"`);
            }
        }
    }
}

async function main() {
    console.log('🚀 Starting image migration to Supabase Storage...');
    await migrateTable('normal_products');
    await migrateTable('customized_products');
    console.log('\n✅ Migration complete!');
}

main().catch(console.error);
