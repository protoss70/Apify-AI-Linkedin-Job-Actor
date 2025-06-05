import { Actor } from 'apify';
import 'dotenv/config';

import { analyseCV, analyseJobPost, compareCandidateToJob } from './llm.js';
import { geoLocationExtractor, linkedinSearchQueryBuilder, runLinkedinJobScrapeActor } from './utils.js';

await Actor.init();

// Resulting job posts will be pushed here
const results = [];


const input = await Actor.getInput();
console.log('Received input: ');
console.dir(input, { depth: null });

const { cv_content, work_env, work_type, work_location, prompt, target_num_results } = input;

// Input validation for target_num_results
if (typeof target_num_results !== 'number' || target_num_results < 1 || target_num_results > 20) {
    await Actor.fail('Invalid input: "target_num_results" must be a number between 1 and 20.');
}

// Step 1: Try to find the geoId of LinkedIn for location matching.
const geoId = await geoLocationExtractor(work_location);
console.log(geoId);
if (!geoId) {
    await Actor.fail('Failed to find the correct geoId!');
}

// Step 2: Analyse user's CV and create an overview.
const output_analyze_cv = await analyseCV(cv_content, prompt);
if (!output_analyze_cv) {
    await Actor.fail("Failed while fetching OpenAI.");
}

const { overview, career_path, education, languages, possible_roles } = output_analyze_cv;

console.log(
  `Candidate Analysis:
---------------------
Overview: ${overview}

Career Path: ${career_path}

Education: ${education}

Languages: ${languages}

Possible Roles: ${possible_roles.join(', ')}

`
);

// Step 3: Scrape job posts on LinkedIn
console.log(`🔍 LinkedIn Query Builder Params:
  • geoId: ${geoId}
  • work_type: ${work_type}
  • work_env: ${work_env}
  • possible_roles: ${possible_roles.join(', ')}
`);
const urls = linkedinSearchQueryBuilder({
    geoId,
    jobType: work_type,
    workplaceType: work_env,
    keywords: possible_roles,
});

console.log("Linkedin Search URLs: ", urls);
const jobPosts = await runLinkedinJobScrapeActor({"count": 100, scrapeCompany: true, urls: [urls[0]]});

if (!jobPosts || jobPosts.length === 0){
    await Actor.fail("Failed to scrape job posts on linkedin");
}

console.log("🔎 Job post analysis started.")
for (const job of jobPosts) {
    const {
        job_overview,
        requirements,
        career_path: job_career_path,
        company_overview
    } = await analyseJobPost(job.descriptionText, job.companyDescription);

    const {
        job_requirements_match,
        career_path_match,
        experience_level_match,
        location_match,
        overall_match
    } = await compareCandidateToJob({
        candidate_overview: overview,
        candidate_education: education,
        candidate_languages: languages,
        candidate_career_path: career_path,
        candidate_location: work_location,
        job_overview,
        job_requirement: requirements,
        job_career_path: job_career_path,
        job_location: job.location,
        job_seniority_level: job.seniorityLevel,
        job_company_overview: company_overview,
    });

    if (overall_match) {
        console.log(
            `📝 Candidate vs Job Match Result
            -----------------------------------------
            📌 Job Requirements Match:
            ${job_requirements_match}

            📈 Career Path Match:
            ${career_path_match}

            🎯 Experience Level Match:
            ${experience_level_match}

            🌍 Location Match:
            ${location_match}

            ✅ Overall Match:
            ${overall_match ? "YES" : "NO"}

            Total Matches: ${results.length + 1}
            -----------------------------------------`
        );

        results.push({
        job_post: job,
        career_path_match,
        location_match,
        requirements_match: job_requirements_match,
        experience_level_match,
        });
    }else{
        console.log("❌ Job post with bad match skipped")
    }

    if (results.length > target_num_results) break;
}

await Actor.setValue('OUTPUT', results);
await Actor.exit();
