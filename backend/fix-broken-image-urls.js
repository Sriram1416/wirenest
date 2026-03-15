/**
 * fix-broken-image-urls.js
 * 
 * For products whose primary image is a broken Render URL (404),
 * replace it with the first available fallback (picsum or other).
 * Run with: node fix-broken-image-urls.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

async function isAlive(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return res.ok;
    } catch { return false; }
}

function isBrokenRenderUrl(url) {
    return url && url.includes('onrender.com/uploads/');
}

async function fixTable(tableName) {
    console.log(`\n📦 Fixing broken images in ${tableName}...`);
    const { data: rows } = await supabaseAdmin.from(tableName).select('id, name, images');

    for (const row of rows) {
        if (!row.images || row.images.length === 0) continue;

        const broken = isBrokenRenderUrl(row.images[0]);
        if (!broken) continue;

        // Find first working fallback in the images array
        let fallback = null;
        for (const img of row.images) {
            if (!isBrokenRenderUrl(img) && img.startsWith('http')) {
                const alive = await isAlive(img);
                if (alive) { fallback = img; break; }
            }
        }

        // Replace broken primary image with fallback, or a generic placeholder
        const fixedImages = row.images.map((img, i) => {
            if (i === 0 && isBrokenRenderUrl(img)) {
                return fallback || `https://picsum.photos/400/400?random=${row.id}`;
            }
            return img;
        });

        const { error } = await supabaseAdmin
            .from(tableName)
            .update({ images: fixedImages })
            .eq('id', row.id);

        if (error) {
            console.error(`  ❌ Failed to update "${row.name}":`, error.message);
        } else {
            console.log(`  ✅ Fixed "${row.name}" → ${fixedImages[0]}`);
        }
    }
}

async function main() {
    console.log('🔧 Fixing broken Render image URLs...');
    await fixTable('normal_products');
    await fixTable('customized_products');
    console.log('\n✅ Done! Please re-upload real images via the Admin panel.');
}

main().catch(console.error);
