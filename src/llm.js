import { Actor } from 'apify';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod.mjs';

import log from '@apify/log';

import { prompts } from './prompts.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sends a system + user prompt to OpenAI and returns parsed structured output.
 */
export async function askOpenAI({ model, systemPrompt, userPrompt, outputStructure }) {
    const response = await openai.responses.parse({
        model,
        input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        text: {
            format: zodTextFormat(outputStructure, 'structuredOutput'),
        },
    });

    if (model === 'gpt-4o') {
        await Actor.charge({ eventName: 'gpt-4o_call' });
    }

    return response.output_parsed;
}

/**
 * Analyzes a user's CV using gpt-4o and returns structured output.
 */
export async function analyseCV(cvContent, userPrompt) {
    try {
        const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.cvAnalysis;

        return await askOpenAI({
            model: 'gpt-4o',
            systemPrompt,
            userPrompt: buildPrompt(cvContent, userPrompt),
            outputStructure: outputSchema,
        });
    } catch (error) {
        log.error('❌ analyseCV failed:', error);
        return false;
    }
}

/**
 * Validates if resolvedLocation matches workLocation using gpt-4o-mini.
 */
export async function validateLocationMatch(resolvedLocation, workLocation) {
    try {
        const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.locationMatchValidation;

        const { match } = await askOpenAI({
            model: 'gpt-4o-mini',
            systemPrompt,
            userPrompt: buildPrompt(resolvedLocation, workLocation),
            outputStructure: outputSchema,
        });

        return match;
    } catch (error) {
        log.error('❌ validateLocationMatch failed:', error);
        return false;
    }
}


/**
 * Generates an alternative work location for LinkedIn search using gpt-4o-mini.
 * Avoids values already tried (in triedList).
 */
export async function getAlternativeLocation(currentLocation, triedList = []) {
    try {
        const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.generateAlternativeLocation;

        const { alternative } = await askOpenAI({
            model: 'gpt-4o-mini',
            systemPrompt,
            userPrompt: buildPrompt(currentLocation, triedList),
            outputStructure: outputSchema,
        });

        return alternative;
    } catch (error) {
        log.error('❌ getAlternativeLocation failed:', error);
        return null;
    }
}

/**
 * Analyzes a job post using gpt-4o-mini and returns structured output.
 */
export async function analyseJobPost(jobPostText, companyInfo) {
    try {
        const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.jobPostAnalysis;

        return await askOpenAI({
            model: 'gpt-4o-mini',
            systemPrompt,
            userPrompt: buildPrompt(jobPostText, companyInfo),
            outputStructure: outputSchema,
        });
    } catch (error) {
        log.error('❌ analyseJobPost failed:', error);
        return false;
    }
}

/**
 * Compares a candidate with a job post using gpt-4o and returns structured output.
 */
export async function compareCandidateToJob({
    candidateOverview,
    candidateEducation,
    candidateLanguages,
    candidateCareerPath,
    candidateLocation,
    jobOverview,
    jobRequirement,
    jobCareerPath,
    jobLocation,
    jobSeniorityLevel,
    jobCompanyOverview,
}) {
    try {
        const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.jobCandidateMatchAnalysis;

        return await askOpenAI({
            model: 'gpt-4o',
            systemPrompt,
            userPrompt: buildPrompt(
                candidateOverview,
                candidateEducation,
                candidateLanguages,
                candidateCareerPath,
                candidateLocation,
                jobOverview,
                jobRequirement,
                jobCareerPath,
                jobLocation,
                jobSeniorityLevel,
                jobCompanyOverview,
            ),
            outputStructure: outputSchema,
        });
    } catch (error) {
        log.error('❌ compareCandidateToJob failed:', error);
        return false;
    }
}
