#!/usr/bin/env tsx
/**
 * Quick test script to verify Google Drive access
 */

import { drive } from '@googleapis/drive';
import { JWT } from 'google-auth-library';
import * as dotenv from 'dotenv';

// Load env files
dotenv.config({ path: '.env.kb.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

async function testDriveAccess() {
    console.log('🔍 Testing Google Drive Access...\n');

    const email = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
    const keyJson = process.env.GDRIVE_SERVICE_ACCOUNT_KEY;
    const folderId = process.env.GDRIVE_FOLDER_ID;

    if (!email || !keyJson || !folderId) {
        console.error('❌ Missing environment variables:');
        if (!email) console.error('  - GDRIVE_SERVICE_ACCOUNT_EMAIL');
        if (!keyJson) console.error('  - GDRIVE_SERVICE_ACCOUNT_KEY');
        if (!folderId) console.error('  - GDRIVE_FOLDER_ID');
        process.exit(1);
    }

    console.log(`📧 Service Account: ${email}`);
    console.log(`📁 Folder ID: ${folderId}\n`);

    try {
        // Parse the key
        const credentials = JSON.parse(keyJson);

        // Create auth client
        const auth = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        // Create Drive client
        const driveClient = drive({ version: 'v3', auth: auth as any });

        console.log('🔐 Authenticating...');

        // Test: List files in folder
        const response = await driveClient.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            pageSize: 10,
            fields: 'files(id, name, mimeType, modifiedTime, size)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = response.data.files || [];

        console.log(`\n✅ SUCCESS! Found ${files.length} files in folder:\n`);

        if (files.length === 0) {
            console.log('  (Folder is empty - add some documents to ingest)');
        } else {
            files.forEach((file, i) => {
                const size = file.size ? `${Math.round(parseInt(file.size) / 1024)}KB` : 'N/A';
                console.log(`  ${i + 1}. ${file.name}`);
                console.log(`     Type: ${file.mimeType}`);
                console.log(`     Size: ${size}`);
                console.log(`     Modified: ${file.modifiedTime}`);
                console.log('');
            });
        }

        console.log('🎉 Google Drive connection is working!');
        console.log('\nNext steps:');
        console.log('  1. Deploy KB migration: supabase db push');
        console.log('  2. Run backfill: pnpm kb:backfill --org-id=<uuid>');

    } catch (error: any) {
        console.error('\n❌ ERROR:', error.message);

        if (error.message?.includes('access')) {
            console.error('\n💡 Tip: Make sure you shared the folder with:');
            console.error(`   ${email}`);
        }

        process.exit(1);
    }
}

testDriveAccess();
