import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { prompts } from "./prompts.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sends a system + user prompt to OpenAI and returns parsed structured output.
 */
export async function askOpenAI({ model, systemPrompt, userPrompt, output_structure }) {
  const response = await openai.responses.parse({
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: {
      format: zodTextFormat(output_structure, "structured_output"),
    },
  });

  return response.output_parsed;
}

/**
 * Analyzes a user's CV using gpt-4o and returns structured output.
 */
export async function analyseCV(cvContent, userPrompt) {
  try {
    const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.cv_analysis;

    return await askOpenAI({
      model: "gpt-4o",
      systemPrompt,
      userPrompt: buildPrompt(cvContent, userPrompt),
      output_structure: outputSchema,
    });
  } catch (error) {
    console.error("analyseCV failed:", error);
    return false;
  }
}

/**
 * Validates if resolvedLocation matches workLocation using gpt-4o-mini.
 */
export async function validateLocationMatch(resolvedLocation, workLocation) {
  try {
    const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.location_match_validation;

    return await askOpenAI({
      model: "gpt-4o-mini",
      systemPrompt,
      userPrompt: buildPrompt(resolvedLocation, workLocation),
      output_structure: outputSchema,
    });
  } catch (error) {
    console.error("validateLocationMatch failed:", error);
    return false;
  }
}

/**
 * Analyzes a job post using gpt-4o-mini and returns structured output.
 */
export async function analyseJobPost(jobPostText, companyInfo) {
  try {
    const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.job_post_analysis;

    return await askOpenAI({
      model: "gpt-4o-mini",
      systemPrompt,
      userPrompt: buildPrompt(jobPostText, companyInfo),
      output_structure: outputSchema,
    });
  } catch (error) {
    console.error("analyseJobPost failed:", error);
    return false;
  }
}

/**
 * Compares a candidate with a job post using gpt-4o and returns structured output.
 */
export async function compareCandidateToJob({
  candidate_overview,
  candidate_education,
  candidate_languages,
  candidate_career_path,
  candidate_location,
  job_overview,
  job_requirement,
  job_career_path,
  job_location,
  job_seniority_level,
  job_company_overview,
}) {
  try {
    const { systemPrompt, userPrompt: buildPrompt, outputSchema } = prompts.job_candidate_match_analysis;

    return await askOpenAI({
      model: "gpt-4o",
      systemPrompt,
      userPrompt: buildPrompt(
        candidate_overview,
        candidate_education,
        candidate_languages,
        candidate_career_path,
        candidate_location,
        job_overview,
        job_requirement,
        job_career_path,
        job_location,
        job_seniority_level,
        job_company_overview
      ),
      output_structure: outputSchema,
    });
  } catch (error) {
    console.error("compareCandidateToJob failed:", error);
    return false;
  }
}


