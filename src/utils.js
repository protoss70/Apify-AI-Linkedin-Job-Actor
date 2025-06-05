import { ApifyClient } from 'apify-client';
import { validateLocationMatch } from './llm.js';

const APIFY_TOKEN = process.env.APIFY_TOKEN;

const MAX_GEO_ID_ATTEMPTS = 3;

const jobTypes = {
  "full_time": "F",
  "part_time": "P",
  "contract": "C",
  "internship": "I"
};

const workplaceTypes = {
  "remote": 1,
  "on-site": 2,
  "hybrid": 3
};

/**
 * Fetches LinkedIn job search HTML and extracts the geoId and resolvedLocation.
 */
export async function extractGeoId(workLocation) {
  try {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=&location=${encodeURIComponent(workLocation)}`;
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await response.text();

    const geoIdMatch = html.match(/<input name="geoId" value="(\d+)" type="hidden">/);
    const geoId = geoIdMatch ? geoIdMatch[1] : null;
    if (!geoId) return false;

    const validationUrl = `https://www.linkedin.com/jobs/search/?geoId=${geoId}&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true`;
    const validationResponse = await fetch(validationUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const validationHtml = await validationResponse.text();

    const locationMatch = validationHtml.match(/<div class="search-bar__full-placeholder[^"]*">\s*<!---->\s*([^<]+?)\s*<!---->/);
    const resolvedLocation = locationMatch ? locationMatch[1].trim() : null;

    if (!resolvedLocation) return false;

    return { geoId, resolvedLocation };
  } catch (error) {
    console.error("extractGeoId failed:", error);
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
        console.log("resolving: ", "\n", workLocation, "\n", currentLocation, "\n", resolvedLocation);
        return geoId;
      } else {
        console.log("Geo Id mismatch: ", workLocation, resolvedLocation);
      }

      console.log(`Attempt ${attempt + 1}: No match. Trying alternative: "${alternative}"`);
      currentLocation = alternative;
      attempt++;
    }

    return false;
  } catch (error) {
    console.error("geoLocationExtractor failed:", error);
    return false;
  }
}

/**
 * Builds multiple LinkedIn job search URLs from filters and keyword list.
 */
export function linkedinSearchQueryBuilder({ geoId, jobType, workplaceType, keywords }) {
  const jt = jobTypes[jobType];
  const wt = workplaceTypes[workplaceType];

  if (!jt || !wt || !geoId || !Array.isArray(keywords)) {
    throw new Error("Invalid parameters passed to linkedinSearchQueryBuilder");
  }

  return keywords.map(keyword => {
    const encodedKeyword = encodeURIComponent(keyword);
    return `https://www.linkedin.com/jobs/search/?keywords=${encodedKeyword}&f_JT=${jt}&f_WT=${wt}&geoId=${geoId}&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true&sortBy=R`;
  });
}

export async function runLinkedinJobScrapeActor({ count, scrapeCompany, urls }) {
    // Client initialization with the API token
    const client = new ApifyClient({ token: APIFY_TOKEN });

    // Actor setup
    const actorClient = client.actor('curious_coder/linkedin-jobs-scraper');
    console.log("Scraping Linkedin for job posts")
    const input = { count, scrapeCompany, urls };

    // Run the Actor
    const run = await actorClient.call(input);
    
    // Retrieve scraping results
    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: 100 });
    console.log("Scraper finished.");

    return items
}
