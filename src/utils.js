import { ApifyClient } from 'apify-client';
import { gotScraping } from 'got-scraping';

import log from '@apify/log';

import { validateLocationMatch } from './llm.js';

const { APIFY_TOKEN } = process.env;

const MAX_GEO_ID_ATTEMPTS = 5;

const JOB_TYPES = {
    fullTime: 'F',
    partTime: 'P',
    contract: 'C',
    internship: 'I',
};

const WORKPLACE_TYPES = {
    remote: 1,
    onSite: 2,
    hybrid: 3,
};

/**
 * Fetches LinkedIn job search HTML and extracts the geoId and resolvedLocation.
 */
export async function extractGeoId(workLocation) {
    try {
        const { PROXY_USERNAME, PROXY_PASSWORD } = process.env;

        const searchUrl = `https://www.linkedin.com/jobs/search?keywords=&location=${encodeURIComponent(workLocation)}`;

        const response = await gotScraping({
            url: searchUrl,
            proxyUrl: `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@proxy.apify.com:8000`,
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        const html = response.body;
        const geoIdMatch = html.match(/<input name="geoId" value="(\d+)" type="hidden">/);
        const geoId = geoIdMatch ? geoIdMatch[1] : null;
        if (!geoId) {
            log.warning('⚠️ No geoId found in initial search page.');
            return false;
        }

        const validationUrl = `https://www.linkedin.com/jobs/search/?geoId=${geoId}&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true`;

        const validationResponse = await gotScraping({
            url: validationUrl,
            proxyUrl: `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@proxy.apify.com:8000`,
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });
        const validationHtml = validationResponse.body;

        const locationMatch = validationHtml.match(
            /<div class="search-bar__full-placeholder[^"]*">\s*<!---->\s*([^<]+?)\s*<!---->/,
        );
        const resolvedLocation = locationMatch ? locationMatch[1].trim() : null;

        if (!resolvedLocation) {
            log.warning(`⚠️ geoId "${geoId}" resolved, but location label not found`);
            return false;
        }

        return { geoId, resolvedLocation };
    } catch (error) {
        log.error('❌ extractGeoId failed:', error);
        return false;
    }
}

/**
 * Repeatedly tries to find a valid LinkedIn geoId by refining workLocation using LLM validation.
 */
export async function geoLocationExtractor(workLocation) {
    try {
        let attempt = 0;
        let currentLocation = workLocation;

        while (attempt < MAX_GEO_ID_ATTEMPTS) {
            const extracted = await extractGeoId(currentLocation);
            if (!extracted) return false;

            const { geoId, resolvedLocation } = extracted;
            const { match, alternative } = await validateLocationMatch(resolvedLocation, currentLocation);

            if (match) {
                log.info('✅ Resolved geoId match:');
                log.debug(`Original: ${workLocation}, Current: ${currentLocation}, Resolved: ${resolvedLocation}`);
                return geoId;
            }

            log.warning(`⚠️ GeoId mismatch: ${workLocation} ≠ ${resolvedLocation}`);
            log.info(`🔁 Attempt ${attempt + 1}: Trying alternative → "${alternative}"`);
            currentLocation = alternative;
            attempt++;
        }

        return false;
    } catch (error) {
        log.error('❌ geoLocationExtractor failed:', error);
        return false;
    }
}

/**
 * Builds multiple LinkedIn job search URLs from filters and keyword list.
 */
export function linkedinSearchQueryBuilder({ geoId, jobType, workplaceType, keywords }) {
    const jobTypeSanitized = JOB_TYPES[jobType];
    const workplaceTypeSanitized = WORKPLACE_TYPES[workplaceType];

    if (!jobTypeSanitized || !workplaceTypeSanitized || !geoId || !Array.isArray(keywords)) {
        throw new Error('Invalid parameters passed to linkedinSearchQueryBuilder');
    }

    return keywords.map((keyword) => {
        const encodedKeyword = encodeURIComponent(keyword);
        return `https://www.linkedin.com/jobs/search/?keywords=${encodedKeyword}&f_JT=${jobTypeSanitized}&f_WT=${workplaceTypeSanitized}&geoId=${geoId}&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true&sortBy=R`;
    });
}

export async function runLinkedinJobScrapeActor({ count, scrapeCompany, urls }) {
    const client = new ApifyClient({ token: APIFY_TOKEN });

    const actorClient = client.actor('curious_coder/linkedin-jobs-scraper');
    log.info('🧠 Scraping LinkedIn for job posts...');
    const input = { count, scrapeCompany, urls };

    const run = await actorClient.call(input);

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 100 });
    log.info('✅ Scraper finished.');

    return items;
}
