/**
 * Playbook loader
 */

import type { Playbook } from './types.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const JURISDICTIONS = ['RW', 'MT', 'CA'] as const;
export const ENGAGEMENT_TYPES = ['accounting', 'audit', 'tax'] as const;

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadPlaybook(
    jurisdiction: typeof JURISDICTIONS[number],
    engagementType: typeof ENGAGEMENT_TYPES[number]
): Playbook {
    if (!JURISDICTIONS.includes(jurisdiction)) {
        throw new Error(`Invalid jurisdiction: ${jurisdiction}. Must be one of: ${JURISDICTIONS.join(', ')}`);
    }

    if (!ENGAGEMENT_TYPES.includes(engagementType)) {
        throw new Error(`Invalid engagement type: ${engagementType}. Must be one of: ${ENGAGEMENT_TYPES.join(', ')}`);
    }

    const playbookPath = join(__dirname, '..', 'playbooks', jurisdiction, `${engagementType}.json`);

    try {
        const content = readFileSync(playbookPath, 'utf-8');
        return JSON.parse(content) as Playbook;
    } catch (error) {
        throw new Error(`Failed to load playbook for ${jurisdiction}/${engagementType}: ${error}`);
    }
}
