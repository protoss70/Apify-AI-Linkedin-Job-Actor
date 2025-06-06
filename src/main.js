import 'dotenv/config.js';

import { Actor } from 'apify';

import log from '@apify/log';

import { analyseCV, analyseJobPost, compareCandidateToJob } from './llm.js';
import { geoLocationExtractor, linkedinSearchQueryBuilder, runLinkedinJobScrapeActor } from './utils.js';

await Actor.init();

// Resulting job posts will be pushed here
const results = [];

const input = await Actor.getInput();
log.info('📥 Received input:');
log.debug(input);

const { cvContent, workEnv, workType, workLocation, prompt, targetNumResults } = input;

// Input validation for targetNumResults
if (typeof targetNumResults !== 'number' || targetNumResults < 1 || targetNumResults > 20) {
    await Actor.fail('Invalid input: "targetNumResults" must be a number between 1 and 20.');
}

// Step 1: Try to find the geoId of LinkedIn for location matching.
const geoId = await geoLocationExtractor(workLocation);
log.info(`🌐 geoId: ${geoId}`);
if (!geoId) {
    await Actor.fail('Failed to find the correct geoId!');
}

// Step 2: Analyse user's CV and create an overview.
const outputAnalyzeCv = await analyseCV(cvContent, prompt);
if (!outputAnalyzeCv) {
    await Actor.fail('Failed while fetching OpenAI.');
}

const { overview, careerPath, education, languages, possibleRoles } = outputAnalyzeCv;

log.info(
    `📄 Candidate Analysis:
---------------------
Overview: ${overview}

Career Path: ${careerPath}

Education: ${education}

Languages: ${languages}

Possible Roles: ${possibleRoles.join(', ')}

`,
);

// Step 3: Scrape job posts on LinkedIn
log.info(`🔍 LinkedIn Query Builder Params:
  • geoId: ${geoId}
  • workType: ${workType}
  • workEnv: ${workEnv}
  • possibleRoles: ${possibleRoles.join(', ')}
`);
const urls = linkedinSearchQueryBuilder({
    geoId,
    jobType: workType,
    workplaceType: workEnv,
    keywords: possibleRoles,
});

log.info('🔗 LinkedIn Search URLs:');
log.debug(urls);

const jobPosts = await runLinkedinJobScrapeActor({ count: 100, scrapeCompany: true, urls: [urls[0]] });

if (!jobPosts || jobPosts.length === 0) {
    await Actor.fail('Failed to scrape job posts on LinkedIn');
}

log.info('🔎 Job post analysis started.');
for (const job of jobPosts) {
    const {
        jobOverview,
        requirements,
        careerPath: jobCareerPath,
        companyOverview,
    } = await analyseJobPost(job.descriptionText, job.companyDescription);

    const { jobRequirementsMatch, careerPathMatch, experienceLevelMatch, locationMatch, overallMatch } =
        await compareCandidateToJob({
            candidateOverview: overview,
            candidateEducation: education,
            candidateLanguages: languages,
            candidateCareerPath: careerPath,
            candidateLocation: workLocation,
            jobOverview,
            jobRequirement: requirements,
            jobCareerPath,
            jobLocation: job.location,
            jobSeniorityLevel: job.seniorityLevel,
            jobCompanyOverview: companyOverview,
        });

    if (overallMatch) {
        log.info(
            `📝 Candidate vs Job Match Result
-----------------------------------------
📌 Job Requirements Match:
${jobRequirementsMatch}

📈 Career Path Match:
${careerPathMatch}

🎯 Experience Level Match:
${experienceLevelMatch}

🌍 Location Match:
${locationMatch}

✅ Overall Match:
YES

Total Matches: ${results.length + 1}
-----------------------------------------`,
        );

        results.push({
            jobPost: job,
            careerPathMatch,
            locationMatch,
            requirementsMatch: jobRequirementsMatch,
            experienceLevelMatch,
        });
    } else {
        log.warning('❌ Job post with bad match skipped');
    }

    if (results.length >= targetNumResults) break;
}

await Actor.pushData({
    results,
    workLocation,
    workType,
    workEnv,
});

await Actor.exit();
